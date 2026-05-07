from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Callable, Dict, List, Tuple
import sys

import joblib
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, confusion_matrix

repo_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(repo_root / "MLPipeline" / "py"))

from mlpipeline.features_text import featurize_text
from mlpipeline.features_url import featurize_url
from mlpipeline.io_jsonl import read_jsonl


def gates() -> Dict[str, float]:
    return {
        "min_accuracy": float(os.getenv("ML_MIN_ACCURACY", "0.90")),
        "min_precision": float(os.getenv("ML_MIN_PRECISION", "0.90")),
        "min_recall": float(os.getenv("ML_MIN_RECALL", "0.85")),
        "max_fpr": float(os.getenv("ML_MAX_FPR", "0.05")),
    }


def eval_binary(scores: np.ndarray, y: np.ndarray, threshold: float = 0.5) -> Dict[str, float]:
    pred = (scores >= threshold).astype(int)
    acc = float(accuracy_score(y, pred))
    prec = float(precision_score(y, pred, zero_division=0))
    rec = float(recall_score(y, pred, zero_division=0))
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    fpr = float(fp / (fp + tn)) if (fp + tn) else 0.0
    return {"accuracy": acc, "precision": prec, "recall": rec, "fpr": fpr, "tp": float(tp), "fp": float(fp), "tn": float(tn), "fn": float(fn)}


def latest_dir(artifacts: Path, name: str) -> Path:
    latest = json.loads((artifacts / name / "latest.json").read_text(encoding="utf-8"))
    return artifacts / name / latest["version"]


def model_threshold(model_dir: Path) -> float:
    card = json.loads((model_dir / "model_card.json").read_text(encoding="utf-8"))
    return float(card.get("threshold", 0.5))


def must_pass(name: str, m: Dict[str, float]) -> None:
    g = gates()
    failures: List[str] = []
    if m["accuracy"] < g["min_accuracy"]:
        failures.append(f"accuracy {m['accuracy']:.3f} < {g['min_accuracy']:.3f}")
    if m["precision"] < g["min_precision"]:
        failures.append(f"precision {m['precision']:.3f} < {g['min_precision']:.3f}")
    if m["recall"] < g["min_recall"]:
        failures.append(f"recall {m['recall']:.3f} < {g['min_recall']:.3f}")
    if m["fpr"] > g["max_fpr"]:
        failures.append(f"fpr {m['fpr']:.3f} > {g['max_fpr']:.3f}")
    if failures:
        raise SystemExit(f"{name} failed gates: " + ", ".join(failures))


def main() -> None:
    artifacts = repo_root / "MLPipeline" / "artifacts"

    # URL model
    url_eval = read_jsonl(repo_root / "MLPipeline" / "datasets" / "url_eval.jsonl")
    X_url = np.asarray([featurize_url(r["url"])[0] for r in url_eval], dtype=np.float32)
    y_url = np.asarray([int(r["label"]) for r in url_eval], dtype=np.int32)
    url_dir = latest_dir(artifacts, "url_logreg")
    url_model = joblib.load(url_dir / "model.joblib")
    url_scores = url_model.predict_proba(X_url)[:, 1]
    url_m = eval_binary(url_scores, y_url, threshold=model_threshold(url_dir))
    must_pass("url_logreg", url_m)

    # Email model
    email_eval = read_jsonl(repo_root / "MLPipeline" / "datasets" / "email_eval.jsonl")
    X_email = [f"{r.get('subject','')}\n{r.get('body','')}" for r in email_eval]
    y_email = np.asarray([int(r["label"]) for r in email_eval], dtype=np.int32)
    email_dir = latest_dir(artifacts, "email_tfidf_logreg")
    email_model = joblib.load(email_dir / "model.joblib")
    email_scores = email_model.predict_proba(X_email)[:, 1]
    email_m = eval_binary(email_scores, y_email, threshold=model_threshold(email_dir))
    must_pass("email_tfidf_logreg", email_m)

    # Webpage model
    web_eval = read_jsonl(repo_root / "MLPipeline" / "datasets" / "webpage_eval.jsonl")
    X_web = np.asarray([featurize_text(r.get("text", ""))[0] for r in web_eval], dtype=np.float32)
    y_web = np.asarray([int(r["label"]) for r in web_eval], dtype=np.int32)
    web_dir = latest_dir(artifacts, "webpage_signals_rf")
    web_model = joblib.load(web_dir / "model.joblib")
    if hasattr(web_model, "n_jobs"):
        web_model.n_jobs = 1
    web_scores = web_model.predict_proba(X_web)[:, 1]
    web_m = eval_binary(web_scores, y_web, threshold=model_threshold(web_dir))
    must_pass("webpage_signals_rf", web_m)

    print(json.dumps({"url_logreg": url_m, "email_tfidf_logreg": email_m, "webpage_signals_rf": web_m}, indent=2))


if __name__ == "__main__":
    main()

