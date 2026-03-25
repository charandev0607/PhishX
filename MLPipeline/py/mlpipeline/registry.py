from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class ModelCard:
    name: str
    version: str
    created_at: str
    framework: str
    feature_names: list[str]
    threshold: float
    metrics: Dict[str, float]
    notes: str = ""


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def artifact_dir(repo_root: Path) -> Path:
    # Keep all ML assets scoped inside MLPipeline to avoid cross-module conflicts.
    return repo_root / "MLPipeline" / "artifacts"


def save_model_bundle(
    *,
    repo_root: Path,
    model_name: str,
    version: str,
    model_obj: Any,
    card: ModelCard,
    extra: Optional[Dict[str, Any]] = None,
) -> Path:
    import joblib

    base = artifact_dir(repo_root) / model_name / version
    base.mkdir(parents=True, exist_ok=True)

    joblib.dump(model_obj, base / "model.joblib")
    (base / "model_card.json").write_text(json.dumps(asdict(card), indent=2), encoding="utf-8")
    if extra is not None:
        (base / "extra.json").write_text(json.dumps(extra, indent=2), encoding="utf-8")

    # Update latest pointer
    latest = artifact_dir(repo_root) / model_name / "latest.json"
    latest.write_text(
        json.dumps({"version": version, "updated_at": utc_now_iso()}, indent=2),
        encoding="utf-8",
    )

    # Append changelog
    changelog = artifact_dir(repo_root) / model_name / "CHANGELOG.md"
    entry = f"## {version}\n- Created: {card.created_at}\n- Metrics: {card.metrics}\n- Notes: {card.notes}\n\n"
    if changelog.exists():
        changelog.write_text(changelog.read_text(encoding="utf-8") + entry, encoding="utf-8")
    else:
        changelog.write_text(f"# {model_name} changelog\n\n{entry}", encoding="utf-8")

    return base

