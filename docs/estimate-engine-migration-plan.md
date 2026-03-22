# Estimate Engine Migration Plan

## Phase 0. Architecture Freeze
### Objective
Freeze the canonical contracts, domain language, and migration direction before opening more functional sprints.

### Files
- `docs/estimate-engine-master-blueprint.md`
- `docs/estimate-engine-current-state-audit.md`
- `docs/estimate-engine-migration-plan.md`
- `docs/estimate-engine-architecture-decisions.md`
- `src/lib/estimate/engine-contracts.ts`

### Acceptance criteria
- official pipeline documented
- canonical artifacts named and fixed
- legacy/partial/canonical boundaries explicit

### Do not touch yet
- no large UI redesign
- no schema migration
- no new vertical expansion

## Phase 1. Commercial Estimate Projection
### Objective
Create a first-class runtime module that produces the commercial estimate projection from pricing/recipe outputs, instead of relying on ad-hoc proposal integration.

### Files to touch
- `src/lib/estimate/estimate-integration.ts`
- new canonical projection module under `src/lib/estimate/`
- `src/lib/estimates/internal-analysis.ts`
- `src/app/api/discovery/sessions/[id]/generate/route.ts`
- `src/app/api/estimates/[id]/route.ts`

### Dependencies
- frozen contracts
- current pricing/recipe/measurement chain

### Acceptance criteria
- estimate commercial output has a dedicated projection shape
- line/bucket provenance is explicit
- legacy parametric lines only act as controlled fallback

### Do not touch yet
- no BC3/export
- no control module

## Phase 2. Legacy Estimate Generator Demotion
### Objective
Reduce `estimate-generator.ts` from primary cost source to structure/fallback provider.

### Files to touch
- `src/lib/automation/estimate-generator.ts`
- `src/lib/automation/masters.ts`
- `src/lib/estimate/estimate-integration.ts`
- proposal generation routes

### Dependencies
- phase 1 commercial projection

### Acceptance criteria
- technical pricing wins whenever available
- fallback is explicit and narrow
- no false appearance of fully recipe-priced estimate when coverage is partial

### Frozen
- planning generator behavior except required compatibility fixes

## Phase 3. Planning Projection Migration
### Objective
Create an explicit planning projection sourced from execution context plus measurement/recipe, progressively reducing typology-first logic.

### Files to touch
- `src/lib/automation/planning-generator.ts`
- new planning projection helper/module
- planning-related routes if any

### Dependencies
- canonical execution context
- phase 1 commercial projection boundaries

### Acceptance criteria
- planning clearly states which parts come from canonical core vs legacy fallback
- repetitive spaces use canonical spatial model as primary source

### Do not touch yet
- no advanced resource leveling

## Phase 4. Procurement Projection Migration
### Objective
Create a first-class procurement projection from recipe demand and pricing/sourcing state.

### Files to touch
- `src/lib/procurement/discovery-context.ts`
- new procurement projection helper/module
- `src/lib/procurement/catalog.ts`
- `src/lib/procurement/sourcing.ts`

### Dependencies
- recipe and pricing already canonical

### Acceptance criteria
- procurement projection references recipe demand, not only hints
- supplier and offer provenance is preserved

## Phase 5. Governance Persistence Hardening
### Objective
Move critical governance data from `generationNotes` toward first-class schema where it materially reduces risk.

### Files to touch
- `prisma/schema.prisma`
- estimate API routes
- `src/lib/estimates/internal-analysis.ts`
- `src/lib/estimate/estimate-status.ts`

### Dependencies
- commercial governance stable

### Acceptance criteria
- no split-brain for critical estimate lifecycle state
- backward compatibility migration path documented

### Do not touch yet
- no destructive migration of historical estimates without bridge logic

## Phase 6. Control Projection
### Objective
Introduce a canonical control layer for actuals, commitments, revisions, and deviations against estimate/planning/procurement baselines.

### Files to touch
- new control modules
- estimate/planning/procurement projection connectors

### Dependencies
- phases 1 to 4

### Acceptance criteria
- actual vs baseline comparisons use canonical shared IDs

## Phase 7. Interoperability
### Objective
Prepare export/import and interoperability around canonical artifacts.

### Files to touch
- new BC3/export modules
- estimate projection export adapters

### Dependencies
- stabilized canonical projections

### Acceptance criteria
- exports come from canonical estimate projection, not UI-specific line shapes

## Temporarily Frozen Areas
- visual redesign of estimate UI
- new technical catalog expansion beyond current MVP vertical
- large schema rewrites
- new business workflows not aligned to the canonical pipeline
