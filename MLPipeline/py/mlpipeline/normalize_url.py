from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, Optional, Tuple
from urllib.parse import urlparse, urlunparse

import tldextract


def _ensure_scheme(url: str) -> str:
    u = str(url or "").strip()
    if not u:
        return u
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+\-.]*://", u):
        # Default to https if scheme missing
        return f"https://{u}"
    return u


@dataclass(frozen=True)
class NormalizedUrl:
    original: str
    canonical: str
    host: str
    registrable_domain: str
    path: str


def normalize_url_for_dedup(raw_url: str) -> Optional[NormalizedUrl]:
    s = _ensure_scheme(raw_url)
    try:
        p = urlparse(s)
    except Exception:
        return None

    host = (p.netloc or "").strip().lower()
    if not host:
        return None

    # Remove default ports
    if host.endswith(":80"):
        host = host[:-3]
    if host.endswith(":443"):
        host = host[:-4]

    ext = tldextract.extract(host)
    registrable = ".".join([part for part in [ext.domain, ext.suffix] if part])
    registrable = registrable.lower() if registrable else host

    path = p.path or "/"
    # canonical for dedup: scheme + host + path; keep query out to avoid tracking param duplication
    canonical = urlunparse((p.scheme.lower() or "https", host, path, "", "", ""))

    return NormalizedUrl(
        original=str(raw_url),
        canonical=canonical,
        host=host,
        registrable_domain=registrable,
        path=path,
    )


def url_to_safe_domain(url: str) -> str:
    n = normalize_url_for_dedup(url)
    return n.registrable_domain if n else ""

