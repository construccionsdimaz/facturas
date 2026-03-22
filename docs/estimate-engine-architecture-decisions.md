# Estimate Engine Architecture Decisions

## ADR 001. The center of the system is no longer the form
The form is only a capture interface. The system of record is the pipeline of canonical artifacts:
`ProjectContext -> SpatialModel -> TechnicalSpecModel -> ExecutionContext -> MeasurementResult -> RecipeResult -> PricingResult -> CommercialEstimateProjection`.

Reason:
- forms change
- capture UX can differ by project complexity
- downstream engines need stable, auditable artifacts

## ADR 002. Estimate cannot pretend closure with partial pricing
If measurement, recipe, or pricing coverage is incomplete, the estimate must remain explicitly preliminary, mixed, provisional, or pending validation.

Reason:
- false precision creates commercial and operational risk
- pricing source provenance is part of product truth, not optional metadata

## ADR 003. Planning and procurement must consume the same core
Planning, procurement, and future control must progressively depend on the same resolved execution core.

Reason:
- avoids scope drift between estimate, planning, and sourcing
- enables comparable baselines across commercial and operational workflows

## ADR 004. Simple mode must continue to exist
The platform must support small/simple jobs without forcing full structured modeling.

Reason:
- not every project justifies floors, groups, instances, and technical authoring overhead
- simple mode is valid as long as it still maps cleanly into the canonical pipeline

## ADR 005. Interoperability must be considered from the design
BC3/export/import and future interoperability should be designed around canonical artifacts, not around transient UI or seed-specific structures.

Reason:
- prevents later rework
- keeps the engine usable in professional ecosystems
