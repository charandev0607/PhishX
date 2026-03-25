from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from typing import Iterator, List, Optional

import requests


@dataclass(frozen=True)
class SourceConfig:
    majestic_csv_url: str = "http://downloads.majestic.com/majestic_million.csv"
    timeout_s: float = 120.0
    user_agent: str = "phisx-mlpipeline/1.0 (github.com/your-org; contact=security@example.com)"


def _pick_domain_column(fieldnames: List[str]) -> Optional[str]:
    lowered = {f.lower(): f for f in fieldnames}
    # Common cases in the wild
    for key in ["domain", "domain_name", "root domain", "root_domain", "domain_name "]:
        if key in lowered:
            return lowered[key]
    return None


def download_majestic_million_domains(*, cfg: SourceConfig, limit: Optional[int] = None) -> Iterator[str]:
    resp = requests.get(
        cfg.majestic_csv_url,
        headers={"User-Agent": cfg.user_agent},
        timeout=cfg.timeout_s,
        stream=True,
    )
    resp.raise_for_status()
    # Stream parse: use per-line CSV parsing to avoid closed-stream issues.
    lines = resp.iter_lines(decode_unicode=True)
    header = next(lines, None)
    if not header:
        return

    fieldnames = next(csv.reader([header]))
    # Detect domain column from header
    domain_col = _pick_domain_column(fieldnames) if isinstance(fieldnames, list) else None
    if not domain_col:
        domain_col = fieldnames[0] if fieldnames else None
    if not domain_col:
        return

    # Column index in the row arrays
    domain_idx = fieldnames.index(domain_col) if domain_col in fieldnames else 0

    count = 0
    for line in lines:
        if not line:
            continue
        row = next(csv.reader([line]))
        if len(row) <= domain_idx:
            continue
        d = (row[domain_idx] or "").strip().lower()
        if not d or d.startswith("http"):
            continue
        if "." not in d:
            continue
        yield d
        count += 1
        if limit is not None and count >= limit:
            break

