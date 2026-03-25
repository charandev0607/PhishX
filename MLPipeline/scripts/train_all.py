from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def run(script: str) -> None:
    repo_root = Path(__file__).resolve().parents[2]
    p = subprocess.run([sys.executable, str(repo_root / "MLPipeline" / "scripts" / script)], check=False)
    if p.returncode != 0:
        raise SystemExit(p.returncode)


def main() -> None:
    run("train_url_model.py")
    run("train_email_model.py")
    run("train_webpage_model.py")


if __name__ == "__main__":
    main()

