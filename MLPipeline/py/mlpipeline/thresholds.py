from __future__ import annotations

from typing import Dict, Tuple

import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support


DEFAULT_GATES = {
    "accuracy": 0.90,
    "precision": 0.90,
    "recall": 0.85,
    "fpr": 0.05,
}


def threshold_metrics(y_true: np.ndarray, scores: np.ndarray, threshold: float) -> Dict[str, float]:
    pred = (scores >= threshold).astype(int)
    prec, rec, f1, _ = precision_recall_fscore_support(y_true, pred, average="binary", zero_division=0)
    acc = accuracy_score(y_true, pred)
    tn, fp, fn, tp = confusion_matrix(y_true, pred, labels=[0, 1]).ravel()
    fpr = float(fp / (fp + tn)) if (fp + tn) else 0.0
    return {
        "accuracy": float(acc),
        "precision": float(prec),
        "recall": float(rec),
        "f1": float(f1),
        "fpr": float(fpr),
        "tp": float(tp),
        "fp": float(fp),
        "tn": float(tn),
        "fn": float(fn),
    }


def select_threshold(
    y_true: np.ndarray,
    scores: np.ndarray,
    *,
    gates: Dict[str, float] | None = None,
) -> Tuple[float, Dict[str, float]]:
    active_gates = gates or DEFAULT_GATES

    best_threshold = 0.5
    best_metrics = threshold_metrics(y_true, scores, best_threshold)
    best_gate_count = -1

    for candidate in np.arange(0.05, 0.96, 0.01):
        metrics = threshold_metrics(y_true, scores, float(candidate))
        gate_count = sum(
            [
                metrics["accuracy"] >= active_gates["accuracy"],
                metrics["precision"] >= active_gates["precision"],
                metrics["recall"] >= active_gates["recall"],
                metrics["fpr"] <= active_gates["fpr"],
            ]
        )

        if gate_count > best_gate_count:
            best_threshold = float(round(candidate, 2))
            best_metrics = metrics
            best_gate_count = gate_count
            continue

        if gate_count == best_gate_count:
            if metrics["f1"] > best_metrics["f1"] or (
                metrics["f1"] == best_metrics["f1"] and metrics["recall"] > best_metrics["recall"]
            ):
                best_threshold = float(round(candidate, 2))
                best_metrics = metrics

    return best_threshold, best_metrics
