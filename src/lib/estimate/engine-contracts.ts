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
import type { IntegratedEstimateCostBucket } from './estimate-integration';
import type { PlanningBlueprint } from '@/lib/automation/planning-generator';
import type { DiscoverySupplyHint } from '@/lib/procurement/discovery-context';

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

export type CommercialEstimateProjection = {
  status: EstimateStatusSnapshot;
  source: 'TECHNICAL_PIPELINE' | 'HYBRID' | 'PARAMETRIC_FALLBACK';
  buckets: IntegratedEstimateCostBucket[];
  measurementLines: MeasurementLine[];
  recipeLines: RecipeLine[];
  pricingLines: PricingLine[];
  commercialLines: Array<{
    id: string;
    chapter: string;
    code?: string | null;
    description: string;
    quantity: number;
    unit: string;
    internalCost: number | null;
    commercialPrice: number | null;
    costSource: InternalCostSource;
    supportedSolutionCodes: VerticalSolutionCode[];
    measurementLineIds: string[];
    recipeLineIds: string[];
    pricingLineIds: string[];
    provisional: boolean;
  }>;
  summary: {
    materialCost: number;
    laborCost: number;
    indirectCost: number;
    internalCost: number | null;
    commercialSubtotal: number | null;
    commercialTotal: number | null;
  };
  warnings: string[];
  assumptions: string[];
};

export type ProcurementProjection = {
  source: 'DISCOVERY_HINTS' | 'RECIPE_DRIVEN' | 'HYBRID';
  executionContext: Pick<ExecutionContext, 'project' | 'resolvedSpaces' | 'resolvedSpecs' | 'inclusions'>;
  recipeLines: RecipeLine[];
  pricingLines: PricingLine[];
  supplyHints: DiscoverySupplyHint[];
  procurementLines: Array<{
    id: string;
    materialCode: string;
    description: string;
    quantity: number;
    unit: string;
    requiredBySpaceIds: string[];
    supportedRecipeLineIds: string[];
    supplierId?: string;
    supplierOfferId?: string;
    priceStatus?: string;
  }>;
  warnings: string[];
};

export type PlanningProjection = {
  source: 'CANONICAL_PIPELINE' | 'HYBRID' | 'LEGACY_TEMPLATE';
  executionContext: Pick<ExecutionContext, 'project' | 'resolvedSpaces' | 'resolvedSpecs'>;
  measurementLines: MeasurementLine[];
  recipeLines: RecipeLine[];
  blueprint: PlanningBlueprint;
  warnings: string[];
};
