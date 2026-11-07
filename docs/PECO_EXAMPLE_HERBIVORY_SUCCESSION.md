# PECO example: insect herbivory and succession predictability

Paste-ready definition for an Evidence Synthesis project.

## Research question

Does insect herbivory decrease compositional dissimilarity among successional communities (increase predictability of succession) relative to reduced or absent herbivory?

## PECO

| Slot | Definition |
|------|------------|
| **P**opulation | Successional plant communities (replicates or sites moving through succession after a shared starting condition / disturbance) |
| **E**xposure | Herbivorous insects / insect herbivory |
| **C**omparator | Reduced, excluded, or low insect herbivory (exclosures, insecticide, naturally low herbivory, “no outbreak”) |
| **O**utcome | Lower compositional dissimilarity among successional communities over time (more similar communities = more predictable succession). Prefer metrics such as Bray–Curtis, Jaccard, Sørensen, or multivariate dispersion among replicates/trajectories |

### Form fields (UI / API)

- **Population:** Successional plant communities
- **Exposure:** Insect herbivory (herbivorous insects)
- **Comparator:** Reduced or excluded insect herbivory
- **Outcome:** Lower compositional dissimilarity among successional communities (succession predictability)

## Inclusion and screening

- **Prefer:** experimental manipulations of insect herbivory (exclosures, insecticide, herbivore addition/removal) with successional community composition followed over time.
- **Also include:** longitudinal observational studies that link herbivory intensity to temporal change in among-community (or among-replicate) dissimilarity.
- **Exclude (unless scope is widened later):** single-time-point surveys with no temporal succession; papers that only report richness/biomass with no compositional dissimilarity or trajectory similarity.

## Outcome extraction hints

When extracting assertions, prefer:

- Dissimilarity index used (Bray–Curtis, Jaccard, Sørensen, etc.)
- Whether dissimilarity **decreased** under herbivory vs control (direction of effect on predictability)
- Time span of succession monitoring
- Comparison grain: among replicates at the same stage (convergence), among sites, or among trajectories

## Clarification note

“Lower dissimilarity” can mean:

1. **Among experimental replicates at the same stage** (convergence / predictability across replicates), or
2. **Between successive years for the same site** (temporal stability)

State which grain you want in the project notes so screening stays consistent.
