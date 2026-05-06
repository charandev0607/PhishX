from __future__ import annotations

import argparse
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


def _ensure_datasets_exist(ds_dir: Path) -> None:
    def _has_two_classes(p: Path) -> bool:
        try:
            rows = read_jsonl(p)
        except OSError:
            return False
        labels = set()
        for r in rows:
            try:
                labels.add(int(r.get("label", 0)))
            except (TypeError, ValueError):
                labels.add(0)
        return len(labels) >= 2

    required = [
        ds_dir / "url_train.jsonl",
        ds_dir / "url_eval.jsonl",
        ds_dir / "email_train.jsonl",
        ds_dir / "email_eval.jsonl",
        ds_dir / "webpage_train.jsonl",
        ds_dir / "webpage_eval.jsonl",
    ]
    missing_or_empty = []
    for p in required:
        try:
            if not p.exists() or not read_jsonl(p):
                missing_or_empty.append(p)
        except OSError:
            missing_or_empty.append(p)

    # Training requires at least two classes. If datasets exist but are
    # degenerate (e.g., only label=1), bootstrap synthetic datasets.
    degenerate = []
    for p in [ds_dir / "url_train.jsonl", ds_dir / "email_train.jsonl", ds_dir / "webpage_train.jsonl"]:
        if p.exists() and read_jsonl(p) and not _has_two_classes(p):
            degenerate.append(p)

    if not missing_or_empty:
        if not degenerate:
            return

    # First-run / Docker-friendly behavior: generate synthetic datasets so the
    # service can start even without production dataset downloads.
    gen = REPO_ROOT / "MLPipeline" / "scripts" / "generate_synthetic_datasets.py"
    import subprocess

    subprocess.check_call([sys.executable, str(gen)])


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Merge incremental datasets, train, and optionally eval.")
    parser.add_argument("--no-eval", action="store_true", help="Skip evaluation gates (useful for CI smoke).")
    args = parser.parse_args(argv)

    repo_root = REPO_ROOT

    ds = repo_root / "MLPipeline" / "datasets"
    inc = repo_root / "MLPipeline" / "datasets" / "incremental"
    inc.mkdir(parents=True, exist_ok=True)

    _ensure_datasets_exist(ds)

    merge_dataset(ds / "url_train.jsonl", inc / "url_train.jsonl", "url")
    merge_dataset(ds / "email_train.jsonl", inc / "email_train.jsonl", "body")
    merge_dataset(ds / "webpage_train.jsonl", inc / "webpage_train.jsonl", "text")

    # Clear incremental after merge (so next retrain is truly incremental)
    for p in inc.glob("*.jsonl"):
        try:
            p.unlink()
        except OSError:
            pass

    # Train + eval
    import subprocess

    subprocess.check_call([sys.executable, str(repo_root / "MLPipeline" / "scripts" / "train_all.py")])
    if not args.no_eval:
        subprocess.check_call([sys.executable, str(repo_root / "MLPipeline" / "scripts" / "eval_all.py")])


if __name__ == "__main__":
    main()

