from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Iterator

import requests


@dataclass(frozen=True)
class SourceConfig:
    # OpenPhish community feed (free): newline-separated URLs
    community_feed_url: str = "https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt"
    timeout_s: float = 120.0
    user_agent: str = "phisx-mlpipeline/1.0 (github.com/your-org; contact=security@example.com)"


def download_openphish_community_feed(*, cfg: SourceConfig) -> Iterator[str]:
    resp = requests.get(cfg.community_feed_url, headers={"User-Agent": cfg.user_agent}, timeout=cfg.timeout_s)
    resp.raise_for_status()
    # Text format: one URL per line
    for line in resp.text.splitlines():
        u = line.strip()
        if not u:
            continue
        yield u

