# Estimate Engine Master Blueprint

## Mission
Build a professional renovation/construction estimate engine whose commercial outputs are traceable back to real project structure, technical specification, measurement, recipe, pricing, and governed commercial workflow.

The system must serve both:
- simple jobs with low modeling overhead
- complex assets such as coliving, hotel, multiunit, building rehabilitation, and change-of-use projects

## Official Pipeline
The official canonical pipeline from now on is:

`ProjectContext -> SpatialModel -> TechnicalSpecModel -> ExecutionContext -> MeasurementResult -> RecipeResult -> PricingResult -> CommercialEstimateProjection -> PlanningProjection / ProcurementProjection / Control`

Notes:
- `ExecutionContext` is the official resolved boundary between discovery input and downstream engines.
- `CommercialEstimateProjection` is the target canonical source for the estimate commercial layer.
- Planning, procurement, and control must progressively consume the same upstream core, not parallel interpretations of the form.

## Canonical Domain Artifacts
### 1. ProjectContext
- project classification
- asset context
- current vs target
- macro scope
- intervention profile
- finish profile
- execution constraints
- inclusions
- certainty profile

### 2. SpatialModel
- floors
- groups
- instances
- parent-child subspaces
- overrides by project/floor/group/instance

### 3. TechnicalSpecModel
- solution-code based selections
- dimensions and counts required by the vertical
- controlled options
- inheritance by project/floor/group/instance/subspace

### 4. ExecutionContext
- resolved spaces
- resolved specs
- totals
- work codes
- warnings and assumptions
- technical spec status

### 5. MeasurementResult
- strict measurement lines
- source trace
- assumptions
- blocked vs partial vs measured states

### 6. RecipeResult
- recipe lines tied to measurement lines
- materials
- labor
- waste/indirect factors
- resolved/partial/missing states

### 7. PricingResult
- material pricing
- labor pricing
- explicit price source
- confirmed/inferred/pending validation states

### 8. CommercialEstimateProjection
- integrated internal/commercial estimate view
- technical buckets
- line/bucket economic source
- estimate readiness, issuance, acceptance, conversion governance

### 9. PlanningProjection
- planning blueprint derived from canonical execution context
- progressively enriched by measurement/recipe knowledge

### 10. ProcurementProjection
- discovery supply hints
- recipe-derived material needs
- supplier/offer based sourcing

## What Exists Today
### Exists and already fits the target architecture
- Discovery session model and derived input bridge
- Spatial model with repetitive groups, instances, subspaces, and overrides
- TechnicalSpecModel MVP
- resolved technical spec layer
- Measurement Engine MVP
- Recipe Engine MVP
- Pricing Engine MVP
- estimate readiness / issuance / acceptance / conversion governance

### Exists but still as transition bridge
- compatibility projection back to `areas[]`, `actionsByArea[]`, `works[]`
- pricing-to-estimate integration buckets
- internal analysis persistence in `generationNotes`

### Exists but remains legacy
- typology master driven `estimate-generator`
- typology master driven `planning-generator`
- broad parametric cost generation in `masters.ts`

## Layer Boundaries
### Discovery -> ExecutionContext
Discovery may ask questions in many ways, but downstream consumers must not depend on raw wizard JSON. They must consume `ExecutionContext` and the canonical downstream artifacts.

### ExecutionContext -> Measurement
Measurement is responsible for quantity truth. It must not invent drivers just because a solution exists.

### Measurement -> Recipe
Recipe must consume measurement plus resolved context. It must not read free-form form fragments directly.

### Recipe -> Pricing
Pricing must consume recipes and sourcing/pricing sources. It must not invent confirmed prices from parametric placeholders.

### Pricing -> Commercial Estimate
Commercial estimate must progressively depend on `PricingResult`, not on legacy typology rates.

### Core -> Planning / Procurement / Control
Planning, procurement, and future control must reuse the same resolved core. No duplicated parallel interpretation of project scope is allowed.

## System Invariants
- No estimate line may look final if its pricing is still partial or pending validation.
- Every important question in the form must map to a real field in a canonical artifact.
- A downstream module must never infer a different project structure than the one resolved in `ExecutionContext`.
- `MeasurementResult`, `RecipeResult`, and `PricingResult` must keep source trace and assumption trace.
- Conversion must never bypass commercial governance.
- Acceptance must never survive a contradictory commercial transition.

## No False Precision Rules
- Missing measurement drivers must produce `PARTIAL` or `BLOCKED`, not fabricated quantities.
- Missing recipe support must produce `RECIPE_PARTIAL` or `RECIPE_MISSING`, not decorative assemblies.
- Missing price coverage must produce `PRICE_INFERRED` or `PRICE_PENDING_VALIDATION`, not fake confirmed totals.
- `HYBRID` can preserve internal estimation, but must stay commercially provisional.
- `PARAMETRIC_PRELIMINARY` must never masquerade as technically closed.

## Valid Estimate States
### Technical/economic state
- `EstimateMode`
  - `PARAMETRIC_PRELIMINARY`
  - `MIXED`
  - `RECIPE_PRICED`

### Readiness state
- `DRAFT`
- `PARAMETRIC_PRELIMINARY`
- `PROVISIONAL_REVIEW_REQUIRED`
- `COMMERCIAL_READY`
- `TECHNICALLY_CLOSED`

### Issuance state
- `NOT_ISSUED`
- `ISSUED_PROVISIONAL`
- `ISSUED_FINAL`

### Acceptance state
- `NOT_ACCEPTED`
- `ACCEPTED`
- `REJECTED`

### Commercial operational state
- `DRAFT`
- `ISSUED_PROVISIONAL`
- `ISSUED_FINAL`
- `CONVERTED`
- `CANCELLED`

## Connection with Planning, Procurement, and Control
### Planning
- current state: can read `executionContext`
- target state: planning quantities/durations should progressively depend on measurement/recipe, not only typology templates

### Procurement
- current state: has supplier/material catalog, sourcing rules, discovery supply hints, and recipe/pricing alignment
- target state: procurement projection should be built from recipe demand and pricing source selection from the same core

### Control
- current state: missing as canonical projection
- target state: actuals, commitments, revisions, and deviations must compare against the same commercial and technical baseline artifacts

## Backward Compatibility Criterion
- current UI and API flows must remain operational while legacy parametric modules coexist
- `areas[]`, `actionsByArea[]`, and `works[]` remain compatibility outputs, not canonical sources
- DB schema can temporarily keep coarse `Estimate.status` while fine commercial governance lives in `generationNotes`
- old estimates without the full technical chain must parse safely and degrade honestly

## Current Architectural Risks
- Legacy `estimate-generator` still creates the initial cost backbone for many cases
- Legacy `planning-generator` still depends mainly on typology masters
- `generationNotes` stores canonical governance data, but is not yet first-class schema
- estimate integration still works by buckets rather than fully native commercial line generation from recipes
- discovery and estimate runtime have strong momentum, but not all downstream modules consume the new core symmetrically

## Prioritized Technical Roadmap
### Phase 1. Canonical contract freeze
- freeze official contracts and docs
- stop opening new side features without mapping them to the pipeline

### Phase 2. Commercial estimate projection
- make estimate commercial lines progressively native to `PricingResult`
- reduce dependence on typology rate synthesis

### Phase 3. Planning migration
- move planning generation from typology-first to execution-context plus measurement/recipe aware planning

### Phase 4. Procurement migration
- turn procurement into a true projection of recipe demand + sourcing strategy

### Phase 5. Control projection
- define project control baseline and actuals against canonical estimate/recipe/pricing

### Phase 6. Persistence hardening
- progressively move critical governance and canonical fields from `generationNotes` into first-class schema where worth it

### Phase 7. Interoperability
- prepare BC3/export/import and external interoperability around canonical artifacts, not around form snapshots
