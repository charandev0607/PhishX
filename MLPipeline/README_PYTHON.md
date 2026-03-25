## Python ML Pipeline (required)

This repo’s production ML is implemented in **Python** and served to the Node backend via HTTP.

### Install (Windows PowerShell)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r MLPipeline\requirements.txt
```

### Create datasets (starter)

```powershell
python MLPipeline\scripts\generate_synthetic_datasets.py
```

### Create datasets (production sources)

This downloads:
- PhishTank verified phishing URLs (bulk CSV)
- OpenPhish community feed (free text feed)
- Majestic Million top domains (domains -> https://{domain}/)

Then produces:
- `MLPipeline/datasets/url_train.jsonl`
- `MLPipeline/datasets/url_eval.jsonl`

```powershell
python MLPipeline\scripts\build_url_dataset.py --train_phishing 25000 --train_legit 25000 --eval_total 20000 --eval_safe_ratio 0.9
```

### Train + evaluate (gated)

```powershell
python MLPipeline\scripts\train_all.py
python MLPipeline\scripts\eval_all.py
```

Artifacts are written under `MLPipeline/artifacts/`.

### One command: full pipeline

```powershell
python MLPipeline\scripts\run_full_pipeline.py
```

This runs:
- URL dataset build (live sources)
- Missing email/webpage fallback generation (if needed)
- Train all
- Gated eval all

### Run inference service

```powershell
uvicorn inference_service.app:app --app-dir MLPipeline\py --host 127.0.0.1 --port 8010
```

Then set the backend env:

- `ML_SERVICE_URL=http://127.0.0.1:8010`

