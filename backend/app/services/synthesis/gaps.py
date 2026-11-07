"""Gap detection over the comparison hypercube."""

from __future__ import annotations

import uuid
from collections import Counter, defaultdict
from typing import Any, Dict, List, Set, Tuple

from sqlalchemy.orm import Session

from app.models.database_models import Assertion, GapRecordDB, Work
from app.models.synthesis_models import GapRecord, GapType
from app.services.synthesis.comparison import ComparisonService


class GapService:
    @staticmethod
    def detect_gaps(db: Session, project_id: str) -> List[GapRecord]:
        db.query(GapRecordDB).filter(GapRecordDB.project_id == project_id).delete()
        db.commit()

        table = ComparisonService.build_table(db, project_id)
        gaps: List[GapRecord] = []

        # Occupancy over platform x taxon x biome x response
        axes_keys = ["platform", "target_taxon", "biome", "response_variable"]
        observed: Set[Tuple] = set()
        marginals: Dict[str, Counter] = {k: Counter() for k in axes_keys}
        quality_cells: Dict[Tuple, List[str]] = defaultdict(list)

        for row in table.rows:
            cells = row.cells or {}
            key = tuple(cells.get(k) or "UNKNOWN" for k in axes_keys)
            if any(v == "UNKNOWN" for v in key):
                continue
            observed.add(key)
            for i, k in enumerate(axes_keys):
                marginals[k][key[i]] += 1
            quality_cells[key].append(row.work_id)

        # Coverage gaps: combinations suggested by marginals but missing
        platforms = [x for x, _ in marginals["platform"].most_common(8)]
        taxa = [x for x, _ in marginals["target_taxon"].most_common(8)]
        biomes = [x for x, _ in marginals["biome"].most_common(8)]
        responses = [x for x, _ in marginals["response_variable"].most_common(8)]

        for p in platforms:
            for t in taxa:
                for b in biomes or ["UNKNOWN"]:
                    for r in responses:
                        key = (p, t, b, r)
                        if key in observed:
                            continue
                        # Require that each axis value appears elsewhere
                        if not (
                            marginals["platform"][p]
                            and marginals["target_taxon"][t]
                            and marginals["response_variable"][r]
                        ):
                            continue
                        # Prefer gaps where other axes co-occur with partners
                        severity = 0.4
                        if biomes and b != "UNKNOWN" and marginals["biome"][b]:
                            severity = 0.7
                        gap = GapService._save(
                            db,
                            project_id,
                            GapType.coverage,
                            (
                                f"No studies cover platform={p}, taxon={t}, "
                                f"biome={b}, response={r}"
                            ),
                            severity,
                            {
                                "platform": p,
                                "target_taxon": t,
                                "biome": b,
                                "response_variable": r,
                            },
                            f"Test whether {p} affects {r} in {t} within {b}",
                            {"observed_cells": len(observed)},
                        )
                        gaps.append(gap)

        # Quality gaps: n=1
        for key, work_ids in quality_cells.items():
            if len(set(work_ids)) == 1:
                gap = GapService._save(
                    db,
                    project_id,
                    GapType.quality,
                    f"Only one study for {dict(zip(axes_keys, key))}",
                    0.5,
                    dict(zip(axes_keys, key)),
                    "Replicate this finding with an independent study",
                    {"n_studies": 1},
                )
                gaps.append(gap)

        # Temporal gaps: no studies after year Y while earlier studies exist
        years = [r.year for r in table.rows if r.year]
        if years:
            max_year = max(years)
            recent = [y for y in years if y >= max_year - 2]
            if len(recent) == 0 and max_year < 2024:
                gap = GapService._save(
                    db,
                    project_id,
                    GapType.temporal,
                    f"No studies after {max_year}; literature may be outdated",
                    0.6,
                    {"last_year": max_year},
                    f"Update the evidence base with studies after {max_year}",
                    {"year_histogram": dict(Counter(years))},
                )
                gaps.append(gap)

        # Contradiction gaps from contested clusters
        for report in ComparisonService.contradiction_reports(db, project_id):
            gap = GapService._save(
                db,
                project_id,
                GapType.contradiction,
                report["summary"],
                0.8,
                {"cluster_id": report["cluster_id"]},
                "Resolve disagreement via moderator analysis or new targeted study",
                {
                    "supporting": report["supporting"],
                    "opposing": report["opposing"],
                    "moderators": report["possible_moderators"],
                },
            )
            gaps.append(gap)

        db.commit()
        # Cap coverage gaps for usability
        coverage = [g for g in gaps if g.gap_type == GapType.coverage]
        others = [g for g in gaps if g.gap_type != GapType.coverage]
        coverage = sorted(coverage, key=lambda g: -g.severity)[:40]
        return others + coverage

    @staticmethod
    def list_gaps(db: Session, project_id: str) -> List[GapRecord]:
        rows = db.query(GapRecordDB).filter(GapRecordDB.project_id == project_id).all()
        return [
            GapRecord(
                id=r.id,
                project_id=r.project_id,
                gap_type=GapType(r.gap_type),
                description=r.description,
                severity=r.severity or 0.5,
                axes=r.axes or {},
                suggested_research_angle=r.suggested_research_angle,
                supporting_stats=r.supporting_stats or {},
            )
            for r in rows
        ]

    @staticmethod
    def heatmap(db: Session, project_id: str) -> Dict[str, Any]:
        """Return a 2D occupancy matrix: platform x target_taxon."""
        table = ComparisonService.build_table(db, project_id)
        platforms: Set[str] = set()
        taxa: Set[str] = set()
        counts: Dict[Tuple[str, str], int] = Counter()
        for row in table.rows:
            p = (row.cells or {}).get("platform") or "UNKNOWN"
            t = (row.cells or {}).get("target_taxon") or "UNKNOWN"
            platforms.add(p)
            taxa.add(t)
            counts[(p, t)] += 1
        p_list = sorted(platforms)
        t_list = sorted(taxa)
        matrix = [[counts.get((p, t), 0) for t in t_list] for p in p_list]
        return {
            "row_axis": "platform",
            "col_axis": "target_taxon",
            "rows": p_list,
            "cols": t_list,
            "matrix": matrix,
        }

    @staticmethod
    def _save(
        db: Session,
        project_id: str,
        gap_type: GapType,
        description: str,
        severity: float,
        axes: Dict[str, Any],
        angle: str,
        stats: Dict[str, Any],
    ) -> GapRecord:
        record = GapRecordDB(
            id=str(uuid.uuid4()),
            project_id=project_id,
            gap_type=gap_type.value,
            description=description,
            severity=severity,
            axes=axes,
            suggested_research_angle=angle,
            supporting_stats=stats,
        )
        db.add(record)
        return GapRecord(
            id=record.id,
            project_id=project_id,
            gap_type=gap_type,
            description=description,
            severity=severity,
            axes=axes,
            suggested_research_angle=angle,
            supporting_stats=stats,
        )
