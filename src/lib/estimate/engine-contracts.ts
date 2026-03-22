import type {
  ComplexityProfile,
  DiscoverySessionData,
  ExecutionContext as DiscoveryExecutionContext,
  SpatialModel as DiscoverySpatialModel,
} from '@/lib/discovery/types';
import type {
  TechnicalSpecModel as DiscoveryTechnicalSpecModel,
  VerticalSolutionCode,
} from '@/lib/discovery/technical-spec-types';
import type {
  MeasurementLine,
  MeasurementResult as CanonicalMeasurementResult,
} from './measurement-types';
import type {
  RecipeLine,
  RecipeResult as CanonicalRecipeResult,
} from './recipe-types';
import type {
  PricingLine,
  PricingResult as CanonicalPricingResult,
} from './pricing-types';
import type {
  EstimateStatusSnapshot,
  InternalCostSource,
} from './estimate-status';
import type {
  CommercialEstimateProjection as RuntimeCommercialEstimateProjection,
  IntegratedEstimateCostBucket,
} from './commercial-estimate-projection';
import type { PlanningBlueprint } from '@/lib/automation/planning-generator';
import type { PlanningProjection as RuntimePlanningProjection } from '@/lib/planning/planning-projection';
import type { DiscoverySupplyHint } from '@/lib/procurement/discovery-context';
import type { ProcurementProjection as RuntimeProcurementProjection } from '@/lib/procurement/procurement-projection';

/**
 * Canonical engine contracts.
 *
 * These types freeze the target architecture without forcing an immediate
 * runtime migration. Existing runtime modules may still use bridge shapes,
 * but all new design work should align to these contracts.
 */

export type ProjectContext = {
  classification: DiscoverySessionData['classification'];
  assetContext: DiscoverySessionData['assetContext'];
  currentVsTarget: DiscoverySessionData['currentVsTarget'];
  macroScope: DiscoverySessionData['macroScope'];
  interventionProfile: DiscoverySessionData['interventionProfile'];
  finishProfile: DiscoverySessionData['finishProfile'];
  executionConstraints: DiscoverySessionData['executionConstraints'];
  inclusions: DiscoverySessionData['inclusions'];
  certainty: DiscoverySessionData['certainty'];
  discoveryProfile?: {
    workType: string;
    subtypes: string[];
    complexityProfile: ComplexityProfile;
  };
};

export type SpatialModel = DiscoverySpatialModel;
export type TechnicalSpecModel = DiscoveryTechnicalSpecModel;
export type ExecutionContext = DiscoveryExecutionContext;
export type MeasurementResult = CanonicalMeasurementResult;
export type RecipeResult = CanonicalRecipeResult;
export type PricingResult = CanonicalPricingResult;

export type CommercialEstimateProjection = RuntimeCommercialEstimateProjection;

export type ProcurementProjection = RuntimeProcurementProjection;

export type PlanningProjection = RuntimePlanningProjection;
