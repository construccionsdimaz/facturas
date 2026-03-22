import type { VerticalSolutionCode } from '@/lib/discovery/technical-spec-types';
import type {
  ProjectSourcingPolicy,
  SourcingFamily,
  SourcingStrategy,
} from '@/lib/procurement/sourcing-policy';
import type {
  DiscardedOfferSummary,
  SourcingFilterReasonCode,
  SourcingOfferSummary,
  SourcingSelectionReasonCode,
} from '@/lib/procurement/material-resolution';
import type { ProjectLaborRatePolicy } from './project-labor-rate-policy';
import type { RecipeLaborCode, RecipeMaterialCode } from './recipe-types';

export type PriceStatus =
  | 'PRICE_CONFIRMED'
  | 'PRICE_INFERRED'
  | 'PRICE_PENDING_VALIDATION';

export type PriceSource =
  | 'SUPPLIER_OFFER'
  | 'PREFERRED_SUPPLIER'
  | 'CATALOG_REFERENCE'
  | 'PARAMETRIC_REFERENCE'
  | 'MANUAL_OVERRIDE'
  | 'MISSING';

export type PricingCoverageFamilyCode =
  | 'ROOMS'
  | 'BATHS'
  | 'KITCHENETTES'
  | 'LEVELING'
  | 'COMMON_AREAS'
  | 'WALL_FINISHES'
  | 'PARTITIONS'
  | 'CEILINGS'
  | 'FLOORING'
  | 'CARPENTRY'
  | 'BASIC_MEP'
  | 'GENERAL';

export type PricingWeakness = 'NONE' | 'MATERIAL' | 'LABOR' | 'MIXED';

export type LaborRateSource =
  | 'DEFAULT_RATE'
  | 'PROJECT_OVERRIDE'
  | 'PARAMETRIC_REFERENCE'
  | 'MANUAL_OVERRIDE'
  | 'MISSING';

export type PricingLineCoverage = {
  familyCode: PricingCoverageFamilyCode;
  dominantMaterialSource: PriceSource;
  dominantLaborSource: PriceSource;
  materialStatus: PriceStatus;
  laborStatus: PriceStatus;
  weakness: PricingWeakness;
  provisionalReasons: string[];
};

export type PricingFamilyCoverage = {
  familyCode: PricingCoverageFamilyCode;
  label: string;
  lineCount: number;
  confirmedLines: number;
  inferredLines: number;
  pendingLines: number;
  provisionalLines: number;
  supplierOfferLines: number;
  preferredSupplierLines: number;
  catalogReferenceLines: number;
  parametricReferenceLines: number;
  missingLines: number;
  materialWeakLines: number;
  laborWeakLines: number;
  mixedWeakLines: number;
  defaultRateLaborLines: number;
  projectOverrideLaborLines: number;
  parametricLaborLines: number;
  manualOverrideLaborLines: number;
  missingLaborLines: number;
  materialCostTotal: number;
  laborCostTotal: number;
  indirectCostTotal: number;
  totalCostKnown: number;
  realOfferCoveragePercent: number;
  inferredCoveragePercent: number;
  pendingCoveragePercent: number;
  materialSharePercent: number;
  laborSharePercent: number;
  governedLaborCoveragePercent: number;
  weakness: PricingWeakness;
};

export type PricingCoverageMetrics = {
  totalLines: number;
  confirmedLines: number;
  inferredLines: number;
  pendingLines: number;
  provisionalLines: number;
  supplierOfferLines: number;
  preferredSupplierLines: number;
  catalogReferenceLines: number;
  parametricReferenceLines: number;
  missingLines: number;
  defaultRateLaborLines: number;
  projectOverrideLaborLines: number;
  parametricLaborLines: number;
  manualOverrideLaborLines: number;
  missingLaborLines: number;
  materialCostTotal: number;
  laborCostTotal: number;
  indirectCostTotal: number;
  totalCostKnown: number;
  realOfferCoveragePercent: number;
  inferredCoveragePercent: number;
  pendingCoveragePercent: number;
  familyMetrics: PricingFamilyCoverage[];
  weakFamilies: Array<{
    familyCode: PricingCoverageFamilyCode;
    label: string;
    weakness: PricingWeakness;
    inferredCoveragePercent: number;
    pendingCoveragePercent: number;
  }>;
};

export type PricingMaterial = {
  materialCode: RecipeMaterialCode;
  quantity: number;
  unit: string;
  procurementMaterialCode?: string | null;
  sourcingFamily?: SourcingFamily;
  sourcingStrategy?: SourcingStrategy;
  sourcingReason?: string;
  candidateOfferCount?: number;
  eligibleOfferCount?: number;
  selectionReasonCode?: SourcingSelectionReasonCode;
  filterReasonCodes?: SourcingFilterReasonCode[];
  selectedOffer?: SourcingOfferSummary | null;
  candidateOffersSummary?: SourcingOfferSummary[];
  eligibleOffersSummary?: SourcingOfferSummary[];
  discardedOffersSummary?: DiscardedOfferSummary[];
  sourcingPolicySnapshotApplied?: ProjectSourcingPolicy;
  supplierId?: string;
  supplierName?: string | null;
  supplierOfferId?: string;
  leadTimeDays?: number | null;
  unitCost?: number | null;
  totalCost?: number | null;
  currency: 'EUR';
  priceStatus: PriceStatus;
  priceSource: PriceSource;
};

export type PricingLabor = {
  laborCode: RecipeLaborCode;
  quantity: number;
  unit: 'h' | 'jor';
  tradeCode?: string | null;
  crewCode?: string | null;
  productivityProfileCode?: string | null;
  productivitySource?: 'PROFILE' | 'REFERENCE' | 'FALLBACK' | null;
  baseHoursPerUnit?: number | null;
  adjustedHoursPerUnit?: number | null;
  adjustedCrewDays?: number | null;
  productivityFactors?: Array<{
    code: string;
    multiplier: number;
    reason: string;
  }>;
  assumptions?: string[];
  policySource?: 'DEFAULT' | 'PROJECT_OVERRIDE' | null;
  policyFamilyCode?: string | null;
  appliedPolicyOverrides?: string[];
  rateSource?: LaborRateSource | null;
  rateSourceDetail?: string | null;
  defaultHourlyRate?: number | null;
  appliedHourlyRate?: number | null;
  laborRateFamilyCode?: string | null;
  projectLaborRatePolicySnapshotApplied?: ProjectLaborRatePolicy | null;
  rateOverridesApplied?: string[];
  unitCost?: number | null;
  totalCost?: number | null;
  currency: 'EUR';
  priceStatus: PriceStatus;
  priceSource: PriceSource;
};

export type PricingLine = {
  id: string;
  spaceId: string;
  solutionCode: VerticalSolutionCode;
  recipeLineId: string;
  materialPricing: PricingMaterial[];
  laborPricing: PricingLabor[];
  materialCost?: number | null;
  laborCost?: number | null;
  indirectCost?: number | null;
  totalCost?: number | null;
  priceStatus: PriceStatus;
  assumedFields: string[];
  coverage: PricingLineCoverage;
};

export type PricingResult = {
  status: 'READY' | 'PARTIAL' | 'BLOCKED';
  lines: PricingLine[];
  sourcingPolicy: ProjectSourcingPolicy;
  laborRatePolicy?: ProjectLaborRatePolicy | null;
  coverage: {
    confirmedLines: number;
    inferredLines: number;
    pendingLines: number;
    priceCoveragePercent: number;
    pendingValidationCount: number;
    supplierOfferLines: number;
    preferredSupplierLines: number;
    catalogReferenceLines: number;
    parametricReferenceLines: number;
    missingLines: number;
    defaultRateLaborLines: number;
    projectOverrideLaborLines: number;
    parametricLaborLines: number;
    manualOverrideLaborLines: number;
    missingLaborLines: number;
  };
  metrics: PricingCoverageMetrics;
  estimateMode: 'PARAMETRIC_PRELIMINARY' | 'RECIPE_PRICED' | 'MIXED';
  warnings: string[];
  assumptions: string[];
};

export type PricingManualMaterialOverride = {
  unitCost: number;
  supplierId?: string;
  supplierOfferId?: string;
};

export type PricingManualLaborOverride = {
  unitCost: number;
};

export type PricingEngineOptions = {
  manualOverrides?: {
    materials?: Partial<Record<RecipeMaterialCode, PricingManualMaterialOverride>>;
    labor?: Partial<Record<RecipeLaborCode, PricingManualLaborOverride>>;
  };
  materialLookupOverride?: Record<
    string,
    {
      id: string;
      code: string;
      offers: Array<{
        id: string;
        supplierId?: string;
        unitCost: number;
        unit: string;
        leadTimeDays: number | null;
        isPreferred?: boolean | null;
        validFrom?: Date | string | null;
        validUntil?: Date | string | null;
        status?: string | null;
        supplier?: { id: string; name: string; address?: string | null } | null;
      }>;
    }
  >;
  preferredSuppliersOverride?: Record<string, { id: string; name: string }>;
  sourcingStrategy?: SourcingStrategy;
  sourcingPolicyOverride?: Partial<ProjectSourcingPolicy>;
  laborRatePolicyOverride?: Partial<ProjectLaborRatePolicy>;
  referenceDate?: Date;
};
