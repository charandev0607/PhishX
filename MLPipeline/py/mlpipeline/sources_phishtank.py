from __future__ import annotations

import csv
import gzip
import io
import os
from dataclasses import dataclass
from typing import Iterator

import requests


@dataclass(frozen=True)
class SourceConfig:
    phish_tank_url_csv_gz: str = "http://data.phishtank.com/data/online-valid.csv.gz"
    user_agent: str = "phisx-mlpipeline/1.0 (github.com/your-org; contact=security@example.com)"
    timeout_s: float = 120.0
    cache_hours: int = 2


def _cache_path(cache_dir: str, name: str) -> str:
    return f"{cache_dir.rstrip('/')}/{name}"


def _iter_urls_from_gz_file(gz_path: str) -> Iterator[str]:
    with gzip.open(gz_path, mode="rt", encoding="utf-8", newline="") as text:
        reader = csv.reader(text)
        header = next(reader, None)
        url_idx = 1
        if header:
            lowered = [h.strip().lower() for h in header]
            if "url" in lowered:
                url_idx = lowered.index("url")
            else:
                if len(header) > url_idx and header[url_idx].strip():
                    yield header[url_idx].strip()
                url_idx = 1

        for row in reader:
            if not row or len(row) <= url_idx:
                continue
            u = row[url_idx].strip()
            if u:
                yield u


def download_phishtank_csv_gz(*, cfg: SourceConfig, cache_dir: str | None = None) -> Iterator[str]:
    """
    Stream-parse `online-valid.csv.gz` and yield verified phishing URLs.
    Columns include: phish_id,url,phish_detail_url,...
    """
    cache_file = None
    if cache_dir:
        os.makedirs(cache_dir, exist_ok=True)
        cache_file = _cache_path(cache_dir, "phishtank_online-valid.csv.gz")

    # First try live download; if rate-limited and cache exists, fallback to cache.
    try:
        resp = requests.get(
            cfg.phish_tank_url_csv_gz,
            headers={"User-Agent": cfg.user_agent},
            timeout=cfg.timeout_s,
            stream=True,
        )
        resp.raise_for_status()

        if cache_file:
            with open(cache_file, "wb") as f:
                for chunk in resp.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        f.write(chunk)
            yield from _iter_urls_from_gz_file(cache_file)
            return

        gz = gzip.GzipFile(fileobj=resp.raw)
        text = io.TextIOWrapper(gz, encoding="utf-8", newline="")
        reader = csv.reader(text)
        header = next(reader, None)
        url_idx = 1
        if header:
            lowered = [h.strip().lower() for h in header]
            if "url" in lowered:
                url_idx = lowered.index("url")
            elif len(header) > url_idx and header[url_idx].strip():
                yield header[url_idx].strip()
        for row in reader:
            if row and len(row) > url_idx and row[url_idx].strip():
                yield row[url_idx].strip()
        return
    except requests.HTTPError as err:
        status = getattr(err.response, "status_code", None)
        if status == 429 and cache_file and os.path.exists(cache_file):
            yield from _iter_urls_from_gz_file(cache_file)
            return
        if status == 429:
            raise RuntimeError(
                "PhishTank returned 429 (rate limit). Re-run later or provide cached file at "
                "MLPipeline/cache/phishtank_online-valid.csv.gz."
            ) from err
        raise

