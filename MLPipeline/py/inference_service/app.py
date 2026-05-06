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


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/score/url")
def score_url(req: UrlReq):
    with _cache_lock:
        if "url_logreg" not in _cache:
            _cache["url_logreg"] = _load_latest("url_logreg")
        version, model, card = _cache["url_logreg"]
    vec, feats = featurize_url(req.url)
    X = np.asarray([vec], dtype=np.float32)
    p = float(model.predict_proba(X)[:, 1][0])
    return {"model": "url_logreg", "version": version, "score": p, "threshold": float(card.get("threshold", 0.5)), "features": feats}


@app.post("/score/email")
def score_email(req: EmailReq):
    with _cache_lock:
        if "email_tfidf_logreg" not in _cache:
            _cache["email_tfidf_logreg"] = _load_latest("email_tfidf_logreg")
        version, model, card = _cache["email_tfidf_logreg"]
    text = f"{req.subject}\n{req.body}"
    p = float(model.predict_proba([text])[:, 1][0])
    return {"model": "email_tfidf_logreg", "version": version, "score": p, "threshold": float(card.get("threshold", 0.5))}


@app.post("/score/webpage")
def score_webpage(req: WebReq):
    with _cache_lock:
        if "webpage_signals_rf" not in _cache:
            _cache["webpage_signals_rf"] = _load_latest("webpage_signals_rf")
        version, model, card = _cache["webpage_signals_rf"]
    vec, feats = featurize_text(req.text)
    X = np.asarray([vec], dtype=np.float32)
    p = float(model.predict_proba(X)[:, 1][0])
    return {"model": "webpage_signals_rf", "version": version, "score": p, "threshold": float(card.get("threshold", 0.5)), "signals": feats}


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

