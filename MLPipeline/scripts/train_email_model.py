from __future__ import annotations

from pathlib import Path
import sys

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_recall_fscore_support, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

repo_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(repo_root / "MLPipeline" / "py"))

from mlpipeline.io_jsonl import read_jsonl
from mlpipeline.registry import ModelCard, save_model_bundle, utc_now_iso


def main() -> None:
    ds = repo_root / "MLPipeline" / "datasets" / "email_train.jsonl"
    rows = read_jsonl(ds)
    if not rows:
        raise SystemExit(f"Dataset missing/empty: {ds}")

    texts = []
    y = []
    for r in rows:
        texts.append(f"{r.get('subject','')}\n{r.get('body','')}")
        y.append(int(r["label"]))

    y = np.asarray(y, dtype=np.int32)
    Xtr, Xte, ytr, yte = train_test_split(texts, y, test_size=0.15, random_state=42, stratify=y)

    clf = Pipeline(
        steps=[
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=40000)),
            ("lr", LogisticRegression(max_iter=2000, class_weight="balanced")),
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
        name="email_tfidf_logreg",
        version=version,
        created_at=utc_now_iso(),
        framework="scikit-learn",
        feature_names=["tfidf(1-2grams)"],
        threshold=0.5,
        metrics=metrics,
        notes="Email TF-IDF + logistic regression baseline",
    )

    save_model_bundle(repo_root=repo_root, model_name="email_tfidf_logreg", version=version, model_obj=clf, card=card)


if __name__ == "__main__":
    main()

