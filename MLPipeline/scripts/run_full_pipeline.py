from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def run(cmd: list[str], *, cwd: Path) -> None:
    print(f"[RUN] {' '.join(cmd)}")
    p = subprocess.run(cmd, cwd=str(cwd), check=False)
    if p.returncode != 0:
        raise SystemExit(p.returncode)


def file_has_lines(path: Path, min_lines: int = 1) -> bool:
    if not path.exists():
        return False
    with path.open("r", encoding="utf-8") as f:
        count = 0
        for _ in f:
            count += 1
            if count >= min_lines:
                return True
    return False


def main() -> None:
    ap = argparse.ArgumentParser(description="Run full PhishX ML pipeline end-to-end.")
    ap.add_argument("--skip-build-url", action="store_true", help="Skip building URL dataset from live sources")
    ap.add_argument("--train_phishing", type=int, default=25000)
    ap.add_argument("--train_legit", type=int, default=25000)
    ap.add_argument("--eval_total", type=int, default=20000)
    ap.add_argument("--eval_safe_ratio", type=float, default=0.9)
    args = ap.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    ds_dir = repo_root / "MLPipeline" / "datasets"

    # 1) Build URL dataset from live sources unless skipped
    if not args.skip_build_url:
        run(
            [
                sys.executable,
                "MLPipeline/scripts/build_url_dataset.py",
                "--train_phishing",
                str(args.train_phishing),
                "--train_legit",
                str(args.train_legit),
                "--eval_total",
                str(args.eval_total),
                "--eval_safe_ratio",
                str(args.eval_safe_ratio),
            ],
            cwd=repo_root,
        )

    # 2) Ensure email/webpage datasets exist
    email_train = ds_dir / "email_train.jsonl"
    email_eval = ds_dir / "email_eval.jsonl"
    web_train = ds_dir / "webpage_train.jsonl"
    web_eval = ds_dir / "webpage_eval.jsonl"

    missing = [str(p) for p in [email_train, email_eval, web_train, web_eval] if not file_has_lines(p, 1)]
    if missing:
        raise SystemExit(
            "Missing required real datasets; refusing synthetic fallback. "
            f"Populate these files first: {', '.join(missing)}"
        )

    # 3) Train all models
    run([sys.executable, "MLPipeline/scripts/train_all.py"], cwd=repo_root)

    # 4) Evaluate with gates
    run([sys.executable, "MLPipeline/scripts/eval_all.py"], cwd=repo_root)

    print("[OK] Full ML pipeline completed successfully.")


if __name__ == "__main__":
    main()

