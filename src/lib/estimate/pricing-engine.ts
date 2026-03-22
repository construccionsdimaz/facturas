import { db } from '@/lib/db';
import type { ExecutionContext } from '@/lib/discovery/types';
import { ensureProcurementCatalog } from '@/lib/procurement/catalog';
import { chooseSupplierOffer } from '@/lib/procurement/sourcing';
import type { RecipeLine, RecipeLaborCode, RecipeMaterialCode, RecipeResult } from './recipe-types';
import type {
  PricingEngineOptions,
  PriceSource,
  PriceStatus,
  PricingLabor,
  PricingMaterial,
  PricingResult,
} from './pricing-types';
import { deriveEstimateModeFromPricing } from './estimate-status';

type MaterialBinding = {
  procurementMaterialCode?: string;
  preferredSupplierName?: string;
  preferredUnitCost?: number;
  catalogReferenceUnitCost?: number;
  parametricReferenceUnitCost?: number;
};

type LaborBinding = {
  unit: 'h' | 'jor';
  catalogReferenceUnitCost?: number;
  parametricReferenceUnitCost?: number;
};

const MATERIAL_BINDINGS: Record<RecipeMaterialCode, MaterialBinding> = {
  MAT_ROOM_FLOOR_BASIC: { procurementMaterialCode: 'ACA-PORC' },
  MAT_ROOM_SKIRTING_BASIC: { catalogReferenceUnitCost: 4.2 },
  MAT_ROOM_PAINT_BASIC: { procurementMaterialCode: 'PIN-PLA' },
  MAT_ROOM_ELEC_PACK_BASIC: { procurementMaterialCode: 'ELE-MEC' },
  MAT_ROOM_FLOOR_PLUS: { procurementMaterialCode: 'ACA-PORC' },
  MAT_ROOM_SKIRTING_PLUS: { catalogReferenceUnitCost: 5.6 },
  MAT_ROOM_PAINT_PLUS: { procurementMaterialCode: 'PIN-PLA' },
  MAT_ROOM_ELEC_PACK_PLUS: { procurementMaterialCode: 'ELE-MEC' },
  MAT_BATH_TILE_COMPACT: { procurementMaterialCode: 'ACA-PORC' },
  MAT_BATH_FLOOR_COMPACT: { procurementMaterialCode: 'ACA-PORC' },
  MAT_BATH_SANITARY_COMPACT: { procurementMaterialCode: 'INS-SAN-STD' },
  MAT_BATH_PLUMBING_COMPACT: { procurementMaterialCode: 'FON-TUB-PPR' },
  MAT_BATH_DRAINAGE_COMPACT: { catalogReferenceUnitCost: 6.5 },
  MAT_BATH_ELEC_COMPACT: { procurementMaterialCode: 'ELE-MEC' },
  MAT_BATH_TILE_MEDIUM: { procurementMaterialCode: 'ACA-PORC' },
  MAT_BATH_FLOOR_MEDIUM: { procurementMaterialCode: 'ACA-PORC' },
  MAT_BATH_SANITARY_MEDIUM: { procurementMaterialCode: 'INS-SAN-STD' },
  MAT_BATH_PLUMBING_MEDIUM: { procurementMaterialCode: 'FON-TUB-PPR' },
  MAT_BATH_DRAINAGE_MEDIUM: { catalogReferenceUnitCost: 7.25 },
  MAT_BATH_ELEC_MEDIUM: { procurementMaterialCode: 'ELE-MEC' },
  MAT_BATH_TILE_ADAPTED: { procurementMaterialCode: 'ACA-PORC' },
  MAT_BATH_FLOOR_ADAPTED: { procurementMaterialCode: 'ACA-PORC' },
  MAT_BATH_SANITARY_ADAPTED: { procurementMaterialCode: 'INS-SAN-STD' },
  MAT_BATH_SUPPORTS_ADAPTED: {},
  MAT_BATH_PLUMBING_ADAPTED: { procurementMaterialCode: 'FON-TUB-PPR' },
  MAT_BATH_DRAINAGE_ADAPTED: { catalogReferenceUnitCost: 8.4 },
  MAT_BATH_ELEC_ADAPTED: { procurementMaterialCode: 'ELE-MEC' },
  MAT_KITCH_BASE_CABINET: { preferredSupplierName: 'Suministros Dimaz Base', preferredUnitCost: 95 },
  MAT_KITCH_BASE_COUNTERTOP: { preferredSupplierName: 'Acabats Mediterrani', preferredUnitCost: 38 },
  MAT_KITCH_BASE_SINK: { catalogReferenceUnitCost: 68 },
  MAT_KITCH_BASE_CONNECTIONS: { procurementMaterialCode: 'FON-TUB-PPR' },
  MAT_KITCH_COMPLETE_CABINET: { preferredSupplierName: 'Suministros Dimaz Base', preferredUnitCost: 145 },
  MAT_KITCH_COMPLETE_COUNTERTOP: { preferredSupplierName: 'Acabats Mediterrani', preferredUnitCost: 56 },
  MAT_KITCH_COMPLETE_SINK: { catalogReferenceUnitCost: 98 },
  MAT_KITCH_COMPLETE_APPLIANCE_PACK: { catalogReferenceUnitCost: 420 },
  MAT_KITCH_COMPLETE_CONNECTIONS: { procurementMaterialCode: 'FON-TUB-PPR' },
  MAT_LEVELING_LIGHT_MORTAR: { parametricReferenceUnitCost: 8.5 },
  MAT_LEVELING_MEDIUM_MORTAR: { parametricReferenceUnitCost: 14.5 },
  MAT_COMMON_FLOOR_BASIC: { procurementMaterialCode: 'ACA-PORC' },
  MAT_COMMON_PAINT_BASIC: { procurementMaterialCode: 'PIN-PLA' },
  MAT_COMMON_LIGHTING_BASIC: { procurementMaterialCode: 'ELE-MEC' },
  MAT_COMMON_FLOOR_INTENSIVE: { procurementMaterialCode: 'ACA-PORC' },
  MAT_COMMON_PAINT_INTENSIVE: { procurementMaterialCode: 'PIN-PLA' },
  MAT_COMMON_LIGHTING_INTENSIVE: { procurementMaterialCode: 'ELE-MEC' },
  MAT_COMMON_PROTECTION_INTENSIVE: { parametricReferenceUnitCost: 18 },
};

const LABOR_BINDINGS: Record<RecipeLaborCode, LaborBinding> = {
  LAB_ROOM_BASIC: { unit: 'h', parametricReferenceUnitCost: 28 },
  LAB_ROOM_PLUS: { unit: 'h', parametricReferenceUnitCost: 31 },
  LAB_BATH_COMPACT: { unit: 'h', parametricReferenceUnitCost: 30 },
  LAB_BATH_MEDIUM: { unit: 'h', parametricReferenceUnitCost: 32 },
  LAB_BATH_ADAPTED: { unit: 'h', parametricReferenceUnitCost: 34 },
  LAB_KITCH_BASIC: { unit: 'h', parametricReferenceUnitCost: 29 },
  LAB_KITCH_COMPLETE: { unit: 'h', parametricReferenceUnitCost: 31 },
  LAB_LEVELING_LIGHT: { unit: 'h', parametricReferenceUnitCost: 27 },
  LAB_LEVELING_MEDIUM: { unit: 'h', parametricReferenceUnitCost: 29 },
  LAB_COMMON_BASIC: { unit: 'h', parametricReferenceUnitCost: 27 },
  LAB_COMMON_INTENSIVE: { unit: 'h', parametricReferenceUnitCost: 30 },
};

type OfferRecord = {
  id: string;
  supplierId: string;
  unitCost: number;
  unit: string;
  leadTimeDays: number | null;
  isPreferred: boolean | null;
  supplier: { id: string; name: string } | null;
};

type MaterialLookup = Record<
  string,
  {
    id: string;
    code: string;
    offers: OfferRecord[];
  }
>;

function isValidCost(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

async function loadMaterialLookup(): Promise<MaterialLookup> {
  const neededCodes = Array.from(
    new Set(
      Object.values(MATERIAL_BINDINGS)
        .map((binding) => binding.procurementMaterialCode)
        .filter((code): code is string => typeof code === 'string' && code.length > 0)
    )
  );

  const materials = await db.material.findMany({
    where: { code: { in: neededCodes } },
    include: {
      offers: {
        where: { status: 'ACTIVA' },
        include: {
          supplier: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  return Object.fromEntries(
    materials.map((material) => [
      material.code,
      {
        id: material.id,
        code: material.code,
        offers: material.offers.map((offer) => ({
          id: offer.id,
          supplierId: offer.supplierId,
          unitCost: offer.unitCost,
          unit: offer.unit,
          leadTimeDays: offer.leadTimeDays,
          isPreferred: offer.isPreferred,
          supplier: offer.supplier ? { id: offer.supplier.id, name: offer.supplier.name } : null,
        })),
      },
    ])
  );
}

async function loadPreferredSuppliers() {
  const names = Array.from(
    new Set(
      Object.values(MATERIAL_BINDINGS)
        .map((binding) => binding.preferredSupplierName)
        .filter((name): name is string => typeof name === 'string' && name.length > 0)
    )
  );

  if (names.length === 0) return {} as Record<string, { id: string; name: string }>;

  const suppliers = await db.client.findMany({
    where: {
      category: 'PROVEEDOR',
      name: { in: names },
    },
    select: {
      id: true,
      name: true,
    },
  });

  return Object.fromEntries(suppliers.map((supplier) => [supplier.name, supplier]));
}

function round(value: number) {
  return Number(value.toFixed(2));
}

async function priceMaterial(
  material: RecipeLine['materials'][number],
  materialLookup: MaterialLookup,
  preferredSuppliers: Record<string, { id: string; name: string }>,
  options: PricingEngineOptions
): Promise<PricingMaterial> {
  const manual = options.manualOverrides?.materials?.[material.materialCode];
  if (manual && isValidCost(manual.unitCost)) {
    return {
      materialCode: material.materialCode,
      quantity: material.quantity,
      unit: material.unit,
      supplierId: manual.supplierId,
      supplierOfferId: manual.supplierOfferId,
      unitCost: round(manual.unitCost),
      totalCost: round(material.quantity * manual.unitCost),
      currency: 'EUR',
      priceStatus: 'PRICE_CONFIRMED',
      priceSource: 'MANUAL_OVERRIDE',
    };
  }

  const binding = MATERIAL_BINDINGS[material.materialCode];
  if (!binding) {
    return {
      materialCode: material.materialCode,
      quantity: material.quantity,
      unit: material.unit,
      unitCost: null,
      totalCost: null,
      currency: 'EUR',
      priceStatus: 'PRICE_PENDING_VALIDATION',
      priceSource: 'MISSING',
    };
  }

  if (binding.procurementMaterialCode) {
    const materialData = materialLookup[binding.procurementMaterialCode];
    if (materialData?.offers?.length) {
      const chosen = chooseSupplierOffer(
        materialData.offers,
        null,
        options.sourcingStrategy || 'BALANCED',
        options.referenceDate || new Date()
      );
      if (chosen.offer && isValidCost(chosen.offer.unitCost)) {
        return {
          materialCode: material.materialCode,
          quantity: material.quantity,
          unit: material.unit,
          supplierId: chosen.offer.supplier?.id,
          supplierOfferId: chosen.offer.id,
          unitCost: round(chosen.offer.unitCost),
          totalCost: round(material.quantity * chosen.offer.unitCost),
          currency: 'EUR',
          priceStatus: 'PRICE_CONFIRMED',
          priceSource: 'SUPPLIER_OFFER',
        };
      }
    }
  }

  if (binding.preferredSupplierName && isValidCost(binding.preferredUnitCost)) {
    const supplier = preferredSuppliers[binding.preferredSupplierName];
    return {
      materialCode: material.materialCode,
      quantity: material.quantity,
      unit: material.unit,
      supplierId: supplier?.id,
      unitCost: round(binding.preferredUnitCost!),
      totalCost: round(material.quantity * binding.preferredUnitCost!),
      currency: 'EUR',
      priceStatus: 'PRICE_INFERRED',
      priceSource: 'PREFERRED_SUPPLIER',
    };
  }

  if (isValidCost(binding.catalogReferenceUnitCost)) {
    return {
      materialCode: material.materialCode,
      quantity: material.quantity,
      unit: material.unit,
      unitCost: round(binding.catalogReferenceUnitCost!),
      totalCost: round(material.quantity * binding.catalogReferenceUnitCost!),
      currency: 'EUR',
      priceStatus: 'PRICE_INFERRED',
      priceSource: 'CATALOG_REFERENCE',
    };
  }

  if (isValidCost(binding.parametricReferenceUnitCost)) {
    return {
      materialCode: material.materialCode,
      quantity: material.quantity,
      unit: material.unit,
      unitCost: round(binding.parametricReferenceUnitCost!),
      totalCost: round(material.quantity * binding.parametricReferenceUnitCost!),
      currency: 'EUR',
      priceStatus: 'PRICE_INFERRED',
      priceSource: 'PARAMETRIC_REFERENCE',
    };
  }

  return {
    materialCode: material.materialCode,
    quantity: material.quantity,
    unit: material.unit,
    unitCost: null,
    totalCost: null,
    currency: 'EUR',
    priceStatus: 'PRICE_PENDING_VALIDATION',
    priceSource: 'MISSING',
  };
}

function priceLabor(
  labor: RecipeLine['labor'][number],
  options: PricingEngineOptions
): PricingLabor {
  const manual = options.manualOverrides?.labor?.[labor.laborCode];
  if (manual && isValidCost(manual.unitCost)) {
    return {
      laborCode: labor.laborCode,
      quantity: labor.quantity,
      unit: labor.unit,
      unitCost: round(manual.unitCost),
      totalCost: round(labor.quantity * manual.unitCost),
      currency: 'EUR',
      priceStatus: 'PRICE_CONFIRMED',
      priceSource: 'MANUAL_OVERRIDE',
    };
  }

  const binding = LABOR_BINDINGS[labor.laborCode];
  if (!binding) {
    return {
      laborCode: labor.laborCode,
      quantity: labor.quantity,
      unit: labor.unit,
      unitCost: null,
      totalCost: null,
      currency: 'EUR',
      priceStatus: 'PRICE_PENDING_VALIDATION',
      priceSource: 'MISSING',
    };
  }

  if (isValidCost(binding.catalogReferenceUnitCost)) {
    return {
      laborCode: labor.laborCode,
      quantity: labor.quantity,
      unit: labor.unit,
      unitCost: round(binding.catalogReferenceUnitCost!),
      totalCost: round(labor.quantity * binding.catalogReferenceUnitCost!),
      currency: 'EUR',
      priceStatus: 'PRICE_INFERRED',
      priceSource: 'CATALOG_REFERENCE',
    };
  }

  if (isValidCost(binding.parametricReferenceUnitCost)) {
    return {
      laborCode: labor.laborCode,
      quantity: labor.quantity,
      unit: labor.unit,
      unitCost: round(binding.parametricReferenceUnitCost!),
      totalCost: round(labor.quantity * binding.parametricReferenceUnitCost!),
      currency: 'EUR',
      priceStatus: 'PRICE_INFERRED',
      priceSource: 'PARAMETRIC_REFERENCE',
    };
  }

  return {
    laborCode: labor.laborCode,
    quantity: labor.quantity,
    unit: labor.unit,
    unitCost: null,
    totalCost: null,
    currency: 'EUR',
    priceStatus: 'PRICE_PENDING_VALIDATION',
    priceSource: 'MISSING',
  };
}

function deriveLineStatus(
  recipeLine: RecipeLine,
  materials: PricingMaterial[],
  labor: PricingLabor[]
): PriceStatus {
  if (recipeLine.status === 'RECIPE_MISSING') return 'PRICE_PENDING_VALIDATION';
  const components = [...materials, ...labor];
  if (components.length === 0) return 'PRICE_PENDING_VALIDATION';
  if (components.some((item) => item.priceStatus === 'PRICE_PENDING_VALIDATION')) {
    return 'PRICE_PENDING_VALIDATION';
  }
  if (components.every((item) => item.priceStatus === 'PRICE_CONFIRMED')) {
    return 'PRICE_CONFIRMED';
  }
  return 'PRICE_INFERRED';
}

export async function buildPricingResult(
  recipeResult: RecipeResult | undefined,
  executionContext: ExecutionContext,
  options: PricingEngineOptions = {}
): Promise<PricingResult> {
  if (!recipeResult) {
    return {
      status: 'BLOCKED',
      lines: [],
      coverage: {
        confirmedLines: 0,
        inferredLines: 0,
        pendingLines: 0,
        priceCoveragePercent: 0,
        pendingValidationCount: 0,
      },
      estimateMode: deriveEstimateModeFromPricing({
        technicalSpecStatus: 'INCOMPLETE',
        recipeCoveragePercent: 0,
        priceCoveragePercent: 0,
        pendingValidationCount: 0,
      }),
      warnings: ['No existe RecipeResult para construir pricing.'],
      assumptions: [],
    };
  }

  let materialLookup: MaterialLookup;
  let preferredSuppliers: Record<string, { id: string; name: string }>;

  if (options.materialLookupOverride) {
    materialLookup = options.materialLookupOverride as MaterialLookup;
    preferredSuppliers = options.preferredSuppliersOverride || {};
  } else {
    try {
      await ensureProcurementCatalog();
    } catch (error) {
      console.warn('Pricing engine could not refresh procurement catalog, continuing with existing data.', error);
    }
    materialLookup = await loadMaterialLookup();
    preferredSuppliers = options.preferredSuppliersOverride || (await loadPreferredSuppliers());
  }

  const warnings = [...recipeResult.warnings];
  const assumptions = [...recipeResult.assumptions];
  const lines = await Promise.all(
    recipeResult.lines.map(async (recipeLine) => {
      const materialPricing = await Promise.all(
        recipeLine.materials.map((material) =>
          priceMaterial(material, materialLookup, preferredSuppliers, options)
        )
      );
      const laborPricing = recipeLine.labor.map((labor) => priceLabor(labor, options));
      const priceStatus = deriveLineStatus(recipeLine, materialPricing, laborPricing);

      const materialCostKnown = materialPricing.every((item) => isValidCost(item.totalCost));
      const laborCostKnown = laborPricing.every((item) => isValidCost(item.totalCost));
      const materialCost =
        materialPricing.length === 0
          ? 0
          : materialCostKnown
            ? round(materialPricing.reduce((sum, item) => sum + (item.totalCost || 0), 0))
            : null;
      const laborCost =
        laborPricing.length === 0
          ? 0
          : laborCostKnown
            ? round(laborPricing.reduce((sum, item) => sum + (item.totalCost || 0), 0))
            : null;

      const subtotalKnown = isValidCost(materialCost) && isValidCost(laborCost);
      const indirectCost =
        subtotalKnown && recipeLine.indirectFactor
          ? round((materialCost! + laborCost!) * recipeLine.indirectFactor)
          : subtotalKnown
            ? 0
            : null;
      const totalCost =
        priceStatus === 'PRICE_PENDING_VALIDATION' || !subtotalKnown || !isValidCost(indirectCost)
          ? null
          : round(materialCost! + laborCost! + indirectCost!);

      if (priceStatus === 'PRICE_PENDING_VALIDATION') {
        warnings.push(`Pricing pendiente de validar para ${recipeLine.recipeCode} en ${recipeLine.spaceId}.`);
      }
      if (priceStatus === 'PRICE_INFERRED') {
        assumptions.push(`Pricing inferido para ${recipeLine.recipeCode} en ${recipeLine.spaceId}.`);
      }

      return {
        id: `${recipeLine.id}:pricing`,
        spaceId: recipeLine.spaceId,
        solutionCode: recipeLine.solutionCode,
        recipeLineId: recipeLine.id,
        materialPricing,
        laborPricing,
        materialCost,
        laborCost,
        indirectCost,
        totalCost,
        priceStatus,
        assumedFields: recipeLine.assumedFields,
      };
    })
  );

  const confirmedLines = lines.filter((line) => line.priceStatus === 'PRICE_CONFIRMED').length;
  const inferredLines = lines.filter((line) => line.priceStatus === 'PRICE_INFERRED').length;
  const pendingLines = lines.filter((line) => line.priceStatus === 'PRICE_PENDING_VALIDATION').length;
  const priceCoveragePercent =
    lines.length === 0 ? 0 : Math.round(((confirmedLines + inferredLines) / lines.length) * 100);
  const pendingValidationCount = pendingLines;
  const status =
    lines.length === 0 || pendingLines === lines.length
      ? 'BLOCKED'
      : pendingLines > 0
        ? 'PARTIAL'
        : 'READY';

  return {
    status,
    lines,
    coverage: {
      confirmedLines,
      inferredLines,
      pendingLines,
      priceCoveragePercent,
      pendingValidationCount,
    },
    estimateMode: deriveEstimateModeFromPricing({
      technicalSpecStatus: executionContext.project.technicalSpecStatus || 'INCOMPLETE',
      recipeCoveragePercent: recipeResult.coverage.recipeCoveragePercent,
      priceCoveragePercent,
      pendingValidationCount,
    }),
    warnings: Array.from(new Set(warnings)),
    assumptions: Array.from(new Set(assumptions)),
  };
}

export { MATERIAL_BINDINGS, LABOR_BINDINGS };
