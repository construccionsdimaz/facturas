# Estimate Engine Current State Audit

Legend:
- `EXISTS_AND_CANONICAL`
- `EXISTS_BUT_LEGACY`
- `EXISTS_BUT_PARTIAL`
- `MISSING`

## Discovery / Project Context
| File | Status | Notes |
| --- | --- | --- |
| `src/lib/discovery/types.ts` | EXISTS_AND_CANONICAL | Main domain model for discovery session, spatial model, execution context, derived input. |
| `src/lib/discovery/defaults.ts` | EXISTS_AND_CANONICAL | Seeds default discovery session data and structured defaults. |
| `src/lib/discovery/catalogs.ts` | EXISTS_AND_CANONICAL | Shared labels/constants/compatibility mappings. |
| `src/lib/discovery/guard.ts` | EXISTS_BUT_PARTIAL | Validates readiness/completeness, but remains wizard-oriented. |
| `src/lib/discovery/summary.ts` | EXISTS_BUT_PARTIAL | Human-readable summary layer, not canonical engine logic. |
| `src/app/estimates/discovery/DiscoveryWizard.tsx` | EXISTS_BUT_PARTIAL | Operational UI, but still form-first rather than contract-first. |
| `src/app/estimates/discovery/page.tsx` | EXISTS_BUT_PARTIAL | Discovery page wrapper only. |

## Spatial Model
| File | Status | Notes |
| --- | --- | --- |
| `src/lib/discovery/resolve-spatial-model.ts` | EXISTS_AND_CANONICAL | Official spatial resolution layer and compatibility builder. |
| `src/app/estimates/discovery/StructuredSpatialEditor.tsx` | EXISTS_BUT_PARTIAL | Operational structured UI for floors/groups/instances, still MVP UX. |

## Technical Spec
| File | Status | Notes |
| --- | --- | --- |
| `src/lib/discovery/technical-spec-types.ts` | EXISTS_AND_CANONICAL | Official MVP vertical solution-code contract. |
| `src/lib/discovery/technical-spec-defaults.ts` | EXISTS_AND_CANONICAL | Defaulting/hydration of technical spec model. |
| `src/lib/discovery/resolve-technical-spec.ts` | EXISTS_AND_CANONICAL | Resolved spec inheritance and trace layer. |
| `src/app/estimates/discovery/TechnicalSpecEditor.tsx` | EXISTS_BUT_PARTIAL | MVP vertical editor; not full technical authoring system yet. |

## Derived Input / Orchestration
| File | Status | Notes |
| --- | --- | --- |
| `src/lib/discovery/derive-input.ts` | EXISTS_AND_CANONICAL | Current orchestration bridge from discovery session to execution/measurement/recipe outputs. |

## Measurement
| File | Status | Notes |
| --- | --- | --- |
| `src/lib/estimate/measurement-types.ts` | EXISTS_AND_CANONICAL | Canonical measurement result types. |
| `src/lib/estimate/measurement-engine.ts` | EXISTS_AND_CANONICAL | Strict MVP measurement engine with trace and blocking rules. |

## Recipe
| File | Status | Notes |
| --- | --- | --- |
| `src/lib/estimate/recipe-types.ts` | EXISTS_AND_CANONICAL | Canonical recipe result types for MVP vertical. |
| `src/lib/estimate/recipe-engine.ts` | EXISTS_AND_CANONICAL | MVP recipe engine from measurement + execution context. |

## Pricing
| File | Status | Notes |
| --- | --- | --- |
| `src/lib/estimate/pricing-types.ts` | EXISTS_AND_CANONICAL | Canonical pricing result types. |
| `src/lib/estimate/pricing-engine.ts` | EXISTS_AND_CANONICAL | MVP pricing engine with source trace and coverage states. |

## Estimate Integration / Commercial Governance
| File | Status | Notes |
| --- | --- | --- |
| `src/lib/estimate/estimate-integration.ts` | EXISTS_BUT_PARTIAL | Bridge from pricing buckets into current estimate proposal; not final native commercial estimate projection. |
| `src/lib/estimate/estimate-status.ts` | EXISTS_AND_CANONICAL | Central governance for mode, readiness, issuance, acceptance, commercial flow, and conversion checks. |
| `src/lib/estimates/internal-analysis.ts` | EXISTS_BUT_PARTIAL | Persistence bridge into current estimate schema via `generationNotes` and line assumptions. |

## Legacy Parametric Estimate Core
| File | Status | Notes |
| --- | --- | --- |
| `src/lib/automation/estimate-generator.ts` | EXISTS_BUT_LEGACY | Still generates core estimate structure from typology masters and broad parametric rules. |
| `src/lib/automation/masters.ts` | EXISTS_BUT_LEGACY | Typology master/rule system still central for many estimate and planning flows. |
| `src/lib/automation/types.ts` | EXISTS_BUT_LEGACY | Legacy automation context contract still shapes estimate/planning input expectations. |

## Planning
| File | Status | Notes |
| --- | --- | --- |
| `src/lib/automation/planning-generator.ts` | EXISTS_BUT_PARTIAL | Reads `executionContext`, but still primarily typology/master driven. |

## Procurement / Sourcing
| File | Status | Notes |
| --- | --- | --- |
| `src/lib/procurement/discovery-context.ts` | EXISTS_BUT_PARTIAL | Discovery-to-procurement hints exist, but not full canonical procurement projection. |
| `src/lib/procurement/catalog.ts` | EXISTS_BUT_PARTIAL | Catalog/offers/material mapping exists and is usable by pricing/procurement. |
| `src/lib/procurement/sourcing.ts` | EXISTS_AND_CANONICAL | Supplier choice and sourcing heuristics are real and reusable. |

## Estimate UI / Flow
| File | Status | Notes |
| --- | --- | --- |
| `src/app/estimates/new/AutoEstimateBuilder.tsx` | EXISTS_BUT_PARTIAL | Proposal builder reflects readiness/issuance, still bound to current proposal shape. |
| `src/app/estimates/new/page.tsx` | EXISTS_BUT_PARTIAL | Builder/editor route, still hybrid legacy + new pipeline. |
| `src/app/estimates/[id]/page.tsx` | EXISTS_BUT_PARTIAL | Detail page wrapper with coarse DB status + fine generation notes. |
| `src/app/estimates/[id]/EstimateDetailClient.tsx` | EXISTS_BUT_PARTIAL | Operational governance UI for issuance/acceptance/conversion, but still built atop current estimate schema. |
| `src/app/estimates/EstimatePDFTemplate.tsx` | EXISTS_BUT_PARTIAL | PDF reflects governance states, but estimate body still comes from current estimate lines. |
| `src/app/estimates/[id]/print/page.tsx` | EXISTS_BUT_PARTIAL | Print wrapper only. |
| `src/app/estimates/[id]/edit/page.tsx` | EXISTS_BUT_PARTIAL | Current editing flow; not yet recentered on canonical projections. |

## Estimate / Discovery API
| File | Status | Notes |
| --- | --- | --- |
| `src/app/api/discovery/sessions/route.ts` | EXISTS_BUT_PARTIAL | Session lifecycle CRUD. |
| `src/app/api/discovery/sessions/[id]/route.ts` | EXISTS_BUT_PARTIAL | Session persistence route. |
| `src/app/api/discovery/sessions/[id]/generate/route.ts` | EXISTS_BUT_PARTIAL | Main bridge from discovery to estimate proposal; still hybrid with legacy estimate generator. |
| `src/app/api/estimates/generate/route.ts` | EXISTS_BUT_LEGACY | Legacy estimate generation entry point. |
| `src/app/api/estimates/route.ts` | EXISTS_BUT_PARTIAL | Current estimate persistence route. |
| `src/app/api/estimates/[id]/route.ts` | EXISTS_BUT_PARTIAL | Current estimate update/get route. |
| `src/app/api/estimates/[id]/readiness-override/route.ts` | EXISTS_BUT_PARTIAL | Governance action route. |
| `src/app/api/estimates/[id]/issue/route.ts` | EXISTS_BUT_PARTIAL | Issuance action route. |
| `src/app/api/estimates/[id]/revoke-issuance/route.ts` | EXISTS_BUT_PARTIAL | Issuance revocation route. |
| `src/app/api/estimates/[id]/accept/route.ts` | EXISTS_BUT_PARTIAL | Acceptance action route. |
| `src/app/api/estimates/[id]/reject/route.ts` | EXISTS_BUT_PARTIAL | Rejection action route. |
| `src/app/api/estimates/[id]/revoke-acceptance/route.ts` | EXISTS_BUT_PARTIAL | Acceptance revocation route. |
| `src/app/api/estimates/[id]/convert/route.ts` | EXISTS_BUT_PARTIAL | Conversion now centrally validated, but still writes into coarse invoice/estimate schema. |

## Missing Canonical Pieces
| Piece | Status | Notes |
| --- | --- | --- |
| `CommercialEstimateProjection` runtime module | MISSING | Still implicit across estimate integration + internal analysis + proposal shape. |
| `PlanningProjection` runtime module | MISSING | Planning exists as generator output, but not as explicit canonical projection contract. |
| `ProcurementProjection` runtime module | MISSING | Procurement hints/catalog/sourcing exist, but not a full projection module. |
| `ControlProjection` runtime module | MISSING | No canonical control/actuals layer yet. |
| First-class DB persistence for canonical governance | MISSING | Governance still lives mainly in `generationNotes`. |

## Duplicities and Dangerous Drift
- `estimate-generator.ts` and `pricing/recipe/measurement` can both influence cost truth. This is the biggest drift source.
- `planning-generator.ts` consumes `executionContext`, but still derives structure/durations mostly from typology masters.
- `generationNotes` stores critical state that is richer than coarse DB `Estimate.status`; the system is operational but persistence is split-brain.
- Compatibility outputs (`areas[]`, `actionsByArea[]`, `works[]`) are still heavily present and can be mistaken for canonical sources.
- UI flows still consume current estimate lines and `internalAnalysis` rather than a dedicated commercial estimate projection.

## Couplings to Watch
- Discovery route -> legacy estimate generator
- Estimate integration -> current proposal line structure
- PDF/detail UI -> current estimate schema + generation notes mix
- Procurement catalog/sourcing -> pricing engine material bindings
- Acceptance/issuance/conversion governance -> coarse DB status + fine generation notes
