from __future__ import annotations

import random
from pathlib import Path
import sys

repo_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(repo_root / "MLPipeline" / "py"))

from mlpipeline.io_jsonl import write_jsonl


def gen_url(label: int) -> str:
    safe = [
        "https://www.google.com/search?q=phishx",
        "https://www.microsoft.com/en-us/",
        "https://www.apple.com/support/",
        "https://www.amazon.com/gp/help/customer/display.html",
        "https://www.paypal.com/signin",
    ]
    phish = [
        "http://paypaI.com.security-verification.example.ru/login.php?session=8821",
        "http://micros0ft.com.account-verify.example.com/login/verify",
        "http://googIe.com.secure-update.example.net/confirm?token=abc123",
        "http://appleid.com.account-locked.example.org/reset-password",
        "http://amazon.com.billing-update.example.biz/signin?redirect=http://1.2.3.4/a",
    ]
    return random.choice(phish if label == 1 else safe)


def gen_email(label: int) -> tuple[str, str]:
    if label == 0:
        return (
            "Your receipt is available",
            "Thanks for your purchase. View details at https://www.amazon.com/orders",
        )
    return (
        "URGENT: Verify your account immediately",
        "Action required: verify your account now or it will be suspended. Login here: http://paypaI.com.security-verification.example.ru/login",
    )


def gen_webpage_text(label: int) -> str:
    if label == 0:
        return "Welcome to our help center. Browse articles and contact support."
    return "URGENT security alert. Verify your account immediately. Sign in to Microsoft to restore access. Reset password now."


def main() -> None:
    out_dir = repo_root / "MLPipeline" / "datasets"
    out_dir.mkdir(parents=True, exist_ok=True)

    def split_rows(rows):
        random.shuffle(rows)
        cut = int(len(rows) * 0.8)
        return rows[:cut], rows[cut:]

    url_rows = [{"url": gen_url(lbl), "label": lbl} for lbl in [0, 1] for _ in range(500)]
    email_rows = []
    for lbl in [0, 1]:
        for _ in range(500):
            subject, body = gen_email(lbl)
            email_rows.append({"subject": subject, "body": body, "label": lbl})
    web_rows = [{"text": gen_webpage_text(lbl), "label": lbl} for lbl in [0, 1] for _ in range(500)]

    url_train, url_eval = split_rows(url_rows)
    email_train, email_eval = split_rows(email_rows)
    web_train, web_eval = split_rows(web_rows)

    write_jsonl(out_dir / "url_train.jsonl", url_train)
    write_jsonl(out_dir / "url_eval.jsonl", url_eval)
    write_jsonl(out_dir / "email_train.jsonl", email_train)
    write_jsonl(out_dir / "email_eval.jsonl", email_eval)
    write_jsonl(out_dir / "webpage_train.jsonl", web_train)
    write_jsonl(out_dir / "webpage_eval.jsonl", web_eval)


if __name__ == "__main__":
    main()

