from __future__ import annotations

import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
# Ensure local package imports work when script is executed directly.
sys.path.insert(0, str(REPO_ROOT / "MLPipeline" / "py"))

def _seed_url_rows():
    phishing = [
        {"url": "https://paypaI-login-check.example.com", "label": 1},
        {"url": "https://secure-banking-verify.example.com/session", "label": 1},
        {"url": "https://microsoft-security-reset.example.com/account", "label": 1},
        {"url": "https://apple-id-restore.example.com/recovery", "label": 1},
        {"url": "https://wallet-auth-check.example.com/confirm", "label": 1},
    ]
    safe = [
        {"url": "https://www.google.com/", "label": 0},
        {"url": "https://www.github.com/", "label": 0},
        {"url": "https://www.wikipedia.org/", "label": 0},
        {"url": "https://www.python.org/", "label": 0},
        {"url": "https://developer.mozilla.org/", "label": 0},
    ]
    return phishing + safe


def _seed_email_rows():
    phishing = [
        {
            "subject": "Urgent: verify your account now",
            "body": "Your mailbox will be suspended. Login immediately at http://secure-login-check.example.com.",
            "label": 1,
        },
        {
            "subject": "Payment failed - action required",
            "body": "We could not process your payment. Confirm card details and password to avoid account lock.",
            "label": 1,
        },
        {
            "subject": "Security alert from IT",
            "body": "Unusual sign-in detected. Validate your credentials at https://company-security-alert.example.com.",
            "label": 1,
        },
        {
            "subject": "Doc shared with you",
            "body": "Open the attached secure document and re-enter your corporate password to decrypt.",
            "label": 1,
        },
    ]
    safe = [
        {
            "subject": "Team standup moved to 3 PM",
            "body": "Reminder: daily standup is moved to 3 PM today. No action needed.",
            "label": 0,
        },
        {
            "subject": "Your order has shipped",
            "body": "Tracking update: package shipped and will arrive tomorrow.",
            "label": 0,
        },
        {
            "subject": "Project notes",
            "body": "Please review the meeting notes in the shared drive when available.",
            "label": 0,
        },
        {
            "subject": "Invoice paid successfully",
            "body": "Payment received. Receipt attached for accounting records.",
            "label": 0,
        },
    ]
    return phishing + safe


def _seed_webpage_rows():
    phishing = [
        {"text": "Urgent security alert from PayPal. Verify your account immediately at https://security-check-paypal.example.com and log in with password.", "label": 1},
        {"text": "Action required: your bank account is locked. Reset your password now at https://bank-verify.example.com.", "label": 1},
        {"text": "Microsoft Office365 notice: unusual sign in detected. Confirm OTP and security code immediately: https://microsoft-auth.example.com.", "label": 1},
        {"text": "Amazon account suspended. Verify your account and log in at https://amazon-restore.example.com to avoid permanent lock.", "label": 1},
        {"text": "Google security alert. Reset your password immediately at https://google-security-reset.example.com.", "label": 1},
        {"text": "Apple ID limited. Action required to verify your account now: https://apple-id-check.example.com.", "label": 1},
        {"text": "Bank warning: confirm credit card and OTP details now at https://card-verify.example.com.", "label": 1},
        {"text": "Urgent: your Outlook mailbox is suspended. Sign in and verify account at https://outlook-recovery.example.com.", "label": 1},
        {"text": "Security alert from Gmail. Log in immediately with password and 2FA code at https://gmail-auth-security.example.com.", "label": 1},
        {"text": "Account limited. Verify your account and reset password immediately using https://secure-login-center.example.com.", "label": 1},
    ]
    safe = [
        {"text": "University home page with departments, admissions information, campus map, and event calendar.", "label": 0},
        {"text": "Company engineering blog discussing architecture, performance improvements, and release notes.", "label": 0},
        {"text": "Travel article with city guide, hotel recommendations, food options, and itinerary tips.", "label": 0},
        {"text": "Open-source documentation page with installation guide, API reference, and troubleshooting FAQ.", "label": 0},
        {"text": "Recipe website sharing cooking steps, ingredients list, and nutrition details for dinner ideas.", "label": 0},
        {"text": "Sports coverage page showing match results, player statistics, and season schedules.", "label": 0},
        {"text": "E-commerce category listing with product filters, reviews, shipping policy, and return policy.", "label": 0},
        {"text": "Government information portal with tax deadlines, public notices, and downloadable forms.", "label": 0},
        {"text": "Education platform lessons for mathematics, science experiments, and practice questions.", "label": 0},
        {"text": "Music news and album reviews featuring interviews, concert dates, and playlist suggestions.", "label": 0},
    ]
    return phishing + safe


def ensure_seed_dataset(path: Path, rows) -> None:
    existing = read_jsonl(path)
    if existing:
        return
    write_jsonl(path, rows)


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
    from mlpipeline.io_jsonl import read_jsonl, write_jsonl
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

    # Seed minimal datasets when files are missing or empty.
    # This keeps retraining usable in fresh/dev environments.
    ensure_seed_dataset(ds / "url_train.jsonl", _seed_url_rows())
    ensure_seed_dataset(ds / "url_eval.jsonl", _seed_url_rows())
    ensure_seed_dataset(ds / "email_train.jsonl", _seed_email_rows())
    ensure_seed_dataset(ds / "email_eval.jsonl", _seed_email_rows())
    ensure_seed_dataset(ds / "webpage_train.jsonl", _seed_webpage_rows())
    ensure_seed_dataset(ds / "webpage_eval.jsonl", _seed_webpage_rows())

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

