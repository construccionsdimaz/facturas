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
};

export type PricingResult = {
  status: 'READY' | 'PARTIAL' | 'BLOCKED';
  lines: PricingLine[];
  sourcingPolicy: ProjectSourcingPolicy;
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
  };
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
  referenceDate?: Date;
};
