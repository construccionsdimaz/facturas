import type { VerticalSolutionCode } from '@/lib/discovery/technical-spec-types';
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
  supplierId?: string;
  supplierOfferId?: string;
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
  coverage: {
    confirmedLines: number;
    inferredLines: number;
    pendingLines: number;
    priceCoveragePercent: number;
    pendingValidationCount: number;
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
        supplier?: { id: string; name: string } | null;
      }>;
    }
  >;
  preferredSuppliersOverride?: Record<string, { id: string; name: string }>;
  sourcingStrategy?: 'CHEAPEST' | 'FASTEST' | 'PREFERRED' | 'BALANCED';
  referenceDate?: Date;
};
