from __future__ import annotations

import argparse
import json
import os
import sys
import random
from dataclasses import asdict
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Optional, Sequence, Set, Tuple

repo_root = Path(__file__).resolve().parents[2]
# Allow imports when executed directly (no pip install step required)
sys.path.insert(0, str(repo_root / "MLPipeline" / "py"))

from mlpipeline.io_jsonl import write_jsonl
from mlpipeline.normalize_url import normalize_url_for_dedup, url_to_safe_domain
from mlpipeline.sources_majestic_million import SourceConfig as MajSourceConfig
from mlpipeline.sources_openphish import SourceConfig as OpenPhishSourceConfig, download_openphish_community_feed
from mlpipeline.sources_phishtank import SourceConfig as PhishTankSourceConfig, download_phishtank_csv_gz


def _ensure_out_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def _maybe_download_to_cache(*, download_iterable: Iterator[str], cache_path: Path) -> None:
    # Not used yet - kept for future adapters
    _ = download_iterable
    _ = cache_path


def _download_text_to_file(*, url: str, headers: Dict[str, str], dest: Path, chunk_size: int = 1024 * 1024) -> None:
    import requests

    dest.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, headers=headers, stream=True, timeout=120) as r:
        r.raise_for_status()
        with dest.open("wb") as f:
            for chunk in r.iter_content(chunk_size=chunk_size):
                if chunk:
                    f.write(chunk)


def _sample(items: Sequence[str], k: int, rng: random.Random) -> List[str]:
    if k <= 0:
        return []
    if len(items) <= k:
        return list(items)
    return rng.sample(list(items), k)


def main() -> None:
    ap = argparse.ArgumentParser(description="Build URL datasets from PhishTank + OpenPhish + Majestic (leakage-safe).")
    ap.add_argument("--out_dir", default="MLPipeline/datasets")
    ap.add_argument("--cache_dir", default="MLPipeline/cache")
    ap.add_argument("--seed", type=int, default=42)

    ap.add_argument("--train_phishing", type=int, default=25000)
    ap.add_argument("--train_legit", type=int, default=25000)
    ap.add_argument("--eval_total", type=int, default=20000)
    ap.add_argument("--eval_safe_ratio", type=float, default=0.90)  # 90% safe, 10% phishing

    ap.add_argument("--max_phishtank_urls", type=int, default=200000)
    ap.add_argument("--max_openphish_urls", type=int, default=500000)
    ap.add_argument("--max_majestic_domains", type=int, default=200000)  # sample for speed; increase later

    args = ap.parse_args()

    _repo_root = repo_root
    out_dir = (repo_root / args.out_dir).resolve()
    cache_dir = (repo_root / args.cache_dir).resolve()
    _ensure_out_dir(out_dir)
    _ensure_out_dir(cache_dir)

    rng = random.Random(args.seed)

    # -----------------------------
    # 1) Collect phishing URLs
    # -----------------------------
    phish_cfg = PhishTankSourceConfig()
    open_cfg = OpenPhishSourceConfig()
    maj_cfg = MajSourceConfig()

    phishing_urls_set: Set[str] = set()
    phishing_domain_set: Set[str] = set()

    phish_count = 0
    # PhishTank can rate-limit (429). The downloader now falls back to cache if available.
    try:
        for u in download_phishtank_csv_gz(cfg=phish_cfg, cache_dir=str(cache_dir)):
            n = normalize_url_for_dedup(u)
            if not n:
                continue
            phishing_urls_set.add(n.canonical)
            phishing_domain_set.add(n.registrable_domain)
            phish_count += 1
            if phish_count >= args.max_phishtank_urls:
                break
    except Exception as e:
        print(f"[WARN] Skipping PhishTank due to error: {e}")

    # OpenPhish community feed
    open_count = 0
    for u in download_openphish_community_feed(cfg=open_cfg):
        n = normalize_url_for_dedup(u)
        if not n:
            continue
        phishing_urls_set.add(n.canonical)
        phishing_domain_set.add(n.registrable_domain)
        open_count += 1
        if open_count >= args.max_openphish_urls:
            break

    phishing_urls = list(phishing_urls_set)
    phishing_domains = list(phishing_domain_set)

    # -----------------------------
    # 2) Collect legitimate domains (Majestic) -> convert to URLs
    # -----------------------------
    legit_domains: Set[str] = set()
    maj_count = 0
    for d in mlpipeline_sources_majestic_domains(  # type: ignore[name-defined]
        maj_cfg, max_domains=args.max_majestic_domains
    ):
        # Filter out any phishing registrable domain overlap to reduce label conflict.
        # (If a domain is known phishing, treat all as phishing only.)
        if d in phishing_domain_set:
            continue
        legit_domains.add(d)
        maj_count += 1

    legit_domains_list = list(legit_domains)

    # Convert legit domains into root URLs.
    # Keep it simple and fast: `https://{domain}/`.
    legit_urls = [f"https://{d}/" for d in legit_domains_list]

    # -----------------------------
    # 3) Leakage-safe split by registrable domain
    # -----------------------------
    train_ratio = 0.80
    phish_domain_list = list(phishing_domain_set)
    legit_domain_list = list(legit_domains)
    rng.shuffle(phish_domain_list)
    rng.shuffle(legit_domain_list)

    phish_train_domains = set(phish_domain_list[: int(len(phish_domain_list) * train_ratio)])
    phish_eval_domains = set(phish_domain_list) - phish_train_domains
    legit_train_domains = set(legit_domain_list[: int(len(legit_domain_list) * train_ratio)])
    legit_eval_domains = set(legit_domain_list) - legit_train_domains

    phish_train_urls = []
    phish_eval_urls = []
    for u in phishing_urls:
        dom = url_to_safe_domain(u)
        if dom in phish_train_domains:
            phish_train_urls.append(u)
        else:
            phish_eval_urls.append(u)

    legit_train_urls = []
    legit_eval_urls = []
    for u in legit_urls:
        dom = url_to_safe_domain(u)
        if dom in legit_train_domains:
            legit_train_urls.append(u)
        else:
            legit_eval_urls.append(u)

    # Dedupe just in case
    phish_train_urls = list(dict.fromkeys(phish_train_urls))
    phish_eval_urls = list(dict.fromkeys(phish_eval_urls))
    legit_train_urls = list(dict.fromkeys(legit_train_urls))
    legit_eval_urls = list(dict.fromkeys(legit_eval_urls))

    # -----------------------------
    # 4) Compose splits with requested ratios/skew
    # -----------------------------
    # Train: balanced-ish (default 50/50)
    train_phish = _sample(phish_train_urls, args.train_phishing, rng)
    train_legit = _sample(legit_train_urls, args.train_legit, rng)

    # Eval: safe-heavy
    eval_phish_target = int(args.eval_total * (1.0 - args.eval_safe_ratio))
    eval_safe_target = args.eval_total - eval_phish_target

    eval_phish = _sample(phish_eval_urls, eval_phish_target, rng)
    eval_legit = _sample(legit_eval_urls, eval_safe_target, rng)

    # If eval phishing is too small, keep `eval_total` by increasing safe count.
    if len(eval_phish) < eval_phish_target:
        missing_phish = eval_phish_target - len(eval_phish)
        eval_safe_target = min(len(legit_eval_urls), eval_safe_target + missing_phish)
        eval_legit = _sample(legit_eval_urls, eval_safe_target, rng)

    # Final dataset rows
    url_train_rows = [{"url": u, "label": 1} for u in train_phish] + [{"url": u, "label": 0} for u in train_legit]
    url_eval_rows = [{"url": u, "label": 1} for u in eval_phish] + [{"url": u, "label": 0} for u in eval_legit]

    rng.shuffle(url_train_rows)
    rng.shuffle(url_eval_rows)

    write_jsonl(out_dir / "url_train.jsonl", url_train_rows)
    write_jsonl(out_dir / "url_eval.jsonl", url_eval_rows)

    # Write a small build report for transparency
    report = {
        "phish_cfg": asdict(phish_cfg),
        "open_cfg": asdict(open_cfg),
        "maj_cfg": asdict(maj_cfg),
        "num_phishing_urls": len(phishing_urls),
        "num_phishing_domains": len(phishing_domain_set),
        "num_legit_domains": len(legit_domains),
        "num_legit_urls": len(legit_urls),
        "train": {"phishing": len(train_phish), "legit": len(train_legit), "total": len(url_train_rows)},
        "eval": {"phishing": len(eval_phish), "legit": len(eval_legit), "total": len(url_eval_rows)},
    }
    (out_dir / "build_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("Built:", out_dir / "url_train.jsonl", "and", out_dir / "url_eval.jsonl")


def mlpipeline_sources_majestic_domains(maj_cfg, max_domains: int) -> Iterator[str]:  # helper wrapper
    from mlpipeline.sources_majestic_million import download_majestic_million_domains

    yield from download_majestic_million_domains(cfg=maj_cfg, limit=max_domains)


if __name__ == "__main__":
    main()

