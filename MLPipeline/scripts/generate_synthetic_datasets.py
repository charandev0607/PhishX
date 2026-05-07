from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "MLPipeline" / "py"))

from mlpipeline.io_jsonl import write_jsonl


def _split_rows(rows, train_ratio: float, rng: random.Random):
    shuffled = list(rows)
    rng.shuffle(shuffled)
    split_idx = max(1, int(len(shuffled) * train_ratio))
    return shuffled[:split_idx], shuffled[split_idx:]


def _url_rows():
    phishing = [
        {"url": "https://secure-login-check.example.com/account/verify", "label": 1},
        {"url": "https://paypal-security-alert.example.com/update", "label": 1},
        {"url": "https://microsoft-auth-reset.example.com/confirm", "label": 1},
        {"url": "https://bank-verify-now.example.com/session", "label": 1},
        {"url": "https://apple-id-warning.example.com/recovery", "label": 1},
    ]
    safe = [
        {"url": "https://www.google.com/", "label": 0},
        {"url": "https://www.github.com/", "label": 0},
        {"url": "https://www.wikipedia.org/", "label": 0},
        {"url": "https://www.python.org/", "label": 0},
        {"url": "https://developer.mozilla.org/", "label": 0},
    ]
    return phishing + safe


def _email_rows():
    phishing = [
        {"subject": "Urgent: verify account now", "body": "Your account will be disabled. Sign in immediately to verify credentials.", "label": 1},
        {"subject": "Action needed: payroll issue", "body": "Re-enter your company password to confirm payroll details today.", "label": 1},
        {"subject": "Security alert", "body": "Unusual login detected. Confirm your account with OTP and password.", "label": 1},
        {"subject": "Mailbox quota exceeded", "body": "Update your mailbox credentials immediately to prevent suspension.", "label": 1},
    ]
    safe = [
        {"subject": "Sprint planning moved", "body": "Team meeting moved to 4 PM. No additional action required.", "label": 0},
        {"subject": "Invoice processed", "body": "Your payment has been received. Receipt attached.", "label": 0},
        {"subject": "Weekly report", "body": "Please review the attached report before Friday.", "label": 0},
        {"subject": "Office event", "body": "Reminder: company event tomorrow at 6 PM in the main hall.", "label": 0},
    ]
    return phishing + safe


def _webpage_rows():
    phishing = [
        {"text": "Urgent account security notice. Verify your credentials and password now to avoid suspension.", "label": 1},
        {"text": "Bank verification required. Submit OTP and login password immediately.", "label": 1},
        {"text": "Reset your corporate account password now. Immediate action required.", "label": 1},
        {"text": "Your session has expired. Re-enter credentials to continue securely.", "label": 1},
    ]
    safe = [
        {"text": "Documentation page with API examples, guides, and troubleshooting tips.", "label": 0},
        {"text": "News article summarizing technology updates and product launches.", "label": 0},
        {"text": "E-commerce product listing with reviews, prices, and shipping policy.", "label": 0},
        {"text": "University information portal with admissions, departments, and campus updates.", "label": 0},
    ]
    return phishing + safe


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate small synthetic datasets for CI/bootstrap.")
    parser.add_argument("--out_dir", default="MLPipeline/datasets")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--train_ratio", type=float, default=0.8)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    out_dir = (REPO_ROOT / args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    url_train, url_eval = _split_rows(_url_rows(), args.train_ratio, rng)
    email_train, email_eval = _split_rows(_email_rows(), args.train_ratio, rng)
    webpage_train, webpage_eval = _split_rows(_webpage_rows(), args.train_ratio, rng)

    write_jsonl(out_dir / "url_train.jsonl", url_train)
    write_jsonl(out_dir / "url_eval.jsonl", url_eval)
    write_jsonl(out_dir / "email_train.jsonl", email_train)
    write_jsonl(out_dir / "email_eval.jsonl", email_eval)
    write_jsonl(out_dir / "webpage_train.jsonl", webpage_train)
    write_jsonl(out_dir / "webpage_eval.jsonl", webpage_eval)

    print(f"Synthetic datasets written to {out_dir}")


if __name__ == "__main__":
    main()
