from __future__ import annotations

import re
from typing import Dict, List, Tuple


URGENCY_PATTERNS = [
    re.compile(r"\burgent\b", re.I),
    re.compile(r"\bimmediately\b", re.I),
    re.compile(r"\baction required\b", re.I),
    re.compile(r"\baccount (?:suspended|locked|limited)\b", re.I),
    re.compile(r"\bverify (?:your )?account\b", re.I),
    re.compile(r"\breset (?:your )?password\b", re.I),
    re.compile(r"\bsecurity alert\b", re.I),
]

THREAT_PATTERNS = [
    re.compile(r"\bcredential(?:s)?\b", re.I),
    re.compile(r"\bsuspended\b", re.I),
    re.compile(r"\blocked\b", re.I),
    re.compile(r"\bpayment\b", re.I),
    re.compile(r"\bbilling\b", re.I),
    re.compile(r"\bwallet\b", re.I),
    re.compile(r"\bcrypto\b", re.I),
]

BRAND_PATTERNS = [
    re.compile(r"\bpaypal\b", re.I),
    re.compile(r"\bmicrosoft\b", re.I),
    re.compile(r"\boffice365\b", re.I),
    re.compile(r"\boutlook\b", re.I),
    re.compile(r"\bgoogle\b", re.I),
    re.compile(r"\bgmail\b", re.I),
    re.compile(r"\bapple id\b", re.I),
    re.compile(r"\bamazon\b", re.I),
    re.compile(r"\bbank\b", re.I),
    re.compile(r"\bcredit card\b", re.I),
]

LOGIN_PATTERNS = [
    re.compile(r"\bsign in\b", re.I),
    re.compile(r"\blog in\b", re.I),
    re.compile(r"\bpassword\b", re.I),
    re.compile(r"\botp\b", re.I),
    re.compile(r"\b2fa\b", re.I),
    re.compile(r"\bsecurity code\b", re.I),
]


FEATURE_NAMES: List[str] = [
    "urgency_hits",
    "brand_hits",
    "login_hits",
    "threat_hits",
    "text_len",
    "num_links",
    "num_exclamations",
    "num_digits",
    "uppercase_ratio",
    "avg_token_len",
    "has_domain_like_text",
]


def featurize_text(text: str) -> Tuple[List[float], Dict[str, float]]:
    t = str(text or "")
    urgency = float(sum(1 for p in URGENCY_PATTERNS if p.search(t)))
    brand = float(sum(1 for p in BRAND_PATTERNS if p.search(t)))
    login = float(sum(1 for p in LOGIN_PATTERNS if p.search(t)))
    threat = float(sum(1 for p in THREAT_PATTERNS if p.search(t)))
    num_links = float(len(re.findall(r"https?://\S+", t, flags=re.I)))
    num_exclamations = float(t.count("!"))
    num_digits = float(len(re.findall(r"\d", t)))
    letters = [ch for ch in t if ch.isalpha()]
    uppercase_ratio = float(sum(1 for ch in letters if ch.isupper()) / len(letters)) if letters else 0.0
    tokens = re.findall(r"[A-Za-z0-9]+", t)
    avg_token_len = float(sum(len(token) for token in tokens) / len(tokens)) if tokens else 0.0
    has_domain_like_text = 1.0 if re.search(r"\b[a-z0-9-]+\.(?:com|net|org|io|co|top|xyz|ru|cn)\b", t, re.I) else 0.0
    feats = [
        urgency,
        brand,
        login,
        threat,
        float(len(t)),
        num_links,
        num_exclamations,
        num_digits,
        uppercase_ratio,
        avg_token_len,
        has_domain_like_text,
    ]
    return feats, dict(zip(FEATURE_NAMES, feats))

