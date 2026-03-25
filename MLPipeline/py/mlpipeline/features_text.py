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


FEATURE_NAMES: List[str] = ["urgency_hit", "brand_hit", "login_hit", "text_len", "num_links"]


def featurize_text(text: str) -> Tuple[List[float], Dict[str, float]]:
    t = str(text or "")
    urgency = 1.0 if any(p.search(t) for p in URGENCY_PATTERNS) else 0.0
    brand = 1.0 if any(p.search(t) for p in BRAND_PATTERNS) else 0.0
    login = 1.0 if any(p.search(t) for p in LOGIN_PATTERNS) else 0.0
    num_links = float(len(re.findall(r"https?://\S+", t, flags=re.I)))
    feats = [urgency, brand, login, float(len(t)), num_links]
    return feats, dict(zip(FEATURE_NAMES, feats))

