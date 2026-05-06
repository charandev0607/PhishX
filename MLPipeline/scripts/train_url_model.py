from __future__ import annotations

from pathlib import Path
import sys

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_recall_fscore_support, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

repo_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(repo_root / "MLPipeline" / "py"))

from mlpipeline.features_url import FEATURE_NAMES, featurize_url
from mlpipeline.io_jsonl import read_jsonl
from mlpipeline.registry import ModelCard, save_model_bundle, utc_now_iso


def main() -> None:
    ds = repo_root / "MLPipeline" / "datasets" / "url_train.jsonl"
    rows = read_jsonl(ds)
    if not rows:
        raise SystemExit(f"Dataset missing/empty: {ds}")

    X = []
    y = []
    for r in rows:
        vec, _ = featurize_url(r["url"])
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

    clf = Pipeline(
        steps=[
            ("scaler", StandardScaler(with_mean=True, with_std=True)),
            ("lr", LogisticRegression(max_iter=2000, class_weight="balanced", n_jobs=None)),
        ]
    )
    clf.fit(Xtr, ytr)

    proba = clf.predict_proba(Xte)[:, 1]
    pred = (proba >= 0.5).astype(int)
    prec, rec, f1, _ = precision_recall_fscore_support(yte, pred, average="binary", zero_division=0)
    auc = roc_auc_score(yte, proba)

    metrics = {"precision": float(prec), "recall": float(rec), "f1": float(f1), "auc": float(auc)}
    version = utc_now_iso().replace(":", "").replace("-", "").split(".")[0]
    card = ModelCard(
        name="url_logreg",
        version=version,
        created_at=utc_now_iso(),
        framework="scikit-learn",
        feature_names=FEATURE_NAMES,
        threshold=0.5,
        metrics=metrics,
        notes="URL lexical/structural logistic regression baseline",
    )

    save_model_bundle(repo_root=repo_root, model_name="url_logreg", version=version, model_obj=clf, card=card)


if __name__ == "__main__":
    main()

