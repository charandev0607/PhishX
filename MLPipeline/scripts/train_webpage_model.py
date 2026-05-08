from __future__ import annotations

from pathlib import Path
import sys

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import precision_recall_fscore_support, roc_auc_score
from sklearn.model_selection import train_test_split

repo_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(repo_root / "MLPipeline" / "py"))

from mlpipeline.features_text import FEATURE_NAMES, featurize_text
from mlpipeline.io_jsonl import read_jsonl
from mlpipeline.registry import ModelCard, save_model_bundle, utc_now_iso
from mlpipeline.thresholds import select_threshold


def main() -> None:
    ds = repo_root / "MLPipeline" / "datasets" / "webpage_train.jsonl"
    rows = read_jsonl(ds)
    if not rows:
        raise SystemExit(f"Dataset missing/empty: {ds}")

    X = []
    y = []
    for r in rows:
        vec, _ = featurize_text(r.get("text", ""))
        X.append(vec)
        y.append(int(r["label"]))

    X = np.asarray(X, dtype=np.float32)
    y = np.asarray(y, dtype=np.int32)
    unique, counts = np.unique(y, return_counts=True)
    if unique.size < 2:
        raise SystemExit(f"Dataset must contain at least 2 classes: {ds}")

    # Tiny datasets can lead to a single-class train fold.
    if X.shape[0] < 20 or int(counts.min()) < 2:
        Xtr, ytr = X, y
        Xte, yte = X, y
    else:
        try:
            Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.15, random_state=42, stratify=y)
        except ValueError:
            # Small or highly imbalanced datasets can fail stratified splitting.
            Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.15, random_state=42, stratify=None)

    clf = RandomForestClassifier(
        n_estimators=250,
        max_depth=None,
        min_samples_leaf=2,
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=1,
    )
    clf.fit(Xtr, ytr)

    proba = clf.predict_proba(Xte)[:, 1]
    selected_threshold, selected_metrics = select_threshold(yte, proba)
    pred = (proba >= selected_threshold).astype(int)
    prec, rec, f1, _ = precision_recall_fscore_support(yte, pred, average="binary", zero_division=0)
    auc = roc_auc_score(yte, proba)

    metrics = {
        "accuracy": float(selected_metrics["accuracy"]),
        "precision": float(prec),
        "recall": float(rec),
        "f1": float(f1),
        "auc": float(auc),
        "fpr": float(selected_metrics["fpr"]),
    }
    version = utc_now_iso().replace(":", "").replace("-", "").split(".")[0]
    card = ModelCard(
        name="webpage_signals_rf",
        version=version,
        created_at=utc_now_iso(),
        framework="scikit-learn",
        feature_names=FEATURE_NAMES,
        threshold=selected_threshold,
        metrics=metrics,
        notes="Webpage urgency/brand/login/link-count signals random forest baseline",
    )

    save_model_bundle(repo_root=repo_root, model_name="webpage_signals_rf", version=version, model_obj=clf, card=card)


if __name__ == "__main__":
    main()

