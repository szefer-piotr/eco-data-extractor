"""Built-in extraction templates for evidence synthesis."""

from __future__ import annotations

from typing import Dict, List

from app.models.synthesis_models import ExtractionTemplate, TemplateField

UAS_BIODIVERSITY_V1 = ExtractionTemplate(
    id="uas_biodiversity_v1",
    name="Autonomous Biodiversity Monitoring",
    version="1.0",
    description=(
        "Case Study 1 template: UAS/drone/robot monitoring of wildlife and habitats. "
        "Aligned with Krishna Moorthy et al. ecological literature review pipeline."
    ),
    predicates=[
        "affects",
        "increases",
        "decreases",
        "has_no_effect_on",
        "measures",
        "estimates",
        "is_validated_against",
        "outperforms",
        "is_limited_by",
        "detects",
        "monitors",
    ],
    fields=[
        TemplateField(
            name="platform",
            description="Monitoring platform (fixed-wing UAS, multirotor, ground robot, etc.)",
            required=True,
            allowed_values=[
                "fixed-wing_uas",
                "multirotor_uas",
                "ground_robot",
                "underwater_robot",
                "satellite",
                "camera_trap",
                "other",
            ],
            prompt_hint="Extract the autonomous/remote sensing platform used.",
        ),
        TemplateField(
            name="sensor",
            description="Sensor modality",
            required=False,
            allowed_values=["RGB", "thermal", "LiDAR", "multispectral", "AQS", "acoustic", "other"],
        ),
        TemplateField(
            name="target_taxon",
            description="Species or taxonomic group studied",
            required=True,
        ),
        TemplateField(
            name="biome",
            description="Biome or habitat type (prefer ENVO-compatible terms)",
            required=False,
        ),
        TemplateField(
            name="study_design",
            description="Study design",
            required=False,
            allowed_values=[
                "experimental",
                "BACI",
                "observational",
                "modelling",
                "review",
                "meta-analysis",
            ],
        ),
        TemplateField(
            name="response_variable",
            description="Outcome measured (vigilance, density, detection probability, etc.)",
            required=True,
        ),
        TemplateField(
            name="direction",
            description="Direction of effect of exposure/platform on outcome",
            required=False,
            allowed_values=["increase", "decrease", "no_effect", "mixed", "not_applicable"],
        ),
        TemplateField(
            name="effect_size",
            description="Numeric effect size if reported (must quote verbatim)",
            required=False,
        ),
        TemplateField(
            name="sample_size",
            description="Sample size if reported",
            required=False,
        ),
        TemplateField(
            name="location",
            description="Study location / geography",
            required=False,
        ),
    ],
    peco_slots=["population", "exposure", "comparator", "outcome"],
)

PROTECTED_AREA_V1 = ExtractionTemplate(
    id="protected_area_v1",
    name="Protected Area Effectiveness",
    version="1.0",
    description="Case Study 2 template: evidence synthesis for terrestrial protected areas.",
    predicates=[
        "increases",
        "decreases",
        "has_no_effect_on",
        "protects",
        "reduces_threat_to",
    ],
    fields=[
        TemplateField(name="protected_area_type", description="Type of protected area", required=True),
        TemplateField(name="target_taxon", description="Taxon or biodiversity metric", required=True),
        TemplateField(name="biome", description="Biome", required=False),
        TemplateField(name="outcome_metric", description="Effectiveness outcome", required=True),
        TemplateField(
            name="direction",
            description="Direction of effect",
            allowed_values=["increase", "decrease", "no_effect", "mixed", "not_applicable"],
        ),
        TemplateField(name="effect_size", description="Effect size with verbatim quote", required=False),
        TemplateField(name="study_design", description="Study design", required=False),
    ],
)

TEMPLATES: Dict[str, ExtractionTemplate] = {
    UAS_BIODIVERSITY_V1.id: UAS_BIODIVERSITY_V1,
    PROTECTED_AREA_V1.id: PROTECTED_AREA_V1,
}


def get_template(template_id: str) -> ExtractionTemplate:
    if template_id not in TEMPLATES:
        raise KeyError(f"Unknown template: {template_id}")
    return TEMPLATES[template_id]


def list_templates() -> List[ExtractionTemplate]:
    return list(TEMPLATES.values())
