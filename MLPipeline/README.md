## MLPipeline (PhishX)

This folder contains the offline ML pipeline for PhishX:

- Dataset ingestion + normalization
- Feature engineering (URL + email text + webpage text signals)
- Training scripts
- Evaluation scripts (accuracy/precision/recall/FPR gates)
- Model artifact versioning + changelog

### Quick start

Generate a synthetic dataset (for wiring + CI smoke tests):

```bash
node MLPipeline/scripts/generate_synthetic_datasets.js
```

Train and evaluate all models:

```bash
node MLPipeline/scripts/train_all.js
node MLPipeline/scripts/eval_all.js
```

Artifacts are written to `MLPipeline/artifacts/` and loaded by the Python inference service at runtime.

### Datasets

Datasets are JSONL files:

- `MLPipeline/datasets/url_train.jsonl`
- `MLPipeline/datasets/url_eval.jsonl`
- `MLPipeline/datasets/email_train.jsonl`
- `MLPipeline/datasets/email_eval.jsonl`
- `MLPipeline/datasets/webpage_train.jsonl`
- `MLPipeline/datasets/webpage_eval.jsonl`

Each line is a JSON object.

### Metrics gates

The evaluation script enforces:

- Accuracy ≥ 0.90
- Precision ≥ 0.90
- Recall ≥ 0.85
- FPR ≤ 0.05

You can override gates with env vars:

- `ML_MIN_ACCURACY`
- `ML_MIN_PRECISION`
- `ML_MIN_RECALL`
- `ML_MAX_FPR`

