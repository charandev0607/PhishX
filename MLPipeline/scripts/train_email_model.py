from __future__ import annotations

from pathlib import Path
import sys

import numpy as np
from sklearn.pipeline import FeatureUnion
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

repo_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(repo_root / "MLPipeline" / "py"))

from mlpipeline.io_jsonl import read_jsonl
from mlpipeline.registry import ModelCard, save_model_bundle, utc_now_iso
from mlpipeline.thresholds import select_threshold


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
    unique, counts = np.unique(y, return_counts=True)
    if unique.size < 2:
        raise SystemExit(f"Dataset must contain at least 2 classes: {ds}")

    # With extremely small datasets (common for first incremental runs),
    # splitting can produce a train fold with a single class.
    if len(texts) < 20 or int(counts.min()) < 2:
        Xtr, ytr = texts, y
        Xte, yte = texts, y
    else:
        try:
            Xtr, Xte, ytr, yte = train_test_split(texts, y, test_size=0.15, random_state=42, stratify=y)
        except ValueError:
            # Small or highly imbalanced datasets can fail stratified splitting.
            Xtr, Xte, ytr, yte = train_test_split(texts, y, test_size=0.15, random_state=42, stratify=None)

    # Some environments may start with tiny incremental datasets. `min_df=2` can
    # break when there are too few documents, so adapt it for small samples.
    min_df = 2 if len(Xtr) >= 10 else 1

    clf = Pipeline(
        steps=[
            (
                "tfidf",
                FeatureUnion(
                    transformer_list=[
                        (
                            "word",
                            TfidfVectorizer(
                                ngram_range=(1, 2),
                                min_df=min_df,
                                max_features=30000,
                                sublinear_tf=True,
                            ),
                        ),
                        (
                            "char",
                            TfidfVectorizer(
                                analyzer="char_wb",
                                ngram_range=(3, 5),
                                min_df=1,
                                max_features=20000,
                                sublinear_tf=True,
                            ),
                        ),
                    ]
                ),
            ),
            ("lr", LogisticRegression(max_iter=2000, class_weight="balanced")),
        ]
    )
    clf.fit(Xtr, ytr)

    proba = clf.predict_proba(Xte)[:, 1]
    selected_threshold, selected_metrics = select_threshold(yte, proba)
    auc = roc_auc_score(yte, proba)

    metrics = {
        "accuracy": float(selected_metrics["accuracy"]),
        "precision": float(selected_metrics["precision"]),
        "recall": float(selected_metrics["recall"]),
        "f1": float(selected_metrics["f1"]),
        "auc": float(auc),
        "fpr": float(selected_metrics["fpr"]),
    }
    version = utc_now_iso().replace(":", "").replace("-", "").split(".")[0]
    card = ModelCard(
        name="email_tfidf_logreg",
        version=version,
        created_at=utc_now_iso(),
        framework="scikit-learn",
        feature_names=["word_tfidf(1-2grams)", "char_tfidf(3-5grams)"],
        threshold=selected_threshold,
        metrics=metrics,
        notes="Email word+character TF-IDF logistic regression with threshold tuning",
    )

    save_model_bundle(repo_root=repo_root, model_name="email_tfidf_logreg", version=version, model_obj=clf, card=card)


if __name__ == "__main__":
    main()

