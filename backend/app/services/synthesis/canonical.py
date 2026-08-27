"""Entity canonicalization (GBIF/ENVO/local vocab)."""

from __future__ import annotations

import logging
import re
import uuid
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

import httpx
from sqlalchemy.orm import Session

from app.models.database_models import Assertion, Entity

logger = logging.getLogger(__name__)

# Lightweight ENVO-ish biome aliases for offline grounding
ENVO_ALIASES: Dict[str, Tuple[str, str]] = {
    "arctic": ("ENVO:01000179", "arctic biome"),
    "tundra": ("ENVO:01000180", "tundra biome"),
    "temperate forest": ("ENVO:01000174", "temperate broadleaf forest biome"),
    "temperate broadleaf": ("ENVO:01000174", "temperate broadleaf forest biome"),
    "tropical forest": ("ENVO:01000196", "tropical rainforest biome"),
    "rainforest": ("ENVO:01000196", "tropical rainforest biome"),
    "grassland": ("ENVO:01000177", "temperate grassland biome"),
    "savanna": ("ENVO:01000178", "tropical savanna biome"),
    "desert": ("ENVO:01000176", "desert biome"),
    "marine": ("ENVO:01000051", "marine biome"),
    "freshwater": ("ENVO:01000297", "freshwater biome"),
    "wetland": ("ENVO:00000043", "wetland"),
    "rangeland": ("ENVO:01001369", "rangeland"),
}

PLATFORM_ALIASES: Dict[str, str] = {
    "drone": "multirotor_uas",
    "uas": "multirotor_uas",
    "uav": "multirotor_uas",
    "multirotor": "multirotor_uas",
    "quadcopter": "multirotor_uas",
    "fixed-wing": "fixed-wing_uas",
    "fixed wing": "fixed-wing_uas",
    "camera trap": "camera_trap",
}


class CanonicalizationService:
    @staticmethod
    def canonicalize_project(db: Session, project_id: str) -> Dict[str, Any]:
        assertions = db.query(Assertion).filter(Assertion.project_id == project_id).all()
        entities_created = 0
        grounded = 0

        for assertion in assertions:
            for role in ("subject", "object"):
                mention = getattr(assertion, role) or {}
                if not isinstance(mention, dict):
                    continue
                surface = (mention.get("surface") or "").strip()
                if not surface:
                    continue
                entity_type = mention.get("entity_type") or _infer_type(surface, role, assertion)
                entity, was_new, was_grounded = CanonicalizationService._resolve_entity(
                    db, project_id, surface, entity_type
                )
                if was_new:
                    entities_created += 1
                if was_grounded:
                    grounded += 1
                mention["canonical_id"] = entity.canonical_id or entity.id
                mention["canonical_label"] = entity.label
                mention["entity_type"] = entity.entity_type
                setattr(assertion, role, mention)

            # Qualifier normalization
            quals = assertion.qualifiers or {}
            if quals.get("platform"):
                quals["platform"] = _normalize_platform(str(quals["platform"]))
            for env in quals.get("environment") or []:
                if isinstance(env, dict) and env.get("surface"):
                    ent, _, _ = CanonicalizationService._resolve_entity(
                        db, project_id, env["surface"], "biome"
                    )
                    env["canonical_id"] = ent.canonical_id or ent.id
                    env["canonical_label"] = ent.label
            for tax in quals.get("taxon") or []:
                if isinstance(tax, dict) and tax.get("surface"):
                    ent, _, _ = CanonicalizationService._resolve_entity(
                        db, project_id, tax["surface"], "taxon"
                    )
                    tax["canonical_id"] = ent.canonical_id or ent.id
                    tax["canonical_label"] = ent.label
            assertion.qualifiers = quals

            # Refresh verbalized
            subj = (assertion.subject or {}).get("canonical_label") or (
                assertion.subject or {}
            ).get("surface")
            obj = (assertion.object or {}).get("canonical_label") or (
                assertion.object or {}
            ).get("surface")
            assertion.verbalized = f"{subj} {assertion.predicate} {obj}; {assertion.direction}"

        db.commit()
        return {
            "assertions_processed": len(assertions),
            "entities_created": entities_created,
            "grounded": grounded,
        }

    @staticmethod
    def _resolve_entity(
        db: Session, project_id: str, surface: str, entity_type: str
    ) -> Tuple[Entity, bool, bool]:
        norm = _normalize_label(surface)
        # Match existing by alias or label
        existing = (
            db.query(Entity)
            .filter(Entity.project_id == project_id, Entity.entity_type == entity_type)
            .all()
        )
        for ent in existing:
            aliases = {_normalize_label(a) for a in (ent.aliases or [])}
            aliases.add(_normalize_label(ent.label))
            if norm in aliases:
                if surface not in (ent.aliases or []) and _normalize_label(surface) != _normalize_label(
                    ent.label
                ):
                    aliases_list = list(ent.aliases or [])
                    aliases_list.append(surface)
                    ent.aliases = aliases_list
                    db.add(ent)
                return ent, False, bool(ent.canonical_id)

        canonical_id = None
        authority = None
        label = surface
        grounded = False

        if entity_type == "taxon":
            hit = _gbif_lookup(surface)
            if hit:
                canonical_id = f"GBIF:{hit['key']}"
                label = hit.get("scientificName") or surface
                authority = "GBIF"
                grounded = True
        elif entity_type in {"biome", "environment"}:
            hit = _envo_lookup(surface)
            if hit:
                canonical_id, label = hit
                authority = "ENVO"
                grounded = True
        elif entity_type == "platform":
            label = _normalize_platform(surface)
            canonical_id = f"local:platform:{label}"
            authority = "local"
            grounded = True

        ent = Entity(
            id=str(uuid.uuid4()),
            project_id=project_id,
            entity_type=entity_type,
            label=label,
            canonical_id=canonical_id,
            aliases=[surface] if _normalize_label(surface) != _normalize_label(label) else [],
            authority=authority,
        )
        db.add(ent)
        db.flush()
        return ent, True, grounded


def _normalize_label(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _normalize_platform(text: str) -> str:
    n = _normalize_label(text)
    for alias, canon in PLATFORM_ALIASES.items():
        if alias in n:
            return canon
    return n.replace(" ", "_")


def _infer_type(surface: str, role: str, assertion: Assertion) -> str:
    quals = assertion.qualifiers or {}
    if role == "subject" and quals.get("platform"):
        return "platform"
    if any(k in surface.lower() for k in ("drone", "uas", "uav", "robot")):
        return "platform"
    if role == "object" and quals.get("response_variable"):
        return "response_variable"
    return "other"


def _gbif_lookup(name: str) -> Optional[Dict[str, Any]]:
    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(
                "https://api.gbif.org/v1/species/match",
                params={"name": name, "strict": False},
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            if data.get("matchType") in {"EXACT", "FUZZY"} and data.get("usageKey"):
                return {
                    "key": data["usageKey"],
                    "scientificName": data.get("scientificName") or name,
                }
    except Exception as exc:  # noqa: BLE001
        logger.debug("GBIF lookup failed for %s: %s", name, exc)
    return None


def _envo_lookup(name: str) -> Optional[Tuple[str, str]]:
    n = _normalize_label(name)
    for alias, (cid, label) in ENVO_ALIASES.items():
        if alias in n or n in alias:
            return cid, label
    return None
