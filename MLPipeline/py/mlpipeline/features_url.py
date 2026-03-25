from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Dict, List, Tuple
from urllib.parse import urlparse

import tldextract


SUSPICIOUS_WORDS = [
    "login",
    "verify",
    "account",
    "secure",
    "update",
    "password",
    "bank",
    "paypal",
    "microsoft",
    "google",
    "apple",
    "amazon",
    "support",
    "confirm",
    "billing",
]


def _entropy(s: str) -> float:
    if not s:
        return 0.0
    freq: Dict[str, int] = {}
    for ch in s:
        freq[ch] = freq.get(ch, 0) + 1
    e = 0.0
    n = len(s)
    for v in freq.values():
        p = v / n
        e -= p * math.log2(p)
    return float(round(e, 4))


def _count(s: str, pat: re.Pattern[str]) -> int:
    return len(pat.findall(s))


@dataclass(frozen=True)
class UrlFeatures:
    url_len: float
    host_len: float
    path_len: float
    query_len: float
    num_digits: float
    num_special: float
    num_dots: float
    num_dashes: float
    num_ats: float
    subdomain_count: float
    path_depth: float
    has_ip_host: float
    is_https: float
    has_punycode: float
    entropy: float
    suspicious_word_hits: float
    registrable_len: float
    tld_len: float


FEATURE_NAMES: List[str] = [f.name for f in UrlFeatures.__dataclass_fields__.values()]  # type: ignore[attr-defined]


def featurize_url(raw_url: str) -> Tuple[List[float], Dict[str, float]]:
    u = urlparse(raw_url)
    host = (u.hostname or "").lower()
    path = u.path or ""
    query = u.query or ""

    ext = tldextract.extract(host)
    registrable = (".".join([p for p in [ext.domain, ext.suffix] if p]) or host).lower()

    num_special = _count(raw_url, re.compile(r"[^a-zA-Z0-9/:.?=&_-]"))
    num_digits = _count(raw_url, re.compile(r"\d"))
    num_dots = host.count(".")
    num_dashes = _count(host + path, re.compile(r"-"))
    num_ats = raw_url.count("@")

    host_parts = [p for p in host.split(".") if p]
    subdomain_count = max(0, len(host_parts) - 2)
    path_depth = len([p for p in path.split("/") if p])

    has_ip = 1.0 if re.fullmatch(r"\d{1,3}(\.\d{1,3}){3}", host or "") else 0.0
    is_https = 1.0 if (u.scheme or "").lower() == "https" else 0.0
    has_puny = 1.0 if "xn--" in host else 0.0
    suspicious_hits = float(sum(1 for w in SUSPICIOUS_WORDS if w in raw_url.lower()))

    feats = UrlFeatures(
        url_len=float(len(raw_url)),
        host_len=float(len(host)),
        path_len=float(len(path)),
        query_len=float(len(query)),
        num_digits=float(num_digits),
        num_special=float(num_special),
        num_dots=float(num_dots),
        num_dashes=float(num_dashes),
        num_ats=float(num_ats),
        subdomain_count=float(subdomain_count),
        path_depth=float(path_depth),
        has_ip_host=float(has_ip),
        is_https=float(is_https),
        has_punycode=float(has_puny),
        entropy=float(_entropy(host + path + query)),
        suspicious_word_hits=float(suspicious_hits),
        registrable_len=float(len(registrable)),
        tld_len=float(len(ext.suffix or "")),
    )

    vec = [getattr(feats, name) for name in FEATURE_NAMES]
    as_dict = {name: float(getattr(feats, name)) for name in FEATURE_NAMES}
    return vec, as_dict

