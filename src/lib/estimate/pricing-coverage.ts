import type {
  LaborRateSource,
  PriceSource,
  PriceStatus,
  PricingCoverageFamilyCode,
  PricingCoverageMetrics,
  PricingFamilyCoverage,
  PricingLine,
  PricingLineCoverage,
  PricingWeakness,
} from './pricing-types';

const FAMILY_LABELS: Record<PricingCoverageFamilyCode, string> = {
  ROOMS: 'Rooms',
  BATHS: 'Bathrooms',
  KITCHENETTES: 'Kitchenettes',
  LEVELING: 'Leveling',
  COMMON_AREAS: 'Common Areas',
  WALL_FINISHES: 'Wall Finishes',
  PARTITIONS: 'Partitions',
  CEILINGS: 'Ceilings',
  FLOORING: 'Flooring',
  CARPENTRY: 'Carpentry',
  BASIC_MEP: 'Basic MEP',
  GENERAL: 'General',
};

const SOURCE_PRIORITY: PriceSource[] = [
  'MANUAL_OVERRIDE',
  'SUPPLIER_OFFER',
  'PREFERRED_SUPPLIER',
  'CATALOG_REFERENCE',
  'PARAMETRIC_REFERENCE',
  'MISSING',
];

function round(value: number) {
  return Number(value.toFixed(2));
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function dominantSource(sources: PriceSource[]): PriceSource {
  for (const source of SOURCE_PRIORITY) {
    if (sources.includes(source)) return source;
  }
  return 'MISSING';
}

const LABOR_RATE_SOURCE_PRIORITY: LaborRateSource[] = [
  'MANUAL_OVERRIDE',
  'PROJECT_OVERRIDE',
  'DEFAULT_RATE',
  'PARAMETRIC_REFERENCE',
  'MISSING',
];

function dominantLaborRateSource(sources: LaborRateSource[]): LaborRateSource {
  for (const source of LABOR_RATE_SOURCE_PRIORITY) {
    if (sources.includes(source)) return source;
  }
  return 'MISSING';
}

function aggregateStatus(statuses: PriceStatus[]): PriceStatus {
  if (statuses.some((status) => status === 'PRICE_PENDING_VALIDATION')) {
    return 'PRICE_PENDING_VALIDATION';
  }
  if (statuses.every((status) => status === 'PRICE_CONFIRMED')) {
    return 'PRICE_CONFIRMED';
  }
  return 'PRICE_INFERRED';
}

export function pricingFamilyFromSolutionCode(solutionCode?: string | null): PricingCoverageFamilyCode {
  const value = solutionCode || '';
  if (value.startsWith('ROOM_')) return 'ROOMS';
  if (value.startsWith('BATH_')) return 'BATHS';
  if (value.startsWith('KITCHENETTE_')) return 'KITCHENETTES';
  if (value.startsWith('LEVELING_')) return 'LEVELING';
  if (value.startsWith('COMMON_AREA_')) return 'COMMON_AREAS';
  if (value.startsWith('WALL_TILE_') || value.startsWith('PAINT_') || value.startsWith('WET_AREA_')) return 'WALL_FINISHES';
  if (value.startsWith('PARTITION_')) return 'PARTITIONS';
  if (value.startsWith('CEILING_')) return 'CEILINGS';
  if (value.startsWith('FLOOR_') || value === 'SKIRTING_STD') return 'FLOORING';
  if (value.startsWith('DOOR_') || value.startsWith('WINDOW_') || value.startsWith('SHUTTER_')) return 'CARPENTRY';
  if (value.startsWith('ELECTRICAL_') || value.startsWith('LIGHTING_') || value.startsWith('PLUMBING_') || value.startsWith('DRAINAGE_')) return 'BASIC_MEP';
  return 'GENERAL';
}

export function pricingFamilyLabel(familyCode: PricingCoverageFamilyCode) {
  return FAMILY_LABELS[familyCode];
}

export function buildPricingLineCoverage(line: Omit<PricingLine, 'coverage'>): PricingLineCoverage {
  const materialStatuses = line.materialPricing.map((item) => item.priceStatus);
  const laborStatuses = line.laborPricing.map((item) => item.priceStatus);
  const materialStatus =
    materialStatuses.length > 0 ? aggregateStatus(materialStatuses) : 'PRICE_CONFIRMED';
  const laborStatus =
    laborStatuses.length > 0 ? aggregateStatus(laborStatuses) : 'PRICE_CONFIRMED';
  const dominantMaterialSource = dominantSource(
    line.materialPricing.map((item) => item.priceSource),
  );
  const dominantLaborSource = dominantSource(
    line.laborPricing.map((item) => item.priceSource),
  );
  const dominantLaborRate = dominantLaborRateSource(
    line.laborPricing
      .map((item) => item.rateSource)
      .filter((item): item is LaborRateSource => Boolean(item)),
  );

  const materialWeak =
    line.materialPricing.length > 0 && materialStatus !== 'PRICE_CONFIRMED';
  const laborWeak =
    line.laborPricing.length > 0 &&
    (laborStatus === 'PRICE_PENDING_VALIDATION' ||
      dominantLaborRate === 'PARAMETRIC_REFERENCE' ||
      dominantLaborRate === 'MISSING');
  const weakness: PricingWeakness = materialWeak && laborWeak
    ? 'MIXED'
    : materialWeak
      ? 'MATERIAL'
      : laborWeak
        ? 'LABOR'
        : 'NONE';

  const provisionalReasons: string[] = [];
  if (materialStatus === 'PRICE_PENDING_VALIDATION') {
    provisionalReasons.push('Material pendiente de validacion');
  } else if (materialStatus === 'PRICE_INFERRED') {
    provisionalReasons.push(`Material soportado por ${dominantMaterialSource}`);
  }
  if (laborStatus === 'PRICE_PENDING_VALIDATION') {
    provisionalReasons.push('Labor pendiente de validacion');
  } else if (laborStatus === 'PRICE_INFERRED') {
    provisionalReasons.push(`Labor soportada por ${dominantLaborRate}`);
  }

  return {
    familyCode: pricingFamilyFromSolutionCode(line.solutionCode),
    dominantMaterialSource,
    dominantLaborSource,
    materialStatus,
    laborStatus,
    weakness,
    provisionalReasons,
  };
}

export function buildPricingCoverageMetrics(lines: PricingLine[]): PricingCoverageMetrics {
  const totalLines = lines.length;
  const confirmedLines = lines.filter((line) => line.priceStatus === 'PRICE_CONFIRMED').length;
  const inferredLines = lines.filter((line) => line.priceStatus === 'PRICE_INFERRED').length;
  const pendingLines = lines.filter((line) => line.priceStatus === 'PRICE_PENDING_VALIDATION').length;
  const provisionalLines = lines.filter(
    (line) =>
      (line.coverage || buildPricingLineCoverage(line as Omit<PricingLine, 'coverage'>)).weakness !== 'NONE',
  ).length;
  const supplierOfferLines = lines.filter((line) =>
    line.materialPricing.some((item) => item.priceSource === 'SUPPLIER_OFFER')
  ).length;
  const preferredSupplierLines = lines.filter((line) =>
    line.materialPricing.some((item) => item.priceSource === 'PREFERRED_SUPPLIER')
  ).length;
  const catalogReferenceLines = lines.filter((line) =>
    line.materialPricing.some((item) => item.priceSource === 'CATALOG_REFERENCE')
  ).length;
  const parametricReferenceLines = lines.filter((line) =>
    line.materialPricing.some((item) => item.priceSource === 'PARAMETRIC_REFERENCE')
  ).length;
  const missingLines = lines.filter((line) =>
    line.materialPricing.some((item) => item.priceSource === 'MISSING') ||
    line.laborPricing.some((item) => item.priceSource === 'MISSING')
  ).length;
  const defaultRateLaborLines = lines.filter((line) =>
    line.laborPricing.some((item) => item.rateSource === 'DEFAULT_RATE')
  ).length;
  const projectOverrideLaborLines = lines.filter((line) =>
    line.laborPricing.some((item) => item.rateSource === 'PROJECT_OVERRIDE')
  ).length;
  const parametricLaborLines = lines.filter((line) =>
    line.laborPricing.some((item) => item.rateSource === 'PARAMETRIC_REFERENCE')
  ).length;
  const manualOverrideLaborLines = lines.filter((line) =>
    line.laborPricing.some((item) => item.rateSource === 'MANUAL_OVERRIDE')
  ).length;
  const missingLaborLines = lines.filter((line) =>
    line.laborPricing.some((item) => item.rateSource === 'MISSING')
  ).length;
  const materialCostTotal = round(lines.reduce((sum, line) => sum + (line.materialCost || 0), 0));
  const laborCostTotal = round(lines.reduce((sum, line) => sum + (line.laborCost || 0), 0));
  const indirectCostTotal = round(lines.reduce((sum, line) => sum + (line.indirectCost || 0), 0));
  const totalCostKnown = round(lines.reduce((sum, line) => sum + (line.totalCost || 0), 0));

  const byFamily = new Map<PricingCoverageFamilyCode, PricingFamilyCoverage>();
  for (const line of lines) {
    const lineCoverage =
      line.coverage ||
      buildPricingLineCoverage(line as Omit<PricingLine, 'coverage'>);
    const familyCode = lineCoverage.familyCode;
    const current = byFamily.get(familyCode) || {
      familyCode,
      label: pricingFamilyLabel(familyCode),
      lineCount: 0,
      confirmedLines: 0,
      inferredLines: 0,
      pendingLines: 0,
      provisionalLines: 0,
      supplierOfferLines: 0,
      preferredSupplierLines: 0,
      catalogReferenceLines: 0,
      parametricReferenceLines: 0,
      missingLines: 0,
      materialWeakLines: 0,
      laborWeakLines: 0,
      mixedWeakLines: 0,
      defaultRateLaborLines: 0,
      projectOverrideLaborLines: 0,
      parametricLaborLines: 0,
      manualOverrideLaborLines: 0,
      missingLaborLines: 0,
      materialCostTotal: 0,
      laborCostTotal: 0,
      indirectCostTotal: 0,
      totalCostKnown: 0,
      realOfferCoveragePercent: 0,
      inferredCoveragePercent: 0,
      pendingCoveragePercent: 0,
      materialSharePercent: 0,
      laborSharePercent: 0,
      governedLaborCoveragePercent: 0,
      weakness: 'NONE' as PricingWeakness,
    };

    current.lineCount += 1;
    if (line.priceStatus === 'PRICE_CONFIRMED') current.confirmedLines += 1;
    if (line.priceStatus === 'PRICE_INFERRED') current.inferredLines += 1;
    if (line.priceStatus === 'PRICE_PENDING_VALIDATION') current.pendingLines += 1;
    if (lineCoverage.weakness !== 'NONE') current.provisionalLines += 1;
    if (line.materialPricing.some((item) => item.priceSource === 'SUPPLIER_OFFER')) current.supplierOfferLines += 1;
    if (line.materialPricing.some((item) => item.priceSource === 'PREFERRED_SUPPLIER')) current.preferredSupplierLines += 1;
    if (line.materialPricing.some((item) => item.priceSource === 'CATALOG_REFERENCE')) current.catalogReferenceLines += 1;
    if (line.materialPricing.some((item) => item.priceSource === 'PARAMETRIC_REFERENCE')) current.parametricReferenceLines += 1;
    if (
      line.materialPricing.some((item) => item.priceSource === 'MISSING') ||
      line.laborPricing.some((item) => item.priceSource === 'MISSING')
    ) {
      current.missingLines += 1;
    }
    if (line.laborPricing.some((item) => item.rateSource === 'DEFAULT_RATE')) current.defaultRateLaborLines += 1;
    if (line.laborPricing.some((item) => item.rateSource === 'PROJECT_OVERRIDE')) current.projectOverrideLaborLines += 1;
    if (line.laborPricing.some((item) => item.rateSource === 'PARAMETRIC_REFERENCE')) current.parametricLaborLines += 1;
    if (line.laborPricing.some((item) => item.rateSource === 'MANUAL_OVERRIDE')) current.manualOverrideLaborLines += 1;
    if (line.laborPricing.some((item) => item.rateSource === 'MISSING')) current.missingLaborLines += 1;

    if (lineCoverage.weakness === 'MATERIAL') current.materialWeakLines += 1;
    if (lineCoverage.weakness === 'LABOR') current.laborWeakLines += 1;
    if (lineCoverage.weakness === 'MIXED') current.mixedWeakLines += 1;

    current.materialCostTotal += line.materialCost || 0;
    current.laborCostTotal += line.laborCost || 0;
    current.indirectCostTotal += line.indirectCost || 0;
    current.totalCostKnown += line.totalCost || 0;
    byFamily.set(familyCode, current);
  }

  const familyMetrics = Array.from(byFamily.values())
    .map((item) => {
      const combinedDirectCost = item.materialCostTotal + item.laborCostTotal;
      const weakness: PricingWeakness =
        item.mixedWeakLines > 0
          ? 'MIXED'
          : item.materialWeakLines > item.laborWeakLines
            ? 'MATERIAL'
            : item.laborWeakLines > 0
              ? 'LABOR'
              : 'NONE';
      return {
        ...item,
        materialCostTotal: round(item.materialCostTotal),
        laborCostTotal: round(item.laborCostTotal),
        indirectCostTotal: round(item.indirectCostTotal),
        totalCostKnown: round(item.totalCostKnown),
        realOfferCoveragePercent: percent(
          item.supplierOfferLines + item.preferredSupplierLines,
          item.lineCount,
        ),
        inferredCoveragePercent: percent(item.inferredLines, item.lineCount),
        pendingCoveragePercent: percent(item.pendingLines, item.lineCount),
        materialSharePercent: percent(item.materialCostTotal, combinedDirectCost),
        laborSharePercent: percent(item.laborCostTotal, combinedDirectCost),
        governedLaborCoveragePercent: percent(
          item.defaultRateLaborLines + item.projectOverrideLaborLines + item.manualOverrideLaborLines,
          item.lineCount,
        ),
        weakness,
      };
    })
    .sort((a, b) => b.totalCostKnown - a.totalCostKnown);

  const weakFamilies = familyMetrics
    .filter(
      (family) =>
        family.weakness !== 'NONE' ||
        family.pendingLines > 0 ||
        family.inferredCoveragePercent >= 40,
    )
    .map((family) => ({
      familyCode: family.familyCode,
      label: family.label,
      weakness: family.weakness,
      inferredCoveragePercent: family.inferredCoveragePercent,
      pendingCoveragePercent: family.pendingCoveragePercent,
    }));

  return {
    totalLines,
    confirmedLines,
    inferredLines,
    pendingLines,
    provisionalLines,
    supplierOfferLines,
    preferredSupplierLines,
    catalogReferenceLines,
    parametricReferenceLines,
    missingLines,
    defaultRateLaborLines,
    projectOverrideLaborLines,
    parametricLaborLines,
    manualOverrideLaborLines,
    missingLaborLines,
    materialCostTotal,
    laborCostTotal,
    indirectCostTotal,
    totalCostKnown,
    realOfferCoveragePercent: percent(supplierOfferLines + preferredSupplierLines, totalLines),
    inferredCoveragePercent: percent(inferredLines, totalLines),
    pendingCoveragePercent: percent(pendingLines, totalLines),
    familyMetrics,
    weakFamilies,
  };
}
