from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
import threading
from typing import Any, Dict

import joblib
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field

repo_root_path = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(repo_root_path / "MLPipeline" / "py"))

from mlpipeline.features_text import featurize_text
from mlpipeline.features_url import featurize_url


def repo_root() -> Path:
    return repo_root_path


ARTIFACTS = repo_root() / "MLPipeline" / "artifacts"
_bootstrap_attempted = False


def _bootstrap_models_if_missing() -> None:
    global _bootstrap_attempted
    if _bootstrap_attempted:
        return
    _bootstrap_attempted = True
    script = repo_root() / "MLPipeline" / "scripts" / "retrain_all.py"
    subprocess.run([sys.executable, str(script)], check=True)


def _load_latest(model_name: str):
    model_dir = ARTIFACTS / model_name
    latest_file = model_dir / "latest.json"
    if not latest_file.exists():
        _bootstrap_models_if_missing()
    latest = json.loads((ARTIFACTS / model_name / "latest.json").read_text(encoding="utf-8"))
    version = latest["version"]
    model_path = ARTIFACTS / model_name / version / "model.joblib"
    if not model_path.exists():
        _bootstrap_models_if_missing()
    model = joblib.load(model_path)
    card = json.loads((ARTIFACTS / model_name / version / "model_card.json").read_text(encoding="utf-8"))
    return version, model, card


class UrlReq(BaseModel):
    url: str = Field(..., min_length=3, max_length=4096)


class EmailReq(BaseModel):
    subject: str = Field("", max_length=512)
    body: str = Field("", max_length=20000)


class WebReq(BaseModel):
    text: str = Field("", max_length=40000)


app = FastAPI(title="PhishX ML Inference", version="1.0")

_cache: Dict[str, Any] = {}
_cache_lock = threading.Lock()


def _normalize_probability(probability: float, threshold: float) -> float:
    p = min(max(float(probability), 0.0), 1.0)
    t = min(max(float(threshold), 0.01), 0.99)
    if p <= t:
        return 0.5 * (p / t)
    return 0.5 + 0.5 * ((p - t) / (1.0 - t))


def _build_response(*, model_name: str, version: str, probability: float, threshold: float, **extra: Any):
    normalized = _normalize_probability(probability, threshold)
    confidence = min(1.0, abs(probability - threshold) / max(threshold, 1.0 - threshold))
    return {
        "model": model_name,
        "version": version,
        "score": normalized,
        "probability": float(probability),
        "threshold": float(threshold),
        "decision": "phishing" if probability >= threshold else "safe",
        "confidence": float(confidence),
        **extra,
    }


def _get_or_load_model(cache_key: str, model_name: str):
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached
    loaded = _load_latest(model_name)
    with _cache_lock:
        if cache_key not in _cache:
            _cache[cache_key] = loaded
        return _cache[cache_key]


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/score/url")
def score_url(req: UrlReq):
    version, model, card = _get_or_load_model("url_logreg", "url_logreg")
    vec, feats = featurize_url(req.url)
    X = np.asarray([vec], dtype=np.float32)
    p = float(model.predict_proba(X)[:, 1][0])
    threshold = float(card.get("threshold", 0.5))
    return _build_response(
        model_name="url_logreg",
        version=version,
        probability=p,
        threshold=threshold,
        features=feats,
    )


@app.post("/score/email")
def score_email(req: EmailReq):
    version, model, card = _get_or_load_model("email_tfidf_logreg", "email_tfidf_logreg")
    text = f"{req.subject}\n{req.body}"
    p = float(model.predict_proba([text])[:, 1][0])
    threshold = float(card.get("threshold", 0.5))
    return _build_response(
        model_name="email_tfidf_logreg",
        version=version,
        probability=p,
        threshold=threshold,
    )


@app.post("/score/webpage")
def score_webpage(req: WebReq):
    version, model, card = _get_or_load_model("webpage_signals_rf", "webpage_signals_rf")
    vec, feats = featurize_text(req.text)
    X = np.asarray([vec], dtype=np.float32)
    p = float(model.predict_proba(X)[:, 1][0])
    threshold = float(card.get("threshold", 0.5))
    return _build_response(
        model_name="webpage_signals_rf",
        version=version,
        probability=p,
        threshold=threshold,
        signals=feats,
    )


@app.post("/retrain")
def retrain_models():
    script = repo_root() / "MLPipeline" / "scripts" / "retrain_all.py"
    completed = subprocess.run([sys.executable, str(script)], capture_output=True, text=True, check=False)
    if completed.returncode != 0:
        return {
            "ok": False,
            "message": "Retraining failed",
            "stdout": completed.stdout[-2000:],
            "stderr": completed.stderr[-2000:],
        }
    with _cache_lock:
        _cache.clear()
    return {"ok": True, "message": "Retraining completed successfully"}
