import type {
  PlanningActivityNode,
  PlanningBlueprint,
  PlanningDependencyNode,
  PlanningGenerationInput,
  PlanningLocationNode,
  PlanningWBSNode,
} from '@/lib/automation/planning-generator';
import { generatePlanningBlueprint } from '@/lib/automation/planning-generator';
import type { CommercialEstimateProjection } from '@/lib/estimate/commercial-estimate-projection';
import type { CommercialEstimateRuntimeOutput } from '@/lib/estimate/commercial-estimate-runtime';
import { deriveActivityDurationFromRecipeLine } from '@/lib/estimate/labor-productivity';
import type { MeasurementLine, MeasurementResult } from '@/lib/estimate/measurement-types';
import type { RecipeLine, RecipeResult } from '@/lib/estimate/recipe-types';
import type {
  ResolvedSpec,
  ResolvedSpecSourceLevel,
  VerticalSolutionCode,
} from '@/lib/discovery/technical-spec-types';
import type { ProjectProductivityPolicy } from '@/lib/estimate/project-productivity-policy';
import type { ResolvedProjectLaborRatePolicy } from '@/lib/estimate/project-labor-rate-policy';
// import type { ProjectProductionLog } from '@prisma/client';
type ProjectProductionLog = any;
import { summarizeProductionLogs } from '@/lib/estimate/production-actuals';
import type { ExecutionContext } from '@/lib/discovery/types';



export type PlanningProjectionSource =
  | 'CANONICAL_PIPELINE'
  | 'HYBRID'
  | 'LEGACY_TEMPLATE';

export type PlanningProjectionLocation = PlanningLocationNode & {
  generatedFrom: PlanningProjectionSource;
  spaceId?: string | null;
  floorId?: string | null;
  sourceRefId?: string | null;
};

export type PlanningProjectionWorkPackage = {
  key: string;
  name: string;
  bucketCode:
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
  generatedFrom: PlanningProjectionSource;
  locationKeys: string[];
  spaceIds: string[];
  supportedSolutionCodes: VerticalSolutionCode[];
  measurementLineIds: string[];
  recipeLineIds: string[];
};

export type PlanningProjectionActivity = PlanningActivityNode & {
  generatedFrom: PlanningProjectionSource;
  provenance: {
    spaceId?: string | null;
    floorId?: string | null;
    solutionCode?: VerticalSolutionCode | null;
    measurementLineId?: string | null;
    recipeLineId?: string | null;
    laborTradeCode?: string | null;
    crewCode?: string | null;
    productivityProfileCode?: string | null;
    productivitySource?: 'PRODUCTIVITY_PROFILE' | 'LEGACY_TEMPLATE' | null;
    specSourceLevel?: ResolvedSpecSourceLevel | null;
    specSourceRefId?: string | null;
    assumedFields: string[];
  };
  observedProgress?: number;
  actualHours?: number;
};


export type PlanningProjection = {
  source: PlanningProjectionSource;
  laborRatePolicySource?: 'DEFAULT' | 'PROJECT_OVERRIDE' | null;
  executionContext: Pick<
    ExecutionContext,
    'project' | 'resolvedSpaces' | 'resolvedSpecs'
  >;
  measurementLines: MeasurementLine[];
  recipeLines: RecipeLine[];
  locations: PlanningProjectionLocation[];
  workPackages: PlanningProjectionWorkPackage[];
  activities: PlanningProjectionActivity[];
  coverage: {
    canonicalLocationPercent: number;
    canonicalActivityPercent: number;
    measurementCoveragePercent: number;
    recipeCoveragePercent: number;
  };
  blueprint: PlanningBlueprint;
  warnings: string[];
  assumptions: string[];
};

type CanonicalPlanningInput = PlanningGenerationInput & {
  executionContext?: ExecutionContext;
  measurementResult?: MeasurementResult | null;
  recipeResult?: RecipeResult | null;
  commercialEstimateProjection?: CommercialEstimateProjection | null;
  commercialRuntimeOutput?: CommercialEstimateRuntimeOutput | null;
  projectProductivityPolicy?: ProjectProductivityPolicy | null;
  projectLaborRatePolicy?: ResolvedProjectLaborRatePolicy | null;
  productionLogs?: ProjectProductionLog[] | null;
};


const CANONICAL_WBS: Array<{
  key: string;
  bucketCode: PlanningProjectionWorkPackage['bucketCode'];
  code: string;
  name: string;
}> = [
  { key: 'wbs-leveling', bucketCode: 'LEVELING', code: '03', name: 'Nivelacion y regularizacion' },
  { key: 'wbs-rooms', bucketCode: 'ROOMS', code: '05', name: 'Habitaciones y unidades tipo' },
  { key: 'wbs-baths', bucketCode: 'BATHS', code: '05B', name: 'Banos repetitivos' },
  { key: 'wbs-kitchenettes', bucketCode: 'KITCHENETTES', code: '05C', name: 'Kitchenettes' },
  { key: 'wbs-wall-finishes', bucketCode: 'WALL_FINISHES', code: '05A', name: 'Revestimientos verticales y pintura' },
  { key: 'wbs-common', bucketCode: 'COMMON_AREAS', code: '06', name: 'Zonas comunes y remates' },
  { key: 'wbs-partitions', bucketCode: 'PARTITIONS', code: '03B', name: 'Tabiqueria interior' },
  { key: 'wbs-ceilings', bucketCode: 'CEILINGS', code: '04A', name: 'Falsos techos' },
  { key: 'wbs-flooring', bucketCode: 'FLOORING', code: '05D', name: 'Pavimentos y rodapies' },
  { key: 'wbs-carpentry', bucketCode: 'CARPENTRY', code: '05E', name: 'Carpinteria interior y exterior' },
  { key: 'wbs-mep', bucketCode: 'BASIC_MEP', code: '04B', name: 'Instalaciones basicas' },
];

function round(value: number) {
  return Number(value.toFixed(1));
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function bucketFromSolutionCode(
  solutionCode: VerticalSolutionCode
): PlanningProjectionWorkPackage['bucketCode'] {
  if (solutionCode.startsWith('ROOM_')) return 'ROOMS';
  if (solutionCode.startsWith('BATH_')) return 'BATHS';
  if (solutionCode.startsWith('KITCHENETTE_')) return 'KITCHENETTES';
  if (solutionCode.startsWith('LEVELING_')) return 'LEVELING';
  if (solutionCode.startsWith('COMMON_AREA_')) return 'COMMON_AREAS';
  if (solutionCode.startsWith('WALL_TILE_') || solutionCode.startsWith('PAINT_') || solutionCode.startsWith('WET_AREA_')) return 'WALL_FINISHES';
  if (solutionCode.startsWith('PARTITION_')) return 'PARTITIONS';
  if (solutionCode.startsWith('CEILING_')) return 'CEILINGS';
  if (solutionCode.startsWith('FLOOR_') || solutionCode === 'SKIRTING_STD') return 'FLOORING';
  if (solutionCode.startsWith('DOOR_') || solutionCode.startsWith('WINDOW_') || solutionCode.startsWith('SHUTTER_')) return 'CARPENTRY';
  if (solutionCode.startsWith('ELECTRICAL_') || solutionCode.startsWith('LIGHTING_') || solutionCode.startsWith('PLUMBING_') || solutionCode.startsWith('DRAINAGE_')) return 'BASIC_MEP';
  return 'GENERAL';
}

function activityPrefix(bucketCode: PlanningProjectionWorkPackage['bucketCode']) {
  switch (bucketCode) {
    case 'ROOMS':
      return 'ROOM';
    case 'BATHS':
      return 'BATH';
    case 'KITCHENETTES':
      return 'KITCH';
    case 'LEVELING':
      return 'LEVEL';
    case 'COMMON_AREAS':
      return 'COMM';
    case 'WALL_FINISHES':
      return 'WALL';
    case 'PARTITIONS':
      return 'PART';
    case 'CEILINGS':
      return 'CEIL';
    case 'FLOORING':
      return 'FLOOR';
    case 'CARPENTRY':
      return 'CARP';
    case 'BASIC_MEP':
      return 'MEP';
    default:
      return 'GEN';
  }
}

function activityNameForRecipe(
  recipeLine: RecipeLine,
  space: { label: string } | null
) {
  const label = space?.label || recipeLine.description;
  if (recipeLine.solutionCode.startsWith('ROOM_')) return `Acondicionamiento ${label}`;
  if (recipeLine.solutionCode.startsWith('BATH_')) return `Ejecucion ${label}`;
  if (recipeLine.solutionCode.startsWith('KITCHENETTE_')) return `Montaje ${label}`;
  if (recipeLine.solutionCode.startsWith('LEVELING_')) return `Nivelacion ${label}`;
  if (recipeLine.solutionCode.startsWith('COMMON_AREA_')) return `Acondicionamiento ${label}`;
  if (recipeLine.solutionCode.startsWith('WALL_TILE_') || recipeLine.solutionCode.startsWith('PAINT_') || recipeLine.solutionCode.startsWith('WET_AREA_')) return `Acabados verticales ${label}`;
  if (recipeLine.solutionCode.startsWith('PARTITION_')) return `Tabiqueria ${label}`;
  if (recipeLine.solutionCode.startsWith('CEILING_')) return `Falso techo ${label}`;
  if (recipeLine.solutionCode.startsWith('FLOOR_') || recipeLine.solutionCode === 'SKIRTING_STD') return `Pavimentos ${label}`;
  if (recipeLine.solutionCode.startsWith('DOOR_') || recipeLine.solutionCode.startsWith('WINDOW_') || recipeLine.solutionCode.startsWith('SHUTTER_')) return `Carpinteria ${label}`;
  if (recipeLine.solutionCode.startsWith('ELECTRICAL_') || recipeLine.solutionCode.startsWith('LIGHTING_') || recipeLine.solutionCode.startsWith('PLUMBING_') || recipeLine.solutionCode.startsWith('DRAINAGE_')) return `Instalaciones ${label}`;
  return recipeLine.description;
}

function measurementRatePerDay(line: MeasurementLine) {
  switch (line.solutionCode) {
    case 'ROOM_STD_COLIVING_BASIC':
      return line.unit === 'm2' ? 14 : 1;
    case 'ROOM_STD_COLIVING_PLUS':
      return line.unit === 'm2' ? 12 : 1;
    case 'BATH_STD_COMPACT':
      return 6;
    case 'BATH_STD_MEDIUM':
      return 5;
    case 'BATH_ADAPTED':
      return 4;
    case 'BATH_SHOWER_TRAY_STD':
    case 'BATH_SCREEN_STD':
    case 'BATH_VANITY_STD':
    case 'BATH_TAPWARE_STD':
    case 'BATH_TAPWARE_PLUS':
      return 6;
    case 'BATH_BATHTUB_STD':
      return 4;
    case 'KITCHENETTE_120_BASIC':
      return line.unit === 'ml' ? 2.2 : 1;
    case 'KITCHENETTE_180_COMPLETE':
      return line.unit === 'ml' ? 1.8 : 1;
    case 'KITCHENETTE_CABINET_LOW_STD':
      return line.unit === 'ml' ? 2.8 : 1;
    case 'KITCHENETTE_CABINET_HIGH_STD':
      return line.unit === 'ml' ? 3.4 : 1;
    case 'KITCHENETTE_COUNTERTOP_STD':
    case 'KITCHENETTE_COUNTERTOP_PLUS':
      return line.unit === 'ml' ? 4.2 : 1;
    case 'KITCHENETTE_APPLIANCE_PACK_BASIC':
    case 'KITCHENETTE_SINK_STD':
    case 'KITCHENETTE_TAPWARE_STD':
      return 3;
    case 'LEVELING_LIGHT':
      return 35;
    case 'LEVELING_MEDIUM':
      return 24;
    case 'COMMON_AREA_BASIC':
      return 28;
    case 'COMMON_AREA_INTENSIVE':
      return 20;
    case 'WALL_TILE_BATH_STD':
      return 16;
    case 'WALL_TILE_BATH_PLUS':
      return 14;
    case 'WALL_TILE_KITCHEN_SPLASHBACK':
      return 18;
    case 'WALL_TILE_WET_PARTIAL':
      return 17;
    case 'WALL_TILE_WET_FULL':
      return 14;
    case 'PAINT_WALL_STD':
      return 70;
    case 'PAINT_WALL_PLUS':
      return 60;
    case 'PAINT_CEILING_STD':
      return 75;
    case 'WET_AREA_WATERPROOFING_STD':
      return 45;
    case 'WET_AREA_WATERPROOFING_PLUS':
      return 34;
    case 'PARTITION_LINING_STD':
      return 14;
    case 'PARTITION_PLADUR_STD':
      return 12;
    case 'PARTITION_PLADUR_ACOUSTIC':
      return 10;
    case 'PARTITION_BRICK_STD':
      return 9;
    case 'PARTITION_BLOCK_STD':
      return 8;
    case 'CEILING_CONTINUOUS_STD':
      return 22;
    case 'CEILING_CONTINUOUS_INSULATED':
      return 18;
    case 'CEILING_CONTINUOUS_PLUS':
      return 16;
    case 'CEILING_SUSPENDED_GRID':
      return 26;
    case 'FLOOR_TILE_STD':
      return 18;
    case 'FLOOR_LAMINATE_STD':
      return 28;
    case 'FLOOR_VINYL_STD':
      return 30;
    case 'SKIRTING_STD':
      return 45;
    case 'DOOR_INTERIOR_STD':
    case 'DOOR_INTERIOR_PLUS':
    case 'DOOR_SLIDING_STD':
    case 'DOOR_RF_BASIC':
    case 'WINDOW_STD':
    case 'WINDOW_IMPROVED':
    case 'WINDOW_THERMAL_PLUS':
    case 'SHUTTER_STD':
      return 2;
    case 'ELECTRICAL_ROOM_STD':
    case 'ELECTRICAL_MECHANISMS_STD':
    case 'ELECTRICAL_PANEL_BASIC':
    case 'LIGHTING_BASIC':
    case 'PLUMBING_POINT_STD':
    case 'PLUMBING_WET_ROOM_STD':
    case 'PLUMBING_WET_ROOM_PLUS':
    case 'DRAINAGE_POINT_STD':
    case 'DRAINAGE_WET_ROOM_STD':
    case 'DRAINAGE_WET_ROOM_PLUS':
      return 12;
    default:
      return 10;
  }
}

function durationDaysForMeasurement(line: MeasurementLine) {
  if (line.unit === 'ud' || line.unit === 'lot') {
    return Math.max(1, round(line.quantity));
  }
  const rate = measurementRatePerDay(line);
  return Math.max(1, round(line.quantity / Math.max(rate, 0.0001)));
}

function buildCanonicalLocations(
  context: ExecutionContext,
  fallbackRootName: string
): PlanningProjectionLocation[] {
  const locations: PlanningProjectionLocation[] = [
    {
      key: 'site-root',
      name: fallbackRootName,
      type: context.project.siteType,
      code: 'SITE',
      parentKey: null,
      description: null,
      generatedFrom: 'CANONICAL_PIPELINE',
      spaceId: null,
      floorId: null,
      sourceRefId: null,
    },
  ];

  const seenFloorIds = new Set<string>();
  for (const space of context.resolvedSpaces) {
    if (!space.floorId || seenFloorIds.has(space.floorId)) continue;
    seenFloorIds.add(space.floorId);
    locations.push({
      key: `floor-${space.floorId}`,
      name: `Planta ${space.floorId}`,
      type: 'FLOOR',
      code: space.floorId,
      parentKey: 'site-root',
      description: null,
      generatedFrom: 'CANONICAL_PIPELINE',
      spaceId: null,
      floorId: space.floorId,
      sourceRefId: space.floorId,
    });
  }

  for (const space of context.resolvedSpaces) {
    locations.push({
      key: `space-${space.spaceId}`,
      name: space.label,
      type: space.areaType,
      code: space.areaType,
      parentKey: space.parentSpaceId
        ? `space-${space.parentSpaceId}`
        : space.floorId
          ? `floor-${space.floorId}`
          : 'site-root',
      description:
        typeof space.measurementDrivers.areaM2 === 'number'
          ? `${space.measurementDrivers.areaM2} m2`
          : null,
      generatedFrom: 'CANONICAL_PIPELINE',
      spaceId: space.spaceId,
      floorId: space.floorId || null,
      sourceRefId: space.spaceId,
    });
  }

  return locations;
}

function coveredLegacyFamily(text: string) {
  const upper = text.toUpperCase();
  if (/HABIT|ROOM|COLIVING/.test(upper)) return 'ROOMS';
  if (/BANO|BAÑO|SANITAR/.test(upper)) return 'BATHS';
  if (/COCINA|KITCH/.test(upper)) return 'KITCHENETTES';
  if (/ALICAT|PINTURA|IMPERMEAB|REVESTIMIENTO/.test(upper)) return 'WALL_FINISHES';
  if (/NIVEL|REGULAR|PAVIMENT/.test(upper)) return 'LEVELING';
  if (/ZONA COMUN|COMMON|PORTAL|PASILLO|ESCALERA/.test(upper)) return 'COMMON_AREAS';
  if (/PLADUR|TABIQU|ALBANILER/.test(upper)) return 'PARTITIONS';
  if (/TECHO|REGISTRABLE/.test(upper)) return 'CEILINGS';
  if (/LAMINAD|VINIL|RODAPIE/.test(upper)) return 'FLOORING';
  if (/PUERTA|VENTANA|CARPINTER/.test(upper)) return 'CARPENTRY';
  if (/ELECTRIC|FONTANER|SANEAMIENTO|ILUMINACION/.test(upper)) return 'BASIC_MEP';
  return null;
}

function mergeLocations(
  canonicalLocations: PlanningProjectionLocation[],
  legacyLocations: PlanningLocationNode[],
  source: PlanningProjectionSource
) {
  const byKey = new Map(canonicalLocations.map((location) => [location.key, location]));
  for (const node of legacyLocations) {
    if (byKey.has(node.key)) continue;
    byKey.set(node.key, {
      ...node,
      generatedFrom: source === 'CANONICAL_PIPELINE' ? 'HYBRID' : source,
      spaceId: null,
      floorId: null,
      sourceRefId: node.code || null,
    });
  }
  return Array.from(byKey.values());
}

export async function buildPlanningProjection(
  input: CanonicalPlanningInput
): Promise<PlanningProjection> {
  const executionContext = input.executionContext || null;
  const measurementResult = input.measurementResult || null;
  const recipeResult = input.recipeResult || null;
  const hasCanonicalContext =
    Boolean(executionContext?.resolvedSpaces?.length) &&
    Boolean(recipeResult?.lines?.length);

  const legacyBlueprint = await generatePlanningBlueprint(input);

  if (!hasCanonicalContext || !executionContext || !measurementResult || !recipeResult) {
    return {
      source: 'LEGACY_TEMPLATE',
      executionContext: {
        project:
          executionContext?.project || {
            workType: input.workType,
            siteType: input.siteType,
            scopeType: input.scopeType,
            finishLevel: input.finishLevel || 'MEDIO',
            accessLevel: input.accessLevel || 'NORMAL',
            conditions: input.conditions || '',
            structuralWorks: Boolean(input.structuralWorks),
            technicalSpecStatus: 'INCOMPLETE',
          },
        resolvedSpaces: executionContext?.resolvedSpaces || [],
        resolvedSpecs:
          executionContext?.resolvedSpecs || { bySpaceId: {}, completeness: { level: 'LOW', specifiedScopePercent: 0, missingScopes: ['legacy_planning'] } },
      },
      measurementLines: measurementResult?.lines || [],
      recipeLines: recipeResult?.lines || [],
      locations: legacyBlueprint.locationNodes.map((node) => ({
        ...node,
        generatedFrom: 'LEGACY_TEMPLATE',
        spaceId: null,
        floorId: null,
        sourceRefId: node.code || null,
      })),
      workPackages: legacyBlueprint.wbsNodes.map((node) => ({
        key: node.key,
        name: node.name,
        bucketCode: 'GENERAL',
        generatedFrom: 'LEGACY_TEMPLATE',
        locationKeys: [],
        spaceIds: [],
        supportedSolutionCodes: [],
        measurementLineIds: [],
        recipeLineIds: [],
      })),
      activities: legacyBlueprint.activityNodes.map((node) => ({
        ...node,
        generatedFrom: 'LEGACY_TEMPLATE',
        provenance: {
          spaceId: null,
          floorId: null,
          solutionCode: null,
          measurementLineId: null,
          recipeLineId: null,
          specSourceLevel: null,
          specSourceRefId: null,
          assumedFields: [],
        },
      })),
      coverage: {
        canonicalLocationPercent: 0,
        canonicalActivityPercent: 0,
        measurementCoveragePercent: 0,
        recipeCoveragePercent: 0,
      },
      blueprint: legacyBlueprint,
      warnings: [
        'No habia cobertura canonica suficiente para planning; se ha usado plantilla legacy.',
      ],
      assumptions: [],
    };
  }

  const measurementById = new Map(measurementResult.lines.map((line) => [line.id, line]));
  const spacesById = new Map(
    executionContext.resolvedSpaces.map((space) => [space.spaceId, space])
  );
  const specsBySpaceId = executionContext.resolvedSpecs.bySpaceId || {};
  const locations = buildCanonicalLocations(executionContext, input.name);
  const coveredFamilies = new Set<PlanningProjectionWorkPackage['bucketCode']>();
  const workPackages = new Map<string, PlanningProjectionWorkPackage>();
  const activities: PlanningProjectionActivity[] = [];

  for (let index = 0; index < recipeResult.lines.length; index += 1) {
    const recipeLine = recipeResult.lines[index];
    const measurementLine = measurementById.get(recipeLine.measurementLineId);
    if (!measurementLine) continue;

    const bucketCode = bucketFromSolutionCode(recipeLine.solutionCode);
    coveredFamilies.add(bucketCode);
    const space = spacesById.get(recipeLine.spaceId) || null;
    const spec = (specsBySpaceId[recipeLine.spaceId] as ResolvedSpec | undefined) || null;
    const generatedFrom: PlanningProjectionSource =
      recipeLine.status === 'RECIPE_RESOLVED' && measurementLine.status === 'MEASURED'
        ? 'CANONICAL_PIPELINE'
        : 'HYBRID';

    const packageKey = `${bucketCode}:${recipeLine.spaceId}`;
    if (!workPackages.has(packageKey)) {
      workPackages.set(packageKey, {
        key: `pkg-${packageKey}`,
        name: activityNameForRecipe(recipeLine, space),
        bucketCode,
        generatedFrom,
        locationKeys: [
          space ? `space-${space.spaceId}` : measurementLine.sourceRefId ? `floor-${measurementLine.sourceRefId}` : 'site-root',
        ],
        spaceIds: [recipeLine.spaceId],
        supportedSolutionCodes: [recipeLine.solutionCode],
        measurementLineIds: [measurementLine.id],
        recipeLineIds: [recipeLine.id],
      });
    } else {
      const current = workPackages.get(packageKey)!;
      current.locationKeys = unique([
        ...current.locationKeys,
        space ? `space-${space.spaceId}` : measurementLine.sourceRefId ? `floor-${measurementLine.sourceRefId}` : 'site-root',
      ]);
      current.spaceIds = unique([...current.spaceIds, recipeLine.spaceId]);
      current.supportedSolutionCodes = unique([
        ...current.supportedSolutionCodes,
        recipeLine.solutionCode,
      ]);
      current.measurementLineIds = unique([
        ...current.measurementLineIds,
        measurementLine.id,
      ]);
      current.recipeLineIds = unique([...current.recipeLineIds, recipeLine.id]);
      if (generatedFrom === 'HYBRID') current.generatedFrom = 'HYBRID';
    }

    const dominantLabor = recipeLine.labor[0] || null;
    const productivityDuration = deriveActivityDurationFromRecipeLine(recipeLine);

    activities.push({
      key: `act-canonical-${index + 1}`,
      name: activityNameForRecipe(recipeLine, space),
      code: `${activityPrefix(bucketCode)}-${String(index + 1).padStart(3, '0')}`,
      wbsKey:
        CANONICAL_WBS.find((item) => item.bucketCode === bucketCode)?.key || 'wbs-general',
      locationKey: space
        ? `space-${space.spaceId}`
        : measurementLine.sourceRefId
            ? `floor-${measurementLine.sourceRefId}`
            : 'site-root',
      durationDays:
        productivityDuration.durationDays > 0
          ? productivityDuration.durationDays
          : durationDaysForMeasurement(measurementLine),
      responsible:
        dominantLabor?.tradeCode === 'OFICIO_CARPINTERO'
          ? 'Carpinteria'
          : dominantLabor?.tradeCode === 'OFICIO_FONTANERO'
            ? 'Fontaneria'
            : dominantLabor?.tradeCode === 'OFICIO_ELECTRICISTA'
              ? 'Electricidad'
              : bucketCode === 'KITCHENETTES'
                ? 'Carpinteria'
                : bucketCode === 'BATHS'
                  ? 'Instalaciones'
                  : 'Produccion',
      notes: `Actividad canónica derivada de ${recipeLine.recipeCode}${measurementLine.status !== 'MEASURED' ? ` | medicion ${measurementLine.status}` : ''}`,
      standardActivityId: null,
      standardActivityCode: null,
      generationSource: 'MASTER',
      originTypologyCode: null,
      originActivityTemplateCode: recipeLine.recipeCode,
      originCostItemCode: recipeLine.measurementLineId,
      productivityRateName: dominantLabor?.productivityProfileCode || recipeLine.recipeCode,
      generatedFrom,
      provenance: {
        spaceId: recipeLine.spaceId,
        floorId: space?.floorId || null,
        solutionCode: recipeLine.solutionCode,
        measurementLineId: measurementLine.id,
        recipeLineId: recipeLine.id,
        laborTradeCode: dominantLabor?.tradeCode || null,
        crewCode: dominantLabor?.crewCode || null,
        productivityProfileCode: dominantLabor?.productivityProfileCode || null,
        productivitySource:
          productivityDuration.durationDays > 0 ? 'PRODUCTIVITY_PROFILE' : 'LEGACY_TEMPLATE',
        specSourceLevel: spec?.sourceLevel || null,
        specSourceRefId: spec?.sourceRefId || null,
        assumedFields: unique([
          ...recipeLine.assumedFields,
          ...measurementLine.assumedFields,
          ...(spec?.assumedFields || []),
          ...recipeLine.labor.flatMap((labor) => labor.assumptions || []),
        ]),
      },
    });
  }

  const shouldUseLegacyFallback =
    activities.length === 0 ||
    recipeResult.status !== 'READY' ||
    measurementResult.status !== 'READY';

  const fallbackActivities: PlanningProjectionActivity[] = shouldUseLegacyFallback
    ? legacyBlueprint.activityNodes
        .filter((node) => {
          const family = coveredLegacyFamily(
            `${node.name} ${node.code || ''} ${node.originCostItemCode || ''} ${node.notes || ''}`
          );
          return !family || !coveredFamilies.has(family);
        })
        .map((node) => ({
          ...node,
          generatedFrom: activities.length > 0 ? 'HYBRID' : 'LEGACY_TEMPLATE',
          provenance: {
            spaceId: null,
            floorId: null,
            solutionCode: null,
            measurementLineId: null,
            recipeLineId: null,
            specSourceLevel: null,
            specSourceRefId: null,
            assumedFields: [],
          },
        }))
    : [];

  const allActivities = [...activities, ...fallbackActivities];
  const hasHybridCanonicalActivities = activities.some(
    (activity) => activity.generatedFrom === 'HYBRID'
  );
  const source: PlanningProjectionSource =
    activities.length === 0
      ? 'LEGACY_TEMPLATE'
      : fallbackActivities.length > 0 || hasHybridCanonicalActivities
        ? 'HYBRID'
        : 'CANONICAL_PIPELINE';

  const wbsNodes: PlanningWBSNode[] = [
    ...CANONICAL_WBS.filter((item) =>
      allActivities.some((activity) => activity.wbsKey === item.key)
    ).map((item) => ({
      key: item.key,
      name: item.name,
      level: 'CAPITULO',
      code: item.code,
    })),
    ...legacyBlueprint.wbsNodes.filter(
      (node) => !CANONICAL_WBS.some((canonical) => canonical.key === node.key)
    ),
  ];

  const mergedLocations = mergeLocations(
    locations,
    legacyBlueprint.locationNodes,
    source
  );

  const dependencyNodes: PlanningDependencyNode[] = [];
  for (let index = 0; index < allActivities.length - 1; index += 1) {
    dependencyNodes.push({
      predecessorKey: allActivities[index].key,
      successorKey: allActivities[index + 1].key,
      type: 'FS',
      lagDays: 0,
    });
  }

  const blueprint: PlanningBlueprint = {
    locationNodes: mergedLocations.map(({ generatedFrom, spaceId, floorId, sourceRefId, ...node }) => node),
    wbsNodes,
    activityNodes: allActivities.map(({ generatedFrom, provenance, ...node }) => node),
    dependencyNodes,
    notes: unique([
      source === 'CANONICAL_PIPELINE'
        ? 'Planning derivado prioritariamente desde spatial model, mediciones y recetas.'
        : source === 'HYBRID'
          ? 'Planning mixto: la capa canónica manda donde hay cobertura y la plantilla legacy cubre huecos.'
          : 'Planning generado por plantilla legacy al faltar cobertura canónica.',
      ...legacyBlueprint.notes,
    ]),
    typologyCode: legacyBlueprint.typologyCode || null,
    source: source === 'LEGACY_TEMPLATE' ? 'FALLBACK' : 'MASTER',
  };

  const canonicalLocationCount = mergedLocations.filter(
    (location) => location.generatedFrom === 'CANONICAL_PIPELINE'
  ).length;
  const canonicalActivityCount = allActivities.filter(
    (activity) => activity.generatedFrom === 'CANONICAL_PIPELINE'
  ).length;

  // Enrichment with Field Actuals
  if (input.productionLogs && input.productionLogs.length > 0) {
    const summary = summarizeProductionLogs('', input.productionLogs);
    for (const activity of allActivities) {
      const activitySummary = summary.byActivity[activity.key];
      if (activitySummary) {
        activity.observedProgress = activitySummary.progressPercent;
        activity.actualHours = activitySummary.actualHours;
      }
    }
  }

  return {

    source,
    laborRatePolicySource: input.projectLaborRatePolicy?.source || null,
    executionContext: {
      project: executionContext.project,
      resolvedSpaces: executionContext.resolvedSpaces,
      resolvedSpecs: executionContext.resolvedSpecs,
    },
    measurementLines: measurementResult.lines,
    recipeLines: recipeResult.lines,
    locations: mergedLocations,
    workPackages: Array.from(workPackages.values()),
    activities: allActivities,
    coverage: {
      canonicalLocationPercent: Math.round(
        (canonicalLocationCount / Math.max(mergedLocations.length, 1)) * 100
      ),
      canonicalActivityPercent: Math.round(
        (canonicalActivityCount / Math.max(allActivities.length, 1)) * 100
      ),
      measurementCoveragePercent:
        measurementResult.coverage.specifiedScopePercent || 0,
      recipeCoveragePercent: recipeResult.coverage.recipeCoveragePercent || 0,
    },
    blueprint,
    warnings: unique([
      ...measurementResult.warnings,
      ...recipeResult.warnings,
      ...(source === 'HYBRID'
        ? ['El planning sigue usando fallback legacy para parte de las actividades.']
        : []),
      ...(source === 'LEGACY_TEMPLATE'
        ? ['No habia suficiente base canónica para construir el planning desde la pipeline.']
        : []),
    ]),
    assumptions: unique([
      ...measurementResult.assumptions,
      ...recipeResult.assumptions,
      ...executionContext.assumptions,
      ...(input.projectLaborRatePolicy?.source === 'PROJECT_OVERRIDE'
        ? ['La obra usa override de rates laborales; afecta baseline económica, no la duración productiva.']
        : []),
    ]),
  };
}
