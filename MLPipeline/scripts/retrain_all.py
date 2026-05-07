from __future__ import annotations

import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
# Ensure local package imports work when script is executed directly.
sys.path.insert(0, str(REPO_ROOT / "MLPipeline" / "py"))

from mlpipeline.io_jsonl import read_jsonl, write_jsonl


def _dedup(rows, key_fn):
    seen = set()
    out = []
    for r in rows:
        k = key_fn(r)
        if k in seen:
            continue
        seen.add(k)
        out.append(r)
    return out


def merge_dataset(base: Path, incremental: Path, key_field: str) -> None:
    base_rows = read_jsonl(base)
    inc_rows = read_jsonl(incremental) if incremental.exists() else []
    merged = _dedup(base_rows + inc_rows, key_fn=lambda r: (r.get(key_field), int(r.get("label", 0))))
    write_jsonl(base, merged)


def merge_dataset_with_key(base: Path, incremental: Path, key_fn) -> None:
    base_rows = read_jsonl(base)
    inc_rows = read_jsonl(incremental) if incremental.exists() else []
    merged = _dedup(base_rows + inc_rows, key_fn=key_fn)
    write_jsonl(base, merged)


def main() -> None:
    repo_root = REPO_ROOT

    ds = repo_root / "MLPipeline" / "datasets"
    inc = repo_root / "MLPipeline" / "datasets" / "incremental"
    inc.mkdir(parents=True, exist_ok=True)

    merge_dataset(ds / "url_train.jsonl", inc / "url_train.jsonl", "url")
    merge_dataset_with_key(
        ds / "email_train.jsonl",
        inc / "email_train.jsonl",
        key_fn=lambda r: (r.get("subject", ""), r.get("body", ""), int(r.get("label", 0))),
    )
    merge_dataset(ds / "webpage_train.jsonl", inc / "webpage_train.jsonl", "text")

    required = [ds / "url_train.jsonl", ds / "email_train.jsonl", ds / "webpage_train.jsonl"]
    missing = [str(p) for p in required if not p.exists() or not read_jsonl(p)]
    if missing:
        raise SystemExit(
            "Retraining aborted: missing or empty datasets. "
            f"Generate datasets before retraining. Affected: {', '.join(missing)}"
        )

    # Clear incremental after merge (so next retrain is truly incremental)
    for p in inc.glob("*.jsonl"):
        try:
            p.unlink()
        except OSError:
            pass

    # Train + eval
    import subprocess

    subprocess.check_call([sys.executable, str(repo_root / "MLPipeline" / "scripts" / "train_all.py")])
    subprocess.check_call([sys.executable, str(repo_root / "MLPipeline" / "scripts" / "eval_all.py")])


if __name__ == "__main__":
    main()

