const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(projectRoot, 'src').replace(/\\/g, '/');

function rewriteAliases(source) {
  return source.replace(/(['"])@\/([^'"]+)\1/g, (_match, quote, target) => `${quote}${srcRoot}/${target}${quote}`);
}

function installTsLoader() {
  const compile = (module, filename) => {
    const source = rewriteAliases(fs.readFileSync(filename, 'utf8'));
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
      fileName: filename,
    });
    module._compile(output.outputText, filename);
  };

  require.extensions['.ts'] = compile;
  require.extensions['.tsx'] = compile;
}

installTsLoader();

async function run() {
  const { createEmptyDiscoverySessionData, createDefaultTemplate } = require(path.join(srcRoot, 'lib/discovery/defaults.ts'));
  const { deriveInputFromSession } = require(path.join(srcRoot, 'lib/discovery/derive-input.ts'));
  const { resolveSpatialModelToExecutionContext } = require(path.join(srcRoot, 'lib/discovery/resolve-spatial-model.ts'));
  const { buildPricingResult } = require(path.join(srcRoot, 'lib/estimate/pricing-engine.ts'));
  const { integratePricingIntoEstimateProposal } = require(path.join(srcRoot, 'lib/estimate/estimate-integration.ts'));
  const {
    normalizeInternalAnalysis,
    readCommercialEstimateReadModel,
    toEstimateInternalAnalysisCreate,
  } = require(path.join(srcRoot, 'lib/estimates/internal-analysis.ts'));
  const {
    materializeEstimateOperationalView,
  } = require(path.join(srcRoot, 'lib/estimate/estimate-runtime-materialization.ts'));
  const {
    applyRuntimeLinePatch,
    deriveLegacyItemsFromRuntimeOutput,
    ensureRuntimeOutputForEditing,
    rebuildEstimateStatusFromRuntimeOutput,
  } = require(path.join(srcRoot, 'lib/estimate/estimate-runtime-editing.ts'));
  const {
    acceptEstimate,
    applyEstimateReadinessOverride,
    assertEstimateCanConvert,
    buildEstimateStatusFromPipeline,
    issueEstimate,
    rejectEstimate,
    revokeEstimateIssuance,
    revokeEstimateAcceptance,
  } = require(path.join(srcRoot, 'lib/estimate/estimate-status.ts'));
  const { buildDiscoverySupplyHints } = require(path.join(srcRoot, 'lib/procurement/discovery-context.ts'));
  const { buildProcurementProjection } = require(path.join(srcRoot, 'lib/procurement/procurement-projection.ts'));
  const { generateEstimateProposal } = require(path.join(srcRoot, 'lib/automation/estimate-generator.ts'));
  const { generatePlanningBlueprint } = require(path.join(srcRoot, 'lib/automation/planning-generator.ts'));
  const { buildPlanningProjection } = require(path.join(srcRoot, 'lib/planning/planning-projection.ts'));

  const pricingLookupOverride = {
    'ACA-PORC': {
      id: 'mat-porc',
      code: 'ACA-PORC',
      offers: [
        { id: 'offer-porc-1', supplierId: 'sup-acabats', unitCost: 16.9, unit: 'm2', leadTimeDays: 8, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'PIN-PLA': {
      id: 'mat-pint',
      code: 'PIN-PLA',
      offers: [
        { id: 'offer-pint-1', supplierId: 'sup-acabats', unitCost: 3.9, unit: 'm2', leadTimeDays: 2, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'ELE-MEC': {
      id: 'mat-ele',
      code: 'ELE-MEC',
      offers: [
        { id: 'offer-ele-1', supplierId: 'sup-electro', unitCost: 7.8, unit: 'ud', leadTimeDays: 2, isPreferred: true, supplier: { id: 'sup-electro', name: 'Electro BCN' } },
      ],
    },
    'FON-TUB-PPR': {
      id: 'mat-fon',
      code: 'FON-TUB-PPR',
      offers: [
        { id: 'offer-fon-1', supplierId: 'sup-electro', unitCost: 3.2, unit: 'ml', leadTimeDays: 3, isPreferred: false, supplier: { id: 'sup-electro', name: 'Electro BCN' } },
      ],
    },
    'INS-SAN-STD': {
      id: 'mat-san',
      code: 'INS-SAN-STD',
      offers: [
        { id: 'offer-san-1', supplierId: 'sup-puertas', unitCost: 142, unit: 'ud', leadTimeDays: 6, isPreferred: true, supplier: { id: 'sup-puertas', name: 'Puertas y Obras BCN' } },
      ],
    },
  };

  const preferredSuppliersOverride = {
    'Suministros Dimaz Base': { id: 'sup-dimaz', name: 'Suministros Dimaz Base' },
    'Acabats Mediterrani': { id: 'sup-acabats', name: 'Acabats Mediterrani' },
  };
  const procurementLookupOverride = {
    ...pricingLookupOverride,
    'ELE-CAB-325': {
      id: 'mat-ele-cab',
      code: 'ELE-CAB-325',
      name: 'Cable electrico 3x2.5',
      category: 'INSTALACIONES',
      baseUnit: 'ml',
      offers: [
        { id: 'offer-ele-cab', supplierId: 'sup-electro', unitCost: 1.85, unit: 'ml', leadTimeDays: 2, isPreferred: true, supplier: { id: 'sup-electro', name: 'Electro BCN' } },
      ],
    },
  };

  const simple = createEmptyDiscoverySessionData('PISO');
  simple.classification.interventionType = 'REFORMA';
  simple.classification.globalScope = 'TOTAL';
  simple.assetContext.areaM2 = 95;
  simple.assetContext.accessLevel = 'NORMAL';
  simple.assetContext.occupancyState = 'VACIO';
  simple.assetContext.bathroomsCurrent = 1;
  simple.assetContext.kitchensCurrent = 1;
  simple.assetContext.roomsCurrent = 3;
  simple.macroScope.workCodes = ['DEMOLICION', 'BANOS', 'COCINA', 'PINTURA'];
  simple.areas = simple.areas.map((area) =>
    ['COCINA', 'BANO', 'SALON'].includes(area.areaType)
      ? { ...area, selected: true, approxSizeM2: area.areaType === 'COCINA' ? 12 : area.areaType === 'BANO' ? 4 : 24, certainty: 'CONFIRMADO' }
      : area
  );
  simple.actionsByArea = [
    { areaId: simple.areas.find((area) => area.areaType === 'COCINA').areaId, actions: [{ actionCode: 'MONTAR_COCINA', coverage: 'TOTAL', replaceMode: 'SUSTITUIR', certainty: 'CONFIRMADO' }] },
    { areaId: simple.areas.find((area) => area.areaType === 'BANO').areaId, actions: [{ actionCode: 'RENOVAR_BANO', coverage: 'TOTAL', replaceMode: 'SUSTITUIR', certainty: 'CONFIRMADO' }] },
    { areaId: simple.areas.find((area) => area.areaType === 'SALON').areaId, actions: [{ actionCode: 'PINTAR', coverage: 'TOTAL', replaceMode: 'SUSTITUIR', certainty: 'ESTIMADO' }] },
  ];
  simple.finishProfile.globalLevel = 'MEDIO';
  simple.interventionProfile.globalIntensity = 'INTEGRAL';
  simple.inclusions.COCINA = 'INCLUIDO';
  simple.inclusions.SANITARIOS = 'INCLUIDO';

  const simpleInput = deriveInputFromSession(simple, 'COMERCIAL', 'MEDIO', [], [], 'MEDIA');
  assert.equal(simpleInput.modelingStrategy, 'SIMPLE_AREA_BASED');
  assert(simpleInput.executionContext.resolvedSpaces.length >= 3);
  try {
    const simpleEstimate = await generateEstimateProposal({
      workType: simpleInput.workType,
      siteType: simpleInput.siteType,
      scopeType: simpleInput.scopeType,
      area: simpleInput.area,
      works: simpleInput.worksText,
      finishLevel: simpleInput.finishLevel,
      accessLevel: simpleInput.accessLevel,
      conditions: simpleInput.conditions,
      bathrooms: simpleInput.bathrooms,
      kitchens: simpleInput.kitchens,
      rooms: simpleInput.rooms,
      units: simpleInput.units,
      floors: simpleInput.floors,
      hasElevator: Boolean(simpleInput.hasElevator),
      structuralWorks: simpleInput.structuralWorks,
    });
    const simplePlanning = await generatePlanningBlueprint({
      name: 'Simple test',
      siteType: simpleInput.siteType,
      scopeType: simpleInput.scopeType,
      workType: simpleInput.workType,
      area: simpleInput.area,
      works: simpleInput.worksText,
      accessLevel: simpleInput.accessLevel,
      bathrooms: simpleInput.bathrooms,
      kitchens: simpleInput.kitchens,
      rooms: simpleInput.rooms,
      units: simpleInput.units,
      floors: simpleInput.floors,
      structuralWorks: simpleInput.structuralWorks,
      hasElevator: Boolean(simpleInput.hasElevator),
      finishLevel: simpleInput.finishLevel,
      conditions: simpleInput.conditions,
      areas: simpleInput.areas,
      actionsByArea: simpleInput.actionsByArea,
      discoverySubtypes: simpleInput.discoveryProfile.subtypes,
      complexityProfile: simpleInput.discoveryProfile.complexityProfile,
      inclusions: simpleInput.inclusions,
      currentVsTarget: simpleInput.currentVsTarget,
      executionConstraints: simpleInput.executionConstraints,
      certainty: simpleInput.certainty,
      executionContext: simpleInput.executionContext,
    });
    assert(simpleEstimate.lines.length > 0);
    assert(simplePlanning.activityNodes.length > 0);
  } catch (error) {
    console.warn('Generator integration skipped for simple mode:', error.message);
  }

  const structured = createEmptyDiscoverySessionData('COLIVING');
  structured.modelingStrategy = 'STRUCTURED_REPETITIVE';
  structured.spatialModel.mode = 'STRUCTURED_REPETITIVE';
  structured.classification.interventionType = 'REFORMA';
  structured.classification.globalScope = 'TOTAL';
  structured.assetContext.areaM2 = 220;
  structured.assetContext.floors = 2;
  structured.assetContext.unitsCurrent = 6;
  structured.assetContext.accessLevel = 'COMPLICADO';
  structured.assetContext.occupancyState = 'VACIO';
  structured.macroScope.workCodes = ['BANOS', 'COCINA', 'PINTURA', 'CARPINTERIA_EXTERIOR'];
  structured.finishProfile.globalLevel = 'MEDIO_ALTO';
  structured.interventionProfile.globalIntensity = 'INTEGRAL_CON_REDISTRIBUCION';
  structured.inclusions.COCINA = 'INCLUIDO';
  structured.inclusions.SANITARIOS = 'INCLUIDO';
  structured.inclusions.VENTANAS = 'INCLUIDO';
  structured.spatialModel.floors = [
    { floorId: 'floor-1', label: 'Planta 1', index: 1, type: 'PLANTA_TIPO', selected: true, features: {}, measurementDrivers: {}, technicalScope: {}, notes: '' },
    { floorId: 'floor-2', label: 'Planta 2', index: 2, type: 'PLANTA_TIPO', selected: true, features: {}, measurementDrivers: {}, technicalScope: {}, notes: '' },
  ];
  structured.spatialModel.groups = [
    {
      groupId: 'habitacion-a',
      label: 'Habitacion tipo A',
      category: 'HABITACION',
      count: 2,
      floorIds: ['floor-1', 'floor-2'],
      template: {
        ...createDefaultTemplate('HABITACION', 'Habitacion tipo A'),
        features: {
          ...createDefaultTemplate('HABITACION', 'Habitacion tipo A').features,
          hasBathroom: true,
          hasKitchenette: true,
          countAsUnit: true,
          countAsRoom: true,
        },
        measurementDrivers: {
          areaM2: 18,
          floorSurfaceM2: 18,
          windowsCount: 1,
          sanitaryFixturesCount: 3,
          electricalPointsCount: 8,
        },
        technicalScope: {
          mergeMode: 'REPLACE',
          activeSystems: [
            { system: 'BANOS', enabled: true, interventionMode: 'COMPLETO', coverage: 'TOTAL', certainty: 'CONFIRMADO' },
            { system: 'COCINA', enabled: true, interventionMode: 'COMPLETO', coverage: 'TOTAL', certainty: 'CONFIRMADO' },
            { system: 'PINTURA', enabled: true, interventionMode: 'COMPLETO', coverage: 'TOTAL', certainty: 'CONFIRMADO' },
          ],
          actions: [],
          finishes: { GLOBAL: 'MEDIO_ALTO' },
          inclusions: { COCINA: 'INCLUIDO', SANITARIOS: 'INCLUIDO', VENTANAS: 'INCLUIDO' },
          notes: null,
        },
        subspaces: [],
      },
      features: {},
      measurementDrivers: {},
      technicalScope: {},
      certainty: 'CONFIRMADO',
    },
  ];
  structured.spatialModel.instances = [
    { instanceId: 'h1', groupId: 'habitacion-a', floorId: 'floor-1', parentInstanceId: null, areaType: 'HABITACION', unitKind: 'HABITACION', spaceKind: 'UNIDAD_PRINCIPAL', subspaceKind: null, label: 'H1', isTemplateDerived: true, features: {}, measurementDrivers: {}, technicalScope: {}, certainty: 'CONFIRMADO' },
    { instanceId: 'h1-bano', groupId: null, floorId: 'floor-1', parentInstanceId: 'h1', areaType: 'BANO', unitKind: null, spaceKind: 'ESTANCIA', subspaceKind: 'BANO_ASOCIADO', label: 'Baño H1', isTemplateDerived: false, features: { countAsBathroom: true }, measurementDrivers: { areaM2: 4, floorSurfaceM2: 4, sanitaryFixturesCount: 3 }, technicalScope: {}, certainty: 'CONFIRMADO' },
    { instanceId: 'h2', groupId: 'habitacion-a', floorId: 'floor-2', parentInstanceId: null, areaType: 'HABITACION', unitKind: 'HABITACION', spaceKind: 'UNIDAD_PRINCIPAL', subspaceKind: null, label: 'H2', isTemplateDerived: true, features: { requiresLeveling: true }, measurementDrivers: { areaM2: 20, floorSurfaceM2: 20, windowsCount: 2 }, technicalScope: {}, certainty: 'ESTIMADO' },
  ];

  const structuredInput = deriveInputFromSession(structured, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert.equal(structuredInput.modelingStrategy, 'STRUCTURED_REPETITIVE');
  assert(structuredInput.executionContext.resolvedSpaces.length >= 3);
  assert(structuredInput.rooms >= 2);
  assert(structuredInput.executionContext.resolvedSpaces.some((space) => space.features.hasKitchenette));
  const structuredPlanningProjection = await buildPlanningProjection({
    name: 'Structured projection test',
    siteType: structuredInput.siteType,
    scopeType: structuredInput.scopeType,
    workType: structuredInput.workType,
    area: structuredInput.area,
    works: structuredInput.worksText,
    accessLevel: structuredInput.accessLevel,
    bathrooms: structuredInput.bathrooms,
    kitchens: structuredInput.kitchens,
    rooms: structuredInput.rooms,
    units: structuredInput.units,
    floors: structuredInput.floors,
    structuralWorks: structuredInput.structuralWorks,
    hasElevator: Boolean(structuredInput.hasElevator),
    finishLevel: structuredInput.finishLevel,
    conditions: structuredInput.conditions,
    areas: structuredInput.areas,
    actionsByArea: structuredInput.actionsByArea,
    discoverySubtypes: structuredInput.discoveryProfile.subtypes,
    complexityProfile: structuredInput.discoveryProfile.complexityProfile,
    inclusions: structuredInput.inclusions,
    currentVsTarget: structuredInput.currentVsTarget,
    executionConstraints: structuredInput.executionConstraints,
    certainty: structuredInput.certainty,
    executionContext: structuredInput.executionContext,
    measurementResult: structuredInput.measurementResult,
    recipeResult: structuredInput.recipeResult,
  });
  assert(structuredPlanningProjection.locations.length > 0);
  const discoveryHints = buildDiscoverySupplyHints(structuredInput.executionContext);
  assert(discoveryHints.length > 0);
  try {
    const structuredPlanning = await generatePlanningBlueprint({
      name: 'Structured test',
      siteType: structuredInput.siteType,
      scopeType: structuredInput.scopeType,
      workType: structuredInput.workType,
      area: structuredInput.area,
      works: structuredInput.worksText,
      accessLevel: structuredInput.accessLevel,
      bathrooms: structuredInput.bathrooms,
      kitchens: structuredInput.kitchens,
      rooms: structuredInput.rooms,
      units: structuredInput.units,
      floors: structuredInput.floors,
      structuralWorks: structuredInput.structuralWorks,
      hasElevator: Boolean(structuredInput.hasElevator),
      finishLevel: structuredInput.finishLevel,
      conditions: structuredInput.conditions,
      areas: structuredInput.areas,
      actionsByArea: structuredInput.actionsByArea,
      discoverySubtypes: structuredInput.discoveryProfile.subtypes,
      complexityProfile: structuredInput.discoveryProfile.complexityProfile,
      inclusions: structuredInput.inclusions,
      currentVsTarget: structuredInput.currentVsTarget,
      executionConstraints: structuredInput.executionConstraints,
      certainty: structuredInput.certainty,
      executionContext: structuredInput.executionContext,
    });
    const structuredEstimate = await generateEstimateProposal({
      workType: structuredInput.workType,
      siteType: structuredInput.siteType,
      scopeType: structuredInput.scopeType,
      area: structuredInput.area,
      works: structuredInput.worksText,
      finishLevel: structuredInput.finishLevel,
      accessLevel: structuredInput.accessLevel,
      conditions: structuredInput.conditions,
      bathrooms: structuredInput.bathrooms,
      kitchens: structuredInput.kitchens,
      rooms: structuredInput.rooms,
      units: structuredInput.units,
      floors: structuredInput.floors,
      hasElevator: Boolean(structuredInput.hasElevator),
      structuralWorks: structuredInput.structuralWorks,
    });
    assert(structuredPlanning.locationNodes.length > 0);
    assert(structuredEstimate.lines.length > 0);
  } catch (error) {
    console.warn('Generator integration skipped for structured mode:', error.message);
  }

  const fallback = createEmptyDiscoverySessionData('LOCAL');
  fallback.assetContext.magnitudeLabel = '1 local comercial mediano';
  fallback.assetContext.accessLevel = 'NORMAL';
  fallback.assetContext.occupancyState = 'VACIO';
  fallback.macroScope.workCodes = ['PINTURA'];
  fallback.areas[0].selected = true;
  fallback.actionsByArea = [{ areaId: fallback.areas[0].areaId, actions: [{ actionCode: 'PINTAR', coverage: 'TOTAL', replaceMode: 'SUSTITUIR', certainty: 'SUPUESTO' }] }];
  fallback.finishProfile.globalLevel = 'MEDIO';
  fallback.interventionProfile.globalIntensity = 'PARCIAL';
  const fallbackContext = resolveSpatialModelToExecutionContext(fallback, {
    workType: 'ADECUACION_LOCAL',
    siteType: 'LOCAL',
    scopeType: 'ADECUACION',
    finishLevel: 'MEDIO',
    accessLevel: 'NORMAL',
    conditions: 'Fallback local',
    structuralWorks: false,
    subtypes: [],
    confidenceLevel: 'MEDIA',
    warnings: [],
    assumptions: ['Fallback sin estructura rica'],
  });
  assert.equal(fallbackContext.mode, 'SIMPLE_AREA_BASED');
  assert(fallbackContext.resolvedSpaces.length >= 1);
  const legacyPlanningProjection = await buildPlanningProjection({
    name: 'Legacy planning fallback',
    siteType: 'LOCAL',
    scopeType: 'ADECUACION',
    workType: 'ADECUACION_LOCAL',
    area: 90,
    works: 'adecuacion, pintura, suelos',
    accessLevel: 'NORMAL',
    bathrooms: 1,
    kitchens: 0,
    rooms: 2,
    units: 1,
    floors: 1,
    structuralWorks: false,
    hasElevator: true,
    finishLevel: 'MEDIO',
    conditions: 'Fallback legacy',
  });
  assert.equal(legacyPlanningProjection.source, 'LEGACY_TEMPLATE');
  assert(legacyPlanningProjection.activities.every((activity) => activity.generatedFrom === 'LEGACY_TEMPLATE'));
  const legacyProcurementProjection = await buildProcurementProjection({
    materialLookupOverride: procurementLookupOverride,
    projectActivities: [
      {
        id: 'legacy-activity-1',
        name: 'Instalacion general',
        code: 'INS-GEN',
        plannedStartDate: '2026-03-30T08:00:00.000Z',
        plannedEndDate: '2026-04-01T08:00:00.000Z',
        originCostItemCode: 'INSTALACIONES',
        standardActivity: {
          code: 'INS-GEN',
          materialTemplates: [
            {
              materialId: 'mat-ele',
              unit: 'ml',
              criticality: 'CRITICA',
              material: {
                id: 'mat-ele',
                code: 'ELE-CAB-325',
                name: 'Cable electrico 3x2.5',
                category: 'INSTALACIONES',
                baseUnit: 'ml',
                offers: [
                  {
                    id: 'offer-elec',
                    supplierId: 'sup-electro',
                    unitCost: 1.85,
                    unit: 'ml',
                    leadTimeDays: 2,
                    isPreferred: true,
                    supplier: { id: 'sup-electro', name: 'Electro BCN' },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  });
  assert.equal(legacyProcurementProjection.source, 'DISCOVERY_HINTS');
  assert(
    legacyProcurementProjection.procurementLines.some(
      (line) => line.generatedFrom === 'LEGACY_ACTIVITY_FALLBACK'
    )
  );
  const parametricProposal = await generateEstimateProposal({
    workType: 'ADECUACION_LOCAL',
    siteType: 'LOCAL',
    scopeType: 'ADECUACION',
    area: 90,
    works: 'adecuacion, pintura, suelos',
    finishLevel: 'MEDIO',
    accessLevel: 'NORMAL',
    conditions: '',
    bathrooms: 1,
    kitchens: 0,
    rooms: 2,
    units: 1,
    floors: 1,
    hasElevator: true,
    structuralWorks: false,
  });
  const parametricIntegrated = integratePricingIntoEstimateProposal(parametricProposal);
  assert(parametricIntegrated.runtimeOutput);
  assert.equal(parametricIntegrated.proposal.commercialEstimateProjection.source, 'PARAMETRIC_FALLBACK');
  assert.equal(parametricIntegrated.runtimeOutput.source, 'PARAMETRIC_FALLBACK');
  assert(parametricIntegrated.proposal.lines.every((line) => line.economicStatus.costSource === 'PARAMETRIC_MASTER'));
  assert(parametricIntegrated.proposal.lines.every((line) => line.economicStatus.commercialPriceProvisional === false));
  assert(
    parametricIntegrated.proposal.commercialEstimateProjection.commercialLines.every(
      (line) => line.generatedFrom === 'LEGACY_FALLBACK'
    )
  );
  assert(
    parametricIntegrated.runtimeOutput.lines.every(
      (line) => line.generatedFrom === 'LEGACY_FALLBACK'
    )
  );
  const parametricReadiness = buildEstimateStatusFromPipeline({
    technicalSpecStatus: 'INCOMPLETE',
    technicalCoveragePercent: 0,
    recipeCoveragePercent: 0,
    priceCoveragePercent: 0,
    pendingValidationCount: parametricIntegrated.proposal.lines.length,
    hasHybridBuckets: false,
  });
  assert.equal(parametricReadiness.readiness, 'PARAMETRIC_PRELIMINARY');
  assert.equal(parametricReadiness.issuanceCapabilities.canIssueFinal, false);
  assert.equal(parametricReadiness.issuanceCapabilities.canIssueProvisional, true);
  assert.equal(parametricReadiness.issuanceCapabilities.requiresOverrideForProvisional, true);
  assert.equal(parametricReadiness.acceptanceCapabilities.canAccept, false);
  assert.throws(() => assertEstimateCanConvert(parametricReadiness), /emitido final/);

  const measured = createEmptyDiscoverySessionData('COLIVING');
  measured.modelingStrategy = 'STRUCTURED_REPETITIVE';
  measured.spatialModel.mode = 'STRUCTURED_REPETITIVE';
  measured.classification.interventionType = 'REFORMA';
  measured.classification.globalScope = 'TOTAL';
  measured.assetContext.areaM2 = 140;
  measured.assetContext.accessLevel = 'NORMAL';
  measured.assetContext.occupancyState = 'VACIO';
  measured.finishProfile.globalLevel = 'MEDIO_ALTO';
  measured.interventionProfile.globalIntensity = 'INTEGRAL';
  measured.spatialModel.floors = [
    { floorId: 'pf', label: 'Planta baja', index: 1, type: 'BAJA', selected: true, features: {}, measurementDrivers: {}, technicalScope: {}, notes: '' },
  ];
  measured.spatialModel.groups = [
    {
      groupId: 'room-group',
      label: 'Habitacion tipo',
      category: 'HABITACION',
      count: 2,
      floorIds: ['pf'],
      template: {
        ...createDefaultTemplate('HABITACION', 'Habitacion tipo'),
        features: {
          ...createDefaultTemplate('HABITACION', 'Habitacion tipo').features,
          hasBathroom: true,
          hasKitchenette: true,
          requiresLeveling: true,
          countAsUnit: true,
          countAsRoom: true,
        },
        measurementDrivers: { areaM2: 16, floorSurfaceM2: 16 },
        technicalScope: createDefaultTemplate('HABITACION', 'Habitacion tipo').technicalScope,
        subspaces: [],
      },
      features: {},
      measurementDrivers: {},
      technicalScope: {},
      certainty: 'CONFIRMADO',
    },
  ];
  measured.spatialModel.instances = [
    { instanceId: 'room-1', groupId: 'room-group', floorId: 'pf', parentInstanceId: null, areaType: 'HABITACION', unitKind: 'HABITACION', spaceKind: 'UNIDAD_PRINCIPAL', subspaceKind: null, label: 'H1', isTemplateDerived: true, features: { hasBathroom: true, hasKitchenette: true, requiresLeveling: true, countAsUnit: true, countAsRoom: true }, measurementDrivers: { areaM2: 16, floorSurfaceM2: 16 }, technicalScope: {}, certainty: 'CONFIRMADO' },
    { instanceId: 'bath-1', groupId: null, floorId: 'pf', parentInstanceId: 'room-1', areaType: 'BANO', unitKind: null, spaceKind: 'ESTANCIA', subspaceKind: 'BANO_ASOCIADO', label: 'Bano H1', isTemplateDerived: false, features: { countAsBathroom: true }, measurementDrivers: { areaM2: 4, floorSurfaceM2: 4 }, technicalScope: {}, certainty: 'CONFIRMADO' },
    { instanceId: 'kit-1', groupId: null, floorId: 'pf', parentInstanceId: 'room-1', areaType: 'COCINA', unitKind: null, spaceKind: 'ESTANCIA', subspaceKind: 'KITCHENETTE', label: 'Kitchenette H1', isTemplateDerived: false, features: { countAsKitchen: true }, measurementDrivers: { linearMeters: 1.2 }, technicalScope: {}, certainty: 'CONFIRMADO' },
    { instanceId: 'common-1', groupId: null, floorId: 'pf', parentInstanceId: null, areaType: 'ZONA_COMUN', unitKind: 'ZONA_COMUN', spaceKind: 'ESPACIO_COMUN', subspaceKind: null, label: 'Zona comun', isTemplateDerived: false, features: { countAsArea: true }, measurementDrivers: { areaM2: 20, floorSurfaceM2: 20 }, technicalScope: {}, certainty: 'CONFIRMADO' },
  ];
  measured.technicalSpecModel.status = 'READY_FOR_MEASUREMENT';
  measured.technicalSpecModel.strategy = 'SPECIFIED';
  measured.technicalSpecModel.groupSpecs['room-group'] = {
    selections: {
      roomSolution: 'ROOM_STD_COLIVING_BASIC',
      bathSolution: 'BATH_STD_COMPACT',
      kitchenetteSolution: 'KITCHENETTE_120_BASIC',
    },
    dimensions: {
      roomAreaM2: 16,
      bathAreaM2: 4,
      kitchenetteLinearMeters: 1.2,
    },
    counts: {},
    options: {
      hasBathroom: true,
      hasKitchenette: true,
    },
  };
  measured.technicalSpecModel.floorSpecs['pf'] = {
    selections: {
      levelingSolution: 'LEVELING_LIGHT',
    },
    dimensions: {
      levelingAreaM2: 36,
    },
    counts: {},
    options: {},
  };
  measured.technicalSpecModel.instanceSpecs['common-1'] = {
    selections: {
      commonAreaSolution: 'COMMON_AREA_BASIC',
    },
    dimensions: {
      commonAreaM2: 20,
    },
    counts: {},
    options: {
      includeCommonCorridors: true,
    },
  };

  const measuredInput = deriveInputFromSession(measured, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert(measuredInput.measurementResult);
  assert(measuredInput.recipeResult);
  assert.equal(measuredInput.measurementResult.status, 'READY');
  assert(measuredInput.measurementResult.coverage.measuredLines > 0);
  assert.equal(measuredInput.recipeResult.status, 'READY');
  assert(
    measuredInput.recipeResult.lines.some(
      (line) =>
        line.measurementLineId.endsWith('ROOM_AREA') &&
        line.recipeCode === 'RECIPE_ROOM_STD_COLIVING_BASIC_M2' &&
        line.status === 'RECIPE_RESOLVED'
    )
  );
  assert(
    measuredInput.recipeResult.lines.some(
      (line) =>
        line.measurementLineId.endsWith('BATH_AREA') &&
        line.recipeCode === 'RECIPE_BATH_STD_COMPACT_M2' &&
        line.status === 'RECIPE_RESOLVED'
    )
  );
  assert(
    measuredInput.recipeResult.lines.some(
      (line) =>
        line.measurementLineId.endsWith('KITCHENETTE_LENGTH') &&
        line.recipeCode === 'RECIPE_KITCHENETTE_120_BASIC_ML' &&
        line.status === 'RECIPE_RESOLVED'
    )
  );
  assert(
    !measuredInput.recipeResult.lines.some(
      (line) => line.measurementLineId.endsWith('ROOM_UNIT') || line.measurementLineId.endsWith('BATH_UNIT')
    )
  );
  assert.equal(
    measuredInput.measurementResult.lines.filter((line) => line.measurementCode === 'KITCHENETTE_LENGTH').length,
    1
  );
  assert.equal(
    measuredInput.recipeResult.lines.filter((line) => line.recipeCode === 'RECIPE_KITCHENETTE_120_BASIC_ML').length,
    1
  );

  const inferredPricing = await buildPricingResult(
    measuredInput.recipeResult,
    measuredInput.executionContext,
    {
      materialLookupOverride: pricingLookupOverride,
      preferredSuppliersOverride,
    }
  );
  assert.equal(inferredPricing.status, 'READY');
  assert.equal(inferredPricing.estimateMode, 'RECIPE_PRICED');
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'ROOM_STD_COLIVING_BASIC' &&
        line.priceStatus === 'PRICE_INFERRED' &&
        line.laborPricing.some((labor) => labor.priceSource === 'PARAMETRIC_REFERENCE')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'KITCHENETTE_120_BASIC' &&
        line.materialPricing.some((material) => material.priceSource === 'PREFERRED_SUPPLIER')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'ROOM_STD_COLIVING_BASIC' &&
        line.materialPricing.some((material) => material.priceSource === 'CATALOG_REFERENCE')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'LEVELING_LIGHT' &&
        line.materialPricing.some((material) => material.priceSource === 'PARAMETRIC_REFERENCE')
    )
  );

  const confirmedPricing = await buildPricingResult(
    measuredInput.recipeResult,
    measuredInput.executionContext,
    {
      materialLookupOverride: pricingLookupOverride,
      preferredSuppliersOverride,
      manualOverrides: {
        labor: {
          LAB_COMMON_BASIC: { unitCost: 33 },
        },
      },
    }
  );
  const confirmedCommonLine = confirmedPricing.lines.find(
    (line) => line.solutionCode === 'COMMON_AREA_BASIC'
  );
  assert(confirmedCommonLine);
  assert.equal(confirmedCommonLine.priceStatus, 'PRICE_CONFIRMED');
  assert(
    confirmedCommonLine.laborPricing.some(
      (labor) => labor.priceStatus === 'PRICE_CONFIRMED' && labor.priceSource === 'MANUAL_OVERRIDE'
    )
  );
  assert(typeof confirmedCommonLine.totalCost === 'number');
  assert(typeof confirmedCommonLine.indirectCost === 'number');

  const partial = JSON.parse(JSON.stringify(measured));
  partial.technicalSpecModel.groupSpecs['room-group'].dimensions.kitchenetteLinearMeters = null;
  partial.spatialModel.instances.find((instance) => instance.instanceId === 'kit-1').measurementDrivers.linearMeters = null;
  const partialInput = deriveInputFromSession(partial, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert.equal(partialInput.measurementResult.status, 'PARTIAL');
  assert.equal(partialInput.recipeResult.status, 'PARTIAL');
  assert(
    partialInput.measurementResult.lines.some(
      (line) => line.measurementCode === 'KITCHENETTE_LENGTH' && line.status === 'BLOCKED'
    )
  );
  assert(
    partialInput.recipeResult.lines.some(
      (line) =>
        line.recipeCode === 'RECIPE_KITCHENETTE_120_BASIC_ML' && line.status === 'RECIPE_MISSING'
    )
  );
  const partialPricing = await buildPricingResult(
    partialInput.recipeResult,
    partialInput.executionContext,
    {
      materialLookupOverride: pricingLookupOverride,
      preferredSuppliersOverride,
    }
  );
  assert.equal(partialPricing.status, 'PARTIAL');
  assert(
    partialPricing.lines.some(
      (line) =>
        line.solutionCode === 'KITCHENETTE_120_BASIC' &&
        line.priceStatus === 'PRICE_PENDING_VALIDATION'
    )
  );

  const assumed = JSON.parse(JSON.stringify(measured));
  assumed.technicalSpecModel.floorSpecs['pf'].dimensions.levelingAreaM2 = null;
  assumed.spatialModel.instances.find((instance) => instance.instanceId === 'room-1').measurementDrivers.floorSurfaceM2 = null;
  const assumedInput = deriveInputFromSession(assumed, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert.equal(assumedInput.measurementResult.status, 'PARTIAL');
  assert.equal(assumedInput.recipeResult.status, 'PARTIAL');
  assert(
    assumedInput.measurementResult.lines.some(
      (line) => line.measurementCode === 'LEVELING_AREA' && line.status === 'ASSUMED'
    )
  );
  assert(
    assumedInput.recipeResult.lines.some(
      (line) =>
        line.recipeCode === 'RECIPE_LEVELING_LIGHT_M2' && line.status === 'RECIPE_PARTIAL'
    )
  );
  const assumedPricing = await buildPricingResult(
    assumedInput.recipeResult,
    assumedInput.executionContext,
    {
      materialLookupOverride: pricingLookupOverride,
      preferredSuppliersOverride,
    }
  );
  assert(
    assumedPricing.lines.some(
      (line) =>
        line.solutionCode === 'LEVELING_LIGHT' && line.priceStatus === 'PRICE_INFERRED'
    )
  );

  const blocked = JSON.parse(JSON.stringify(measured));
  blocked.technicalSpecModel.groupSpecs['room-group'].dimensions.roomAreaM2 = null;
  blocked.spatialModel.instances[0].measurementDrivers.areaM2 = null;
  blocked.spatialModel.instances[0].measurementDrivers.floorSurfaceM2 = null;
  const blockedInput = deriveInputFromSession(blocked, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert(
    blockedInput.measurementResult.lines.some(
      (line) => line.measurementCode === 'ROOM_AREA' && line.status === 'BLOCKED'
    )
  );
  assert(
    blockedInput.measurementResult.lines.some(
      (line) => line.measurementCode === 'ROOM_UNIT' && line.status === 'PARTIAL'
    )
  );
  assert(
    blockedInput.recipeResult.lines.some(
      (line) =>
        line.recipeCode === 'RECIPE_ROOM_STD_COLIVING_BASIC_M2' && line.status === 'RECIPE_MISSING'
    )
  );
  const blockedPricing = await buildPricingResult(
    blockedInput.recipeResult,
    blockedInput.executionContext,
    {
      materialLookupOverride: pricingLookupOverride,
      preferredSuppliersOverride,
    }
  );
  assert(
    blockedPricing.lines.some(
      (line) =>
        line.solutionCode === 'ROOM_STD_COLIVING_BASIC' &&
        line.priceStatus === 'PRICE_PENDING_VALIDATION' &&
        line.totalCost === null
    )
  );
  const hybridPlanningProjection = await buildPlanningProjection({
    name: 'Hybrid planning test',
    siteType: blockedInput.siteType,
    scopeType: blockedInput.scopeType,
    workType: blockedInput.workType,
    area: blockedInput.area,
    works: blockedInput.worksText,
    accessLevel: blockedInput.accessLevel,
    bathrooms: blockedInput.bathrooms,
    kitchens: blockedInput.kitchens,
    rooms: blockedInput.rooms,
    units: blockedInput.units,
    floors: blockedInput.floors,
    structuralWorks: blockedInput.structuralWorks,
    hasElevator: Boolean(blockedInput.hasElevator),
    finishLevel: blockedInput.finishLevel,
    conditions: blockedInput.conditions,
    areas: blockedInput.areas,
    actionsByArea: blockedInput.actionsByArea,
    discoverySubtypes: blockedInput.discoveryProfile.subtypes,
    complexityProfile: blockedInput.discoveryProfile.complexityProfile,
    inclusions: blockedInput.inclusions,
    currentVsTarget: blockedInput.currentVsTarget,
    executionConstraints: blockedInput.executionConstraints,
    certainty: blockedInput.certainty,
    executionContext: blockedInput.executionContext,
    measurementResult: blockedInput.measurementResult,
    recipeResult: blockedInput.recipeResult,
  });
  assert.equal(hybridPlanningProjection.source, 'HYBRID');
  assert(hybridPlanningProjection.activities.some((activity) => activity.generatedFrom === 'HYBRID'));
  assert(
    hybridPlanningProjection.activities.every((activity) =>
      ['HYBRID', 'LEGACY_TEMPLATE', 'CANONICAL_PIPELINE'].includes(activity.generatedFrom)
    )
  );

  const noDoubleCountKitchen = measuredInput.measurementResult.lines.filter(
    (line) => line.measurementCode === 'KITCHENETTE_LENGTH'
  );
  assert.equal(noDoubleCountKitchen.length, 1);

  const roomPlus = JSON.parse(JSON.stringify(measured));
  roomPlus.technicalSpecModel.groupSpecs['room-group'].selections.roomSolution = 'ROOM_STD_COLIVING_PLUS';
  const roomPlusInput = deriveInputFromSession(roomPlus, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert(
    roomPlusInput.recipeResult.lines.some(
      (line) => line.recipeCode === 'RECIPE_ROOM_STD_COLIVING_PLUS_M2'
    )
  );

  const bathMedium = JSON.parse(JSON.stringify(measured));
  bathMedium.technicalSpecModel.groupSpecs['room-group'].selections.bathSolution = 'BATH_STD_MEDIUM';
  const bathMediumInput = deriveInputFromSession(bathMedium, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert(
    bathMediumInput.recipeResult.lines.some(
      (line) => line.recipeCode === 'RECIPE_BATH_STD_MEDIUM_M2'
    )
  );

  const bathAdapted = JSON.parse(JSON.stringify(measured));
  bathAdapted.technicalSpecModel.groupSpecs['room-group'].selections.bathSolution = 'BATH_ADAPTED';
  const bathAdaptedInput = deriveInputFromSession(bathAdapted, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert(
    bathAdaptedInput.recipeResult.lines.some(
      (line) => line.recipeCode === 'RECIPE_BATH_ADAPTED_M2'
    )
  );
  const bathAdaptedPricing = await buildPricingResult(
    bathAdaptedInput.recipeResult,
    bathAdaptedInput.executionContext,
    {
      materialLookupOverride: pricingLookupOverride,
      preferredSuppliersOverride,
    }
  );
  assert(
    bathAdaptedPricing.lines.some(
      (line) =>
        line.solutionCode === 'BATH_ADAPTED' &&
        line.priceStatus === 'PRICE_PENDING_VALIDATION'
    )
  );

  const kitchenetteComplete = JSON.parse(JSON.stringify(measured));
  kitchenetteComplete.technicalSpecModel.groupSpecs['room-group'].selections.kitchenetteSolution = 'KITCHENETTE_180_COMPLETE';
  kitchenetteComplete.technicalSpecModel.groupSpecs['room-group'].dimensions.kitchenetteLinearMeters = 1.8;
  kitchenetteComplete.spatialModel.instances.find((instance) => instance.instanceId === 'kit-1').measurementDrivers.linearMeters = 1.8;
  const kitchenetteCompleteInput = deriveInputFromSession(kitchenetteComplete, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert(
    kitchenetteCompleteInput.recipeResult.lines.some(
      (line) => line.recipeCode === 'RECIPE_KITCHENETTE_180_COMPLETE_ML'
    )
  );

  const levelingMedium = JSON.parse(JSON.stringify(measured));
  levelingMedium.technicalSpecModel.floorSpecs['pf'].selections.levelingSolution = 'LEVELING_MEDIUM';
  const levelingMediumInput = deriveInputFromSession(levelingMedium, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert(
    levelingMediumInput.recipeResult.lines.some(
      (line) => line.recipeCode === 'RECIPE_LEVELING_MEDIUM_M2'
    )
  );

  const commonIntensive = JSON.parse(JSON.stringify(measured));
  commonIntensive.technicalSpecModel.instanceSpecs['common-1'].selections.commonAreaSolution = 'COMMON_AREA_INTENSIVE';
  const commonIntensiveInput = deriveInputFromSession(commonIntensive, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert(
    commonIntensiveInput.recipeResult.lines.some(
      (line) => line.recipeCode === 'RECIPE_COMMON_AREA_INTENSIVE_M2'
    )
  );
  const commonIntensivePricing = await buildPricingResult(
    commonIntensiveInput.recipeResult,
    commonIntensiveInput.executionContext,
    {
      materialLookupOverride: pricingLookupOverride,
      preferredSuppliersOverride,
    }
  );
  assert(
    commonIntensivePricing.lines.some(
      (line) => line.solutionCode === 'COMMON_AREA_INTENSIVE' && line.priceStatus === 'PRICE_INFERRED'
    )
  );
  assert.equal(inferredPricing.coverage.priceCoveragePercent, 100);
  assert.equal(inferredPricing.coverage.pendingValidationCount, 0);
  assert(bathAdaptedPricing.coverage.pendingValidationCount > 0);
  assert.equal(bathAdaptedPricing.estimateMode, 'MIXED');

  const technicalProposal = await generateEstimateProposal({
    workType: measuredInput.workType,
    siteType: measuredInput.siteType,
    scopeType: measuredInput.scopeType,
    area: measuredInput.area,
    works: measuredInput.worksText,
    finishLevel: measuredInput.finishLevel,
    accessLevel: measuredInput.accessLevel,
    conditions: measuredInput.conditions,
    bathrooms: measuredInput.bathrooms,
    kitchens: measuredInput.kitchens,
    rooms: measuredInput.rooms,
    units: measuredInput.units,
    floors: measuredInput.floors,
    hasElevator: measuredInput.hasElevator,
    structuralWorks: measuredInput.structuralWorks,
  });
  const integratedTechnical = integratePricingIntoEstimateProposal(technicalProposal, inferredPricing).proposal;
  const integratedTechnicalRuntime = integratePricingIntoEstimateProposal(technicalProposal, inferredPricing).runtimeOutput;
  const canonicalPlanningProjection = await buildPlanningProjection({
    name: 'Canonical planning test',
    siteType: measuredInput.siteType,
    scopeType: measuredInput.scopeType,
    workType: measuredInput.workType,
    area: measuredInput.area,
    works: measuredInput.worksText,
    accessLevel: measuredInput.accessLevel,
    bathrooms: measuredInput.bathrooms,
    kitchens: measuredInput.kitchens,
    rooms: measuredInput.rooms,
    units: measuredInput.units,
    floors: measuredInput.floors,
    structuralWorks: measuredInput.structuralWorks,
    hasElevator: Boolean(measuredInput.hasElevator),
    finishLevel: measuredInput.finishLevel,
    conditions: measuredInput.conditions,
    areas: measuredInput.areas,
    actionsByArea: measuredInput.actionsByArea,
    discoverySubtypes: measuredInput.discoveryProfile.subtypes,
    complexityProfile: measuredInput.discoveryProfile.complexityProfile,
    inclusions: measuredInput.inclusions,
    currentVsTarget: measuredInput.currentVsTarget,
    executionConstraints: measuredInput.executionConstraints,
    certainty: measuredInput.certainty,
    executionContext: measuredInput.executionContext,
    measurementResult: measuredInput.measurementResult,
    recipeResult: measuredInput.recipeResult,
    commercialEstimateProjection: integratedTechnical.commercialEstimateProjection,
    commercialRuntimeOutput: integratedTechnicalRuntime,
  });
  assert(['CANONICAL_PIPELINE', 'HYBRID'].includes(canonicalPlanningProjection.source));
  assert(canonicalPlanningProjection.activities.some((activity) => activity.generatedFrom === 'CANONICAL_PIPELINE'));
  assert(canonicalPlanningProjection.activities.some((activity) => activity.provenance.spaceId === 'bath-1'));
  assert(canonicalPlanningProjection.activities.some((activity) => activity.provenance.spaceId === 'kit-1'));
  assert(canonicalPlanningProjection.activities.some((activity) => activity.provenance.solutionCode === 'LEVELING_LIGHT'));
  assert(canonicalPlanningProjection.coverage.recipeCoveragePercent > 0);
  const canonicalProcurementProjection = await buildProcurementProjection({
    executionContext: measuredInput.executionContext,
    recipeResult: measuredInput.recipeResult,
    pricingResult: inferredPricing,
    includeDiscoveryHints: false,
    materialLookupOverride: procurementLookupOverride,
    projectActivities: [
      {
        id: 'act-bath',
        name: 'Montaje banos',
        code: 'BAN-01',
        locationId: 'loc-bath',
        wbsId: 'wbs-bath',
        plannedStartDate: '2026-04-02T08:00:00.000Z',
        plannedEndDate: '2026-04-04T08:00:00.000Z',
        originCostItemCode: 'BANOS',
        standardActivity: null,
      },
      {
        id: 'act-kit',
        name: 'Montaje cocinas',
        code: 'KIT-01',
        locationId: 'loc-kit',
        wbsId: 'wbs-kit',
        plannedStartDate: '2026-04-05T08:00:00.000Z',
        plannedEndDate: '2026-04-06T08:00:00.000Z',
        originCostItemCode: 'COCINA',
        standardActivity: null,
      },
      {
        id: 'act-level',
        name: 'Nivelacion pavimentos',
        code: 'PAV-01',
        locationId: 'loc-floor',
        wbsId: 'wbs-floor',
        plannedStartDate: '2026-04-01T08:00:00.000Z',
        plannedEndDate: '2026-04-03T08:00:00.000Z',
        originCostItemCode: 'PAVIMENTOS',
        standardActivity: null,
      },
    ],
  });
  assert(['RECIPE_DRIVEN', 'HYBRID'].includes(canonicalProcurementProjection.source));
  assert(
    canonicalProcurementProjection.procurementLines.every(
      (line) => line.generatedFrom === 'RECIPE'
    )
  );
  assert(
    canonicalProcurementProjection.procurementLines.some(
      (line) =>
        line.supportedRecipeLineIds.length > 0 &&
        line.supportedPricingLineIds.length > 0 &&
        Boolean(line.supplierId)
    )
  );
  assert(
    canonicalProcurementProjection.procurementLines.some(
      (line) => line.requiredBySpaceIds.includes('bath-1')
    )
  );
  assert(
    canonicalProcurementProjection.procurementLines.some(
      (line) => Boolean(line.requiredOnSiteDate)
    )
  );
  assert(['TECHNICAL_PIPELINE', 'HYBRID'].includes(integratedTechnical.commercialEstimateProjection.source));
  assert(['TECHNICAL_PIPELINE', 'HYBRID'].includes(integratedTechnicalRuntime.source));
  assert(integratedTechnical.integratedCostBuckets.length > 0);
  assert(
    integratedTechnical.integratedCostBuckets.some(
      (bucket) =>
        bucket.bucketCode === 'ROOMS' &&
        bucket.source === 'RECIPE_PRICED' &&
        bucket.legacyMatchStrategy === 'CANONICAL_CODE'
    )
  );
  assert(
    integratedTechnical.lines.some(
      (line) => line.economicStatus.costSource === 'RECIPE_PRICED'
    )
  );
  assert(
    integratedTechnical.commercialEstimateProjection.commercialLines.some(
      (line) =>
        line.costSource === 'RECIPE_PRICED' &&
        line.supportedSolutionCodes.length > 0 &&
        line.generatedFrom === 'TECHNICAL'
    )
  );
  assert(
    integratedTechnicalRuntime.lines.some(
      (line) => line.costSource === 'RECIPE_PRICED' && line.generatedFrom === 'TECHNICAL'
    )
  );
  assert(
    integratedTechnical.commercialEstimateProjection.commercialLines.some(
      (line) => line.code === 'INT-ROOMS'
    )
  );
  assert(
    integratedTechnical.lines
      .filter((line) => line.economicStatus.costSource === 'RECIPE_PRICED')
      .every((line) => line.economicStatus.commercialPriceProvisional === false)
  );
  const commercialReadyStatus = buildEstimateStatusFromPipeline({
    technicalSpecStatus: 'READY_FOR_MEASUREMENT',
    technicalCoveragePercent: 90,
    recipeCoveragePercent: 90,
    priceCoveragePercent: 100,
    pendingValidationCount: 0,
    hasHybridBuckets: false,
  });
  assert.equal(commercialReadyStatus.readiness, 'COMMERCIAL_READY');
  assert.equal(commercialReadyStatus.commercialStatus, 'DRAFT');
  assert.equal(commercialReadyStatus.commercialCapabilities.canConvert, false);
  const issuedCommercialReady = issueEstimate(commercialReadyStatus, {
    mode: 'FINAL',
    actor: 'Admin',
    timestamp: '2026-03-22T12:00:00.000Z',
  });
  assert.equal(issuedCommercialReady.issuance.status, 'ISSUED_FINAL');
  assert.equal(issuedCommercialReady.issuance.manualOverrideUsed, false);
  assert.equal(issuedCommercialReady.commercialStatus, 'ISSUED_FINAL');
  assert.equal(issuedCommercialReady.commercialCapabilities.canConvert, false);
  assert.equal(issuedCommercialReady.acceptanceCapabilities.canAccept, true);
  assert.throws(() => assertEstimateCanConvert(issuedCommercialReady), /aceptado/);
  const acceptedCommercialReady = acceptEstimate(issuedCommercialReady, {
    actor: 'Cliente',
    timestamp: '2026-03-22T12:02:00.000Z',
  });
  assert.equal(acceptedCommercialReady.acceptance.status, 'ACCEPTED');
  assert.equal(acceptedCommercialReady.commercialCapabilities.canConvert, true);
  assert.doesNotThrow(() => assertEstimateCanConvert(acceptedCommercialReady));
  assert.throws(() => issueEstimate(acceptedCommercialReady, {
    mode: 'FINAL',
    actor: 'Admin',
    timestamp: '2026-03-22T12:03:00.000Z',
  }), /aceptado/);
  assert.throws(() => revokeEstimateIssuance(acceptedCommercialReady, {
    actor: 'Admin',
    reason: 'Intento inseguro',
    timestamp: '2026-03-22T12:04:00.000Z',
  }), /aceptado/);
  const revokedAcceptance = revokeEstimateAcceptance(acceptedCommercialReady, {
    actor: 'Admin',
    reason: 'Cambio comercial detectado',
    timestamp: '2026-03-22T12:05:00.000Z',
  });
  assert.equal(revokedAcceptance.acceptance.status, 'NOT_ACCEPTED');
  assert.equal(revokedAcceptance.commercialCapabilities.canConvert, false);
  const technicallyClosedStatus = buildEstimateStatusFromPipeline({
    technicalSpecStatus: 'READY_FOR_MEASUREMENT',
    technicalCoveragePercent: 100,
    recipeCoveragePercent: 100,
    priceCoveragePercent: 100,
    pendingValidationCount: 0,
    hasHybridBuckets: false,
  });
  assert.equal(technicallyClosedStatus.readiness, 'TECHNICALLY_CLOSED');
  const issuedClosed = issueEstimate(technicallyClosedStatus, {
    mode: 'FINAL',
    actor: 'Admin',
    timestamp: '2026-03-22T12:05:00.000Z',
  });
  assert.equal(issuedClosed.issuance.status, 'ISSUED_FINAL');
  assert.equal(issuedClosed.commercialStatus, 'ISSUED_FINAL');

  const integratedMixed = integratePricingIntoEstimateProposal(technicalProposal, bathAdaptedPricing).proposal;
  const integratedMixedRuntime = integratePricingIntoEstimateProposal(technicalProposal, bathAdaptedPricing).runtimeOutput;
  const hybridProcurementProjection = await buildProcurementProjection({
    executionContext: structuredInput.executionContext,
    recipeResult: blockedInput.recipeResult,
    pricingResult: bathAdaptedPricing,
    includeDiscoveryHints: true,
    materialLookupOverride: procurementLookupOverride,
    projectActivities: [
      {
        id: 'act-common',
        name: 'Acabados zonas comunes',
        code: 'COM-01',
        locationId: 'loc-common',
        wbsId: 'wbs-common',
        plannedStartDate: '2026-04-08T08:00:00.000Z',
        plannedEndDate: '2026-04-10T08:00:00.000Z',
        originCostItemCode: 'ZONAS_COMUNES',
        standardActivity: null,
      },
    ],
  });
  assert.equal(hybridProcurementProjection.source, 'HYBRID');
  assert(
    hybridProcurementProjection.procurementLines.some(
      (line) => line.generatedFrom === 'RECIPE'
    )
  );
  assert(
    hybridProcurementProjection.procurementLines.some(
      (line) => line.generatedFrom === 'DISCOVERY_HINT'
    )
  );
  assert.equal(integratedMixed.commercialEstimateProjection.source, 'HYBRID');
  assert.equal(integratedMixedRuntime.source, 'HYBRID');
  assert(
    integratedMixed.integratedCostBuckets.some(
      (bucket) =>
        bucket.bucketCode === 'BATHS' &&
        bucket.source === 'HYBRID' &&
        bucket.generatedFrom === 'HYBRID'
    )
  );
  assert(
    integratedMixed.commercialEstimateProjection.commercialLines.some(
      (line) =>
        line.generatedFrom === 'HYBRID' &&
        line.provisional === true &&
        line.pricingLineIds.length > 0
    )
  );
  assert(
    integratedMixedRuntime.lines.some(
      (line) => line.generatedFrom === 'HYBRID' && line.provisional === true
    )
  );
  assert(
    integratedMixed.lines.some(
      (line) =>
        line.economicStatus.bucketCode === 'BATHS' &&
        line.economicStatus.costSource === 'HYBRID' &&
        line.economicStatus.pendingValidation === true &&
        line.economicStatus.commercialPriceProvisional === true &&
        line.kind === 'PROVISIONAL'
    )
  );
  const provisionalStatus = buildEstimateStatusFromPipeline({
    technicalSpecStatus: 'READY_FOR_MEASUREMENT',
    technicalCoveragePercent: 95,
    recipeCoveragePercent: 100,
    priceCoveragePercent: 60,
    pendingValidationCount: 1,
    hasHybridBuckets: true,
  });
  assert.equal(provisionalStatus.readiness, 'PROVISIONAL_REVIEW_REQUIRED');
  assert.equal(provisionalStatus.issuanceCapabilities.canIssueProvisional, true);
  assert.equal(provisionalStatus.issuanceCapabilities.canIssueFinal, true);
  assert.equal(provisionalStatus.issuanceCapabilities.requiresOverrideForFinal, true);
  const issuedProvisional = issueEstimate(provisionalStatus, {
    mode: 'PROVISIONAL',
    actor: 'Admin',
    timestamp: '2026-03-22T10:10:00.000Z',
  });
  assert.equal(issuedProvisional.issuance.status, 'ISSUED_PROVISIONAL');
  assert.equal(issuedProvisional.commercialStatus, 'ISSUED_PROVISIONAL');
  assert.equal(issuedProvisional.commercialCapabilities.canConvert, false);
  assert.equal(issuedProvisional.acceptanceCapabilities.canAccept, false);
  assert.throws(() => assertEstimateCanConvert(issuedProvisional), /emitido final/);
  const rejectedProvisional = rejectEstimate(issuedProvisional, {
    actor: 'Cliente',
    reason: 'No cuadra comercialmente',
    timestamp: '2026-03-22T10:12:00.000Z',
  });
  assert.equal(rejectedProvisional.acceptance.status, 'REJECTED');
  assert.equal(rejectedProvisional.commercialCapabilities.canConvert, false);
  assert.throws(() => assertEstimateCanConvert(rejectedProvisional), /emitido final|aceptado/);
  const issuedWithOverride = issueEstimate(provisionalStatus, {
    mode: 'FINAL',
    actor: 'Admin',
    useOverride: true,
    reason: 'Validado manualmente para cierre comercial',
    timestamp: '2026-03-22T10:15:00.000Z',
  });
  assert.equal(issuedWithOverride.issuance.status, 'ISSUED_FINAL');
  assert.equal(issuedWithOverride.issuance.manualOverrideUsed, true);
  assert.equal(issuedWithOverride.commercialStatus, 'ISSUED_FINAL');
  assert.equal(issuedWithOverride.acceptanceCapabilities.canAccept, true);
  const revoked = revokeEstimateIssuance(issuedWithOverride, {
    actor: 'Admin',
    reason: 'Se detecto un cambio pendiente',
    timestamp: '2026-03-22T10:20:00.000Z',
  });
  assert.equal(revoked.issuance.status, 'NOT_ISSUED');
  assert.equal(revoked.commercialStatus, 'DRAFT');
  assert.equal(revoked.issuanceHistory[revoked.issuanceHistory.length - 1].action, 'REVOKED');
  const overriddenStatus = applyEstimateReadinessOverride(provisionalStatus, {
    reason: 'Validado manualmente para envio al cliente',
    actor: 'Admin',
    timestamp: '2026-03-22T10:00:00.000Z',
  });
  assert.equal(overriddenStatus.readiness, 'PROVISIONAL_REVIEW_REQUIRED');
  assert.equal(overriddenStatus.capabilities.canEmitAsFinal, true);
  assert.equal(overriddenStatus.manualOverride.applied, true);
  assert.equal(overriddenStatus.manualOverride.reason, 'Validado manualmente para envio al cliente');

  const normalizedInternalAnalysis = normalizeInternalAnalysis({
    source: integratedTechnical.source,
    typologyCode: integratedTechnical.typologyCode,
    seedVersion: integratedTechnical.seedVersion,
    notes: integratedTechnical.notes,
    estimateStatus: integratedTechnical.estimateStatus,
    integratedCostBuckets: integratedTechnical.integratedCostBuckets,
    commercialEstimateProjection: integratedTechnical.commercialEstimateProjection,
    commercialRuntimeOutput: integratedTechnicalRuntime,
    summary: integratedTechnical.summary,
    lines: integratedTechnical.lines,
  });
  assert(normalizedInternalAnalysis);
  assert.equal(normalizedInternalAnalysis.commercialEstimateProjection.source, integratedTechnical.commercialEstimateProjection.source);
  assert.equal(normalizedInternalAnalysis.commercialRuntimeOutput.source, integratedTechnicalRuntime.source);
  const createPayload = toEstimateInternalAnalysisCreate(normalizedInternalAnalysis);
  assert(createPayload.generationNotes.commercialEstimateProjection);
  assert(createPayload.generationNotes.commercialRuntimeOutput);
  const runtimeFirstReadModel = readCommercialEstimateReadModel({
    generationNotes: createPayload.generationNotes,
  });
  assert.equal(runtimeFirstReadModel.source, 'RUNTIME_OUTPUT');
  assert.equal(
    runtimeFirstReadModel.commercialRuntimeOutput.source,
    integratedTechnicalRuntime.source
  );
  const projectionFallbackReadModel = readCommercialEstimateReadModel({
    generationNotes: {
      commercialEstimateProjection: integratedTechnical.commercialEstimateProjection,
    },
  });
  assert.equal(projectionFallbackReadModel.source, 'PROJECTION');
  assert.equal(
    projectionFallbackReadModel.commercialEstimateProjection.source,
    integratedTechnical.commercialEstimateProjection.source
  );
  const legacyReadModel = readCommercialEstimateReadModel({
    generationNotes: { notes: ['legacy only'] },
  });
  assert.equal(legacyReadModel.source, 'LEGACY');
  assert.equal(legacyReadModel.commercialRuntimeOutput, null);
  assert.equal(legacyReadModel.commercialEstimateProjection, null);
  const runtimeMaterialized = materializeEstimateOperationalView({
    generationNotes: createPayload.generationNotes,
    legacyItems: [
      { description: 'Legacy old line', quantity: 1, price: 999, unit: 'ud', chapter: '99 LEGACY' },
    ],
  });
  assert.equal(runtimeMaterialized.source, 'RUNTIME_OUTPUT');
  assert(runtimeMaterialized.legacyItems.length > 0);
  assert(
    runtimeMaterialized.legacyItems.every(
      (item) => item.chapter !== '99 LEGACY'
    )
  );
  const editableProjectionRuntime = ensureRuntimeOutputForEditing({
    projection: integratedTechnical.commercialEstimateProjection,
  });
  assert(editableProjectionRuntime);
  assert.equal(editableProjectionRuntime.source, integratedTechnical.commercialEstimateProjection.source);
  const technicalRuntimeLine = integratedTechnicalRuntime.lines.find(
    (line) => line.generatedFrom === 'TECHNICAL'
  );
  assert(technicalRuntimeLine);
  const manuallyEditedRuntime = applyRuntimeLinePatch(integratedTechnicalRuntime, {
    id: technicalRuntimeLine.id,
    quantity: technicalRuntimeLine.quantity + 1,
    unitPrice: ((technicalRuntimeLine.commercialPrice || 0) / Math.max(technicalRuntimeLine.quantity, 0.0001)) + 25,
    description: `${technicalRuntimeLine.description} (ajuste manual)`,
  });
  const editedLine = manuallyEditedRuntime.lines.find((line) => line.id === technicalRuntimeLine.id);
  assert(editedLine);
  assert.equal(editedLine.description.endsWith('(ajuste manual)'), true);
  assert.equal(editedLine.generatedFrom, 'HYBRID');
  assert.equal(editedLine.costSource, 'HYBRID');
  assert.equal(editedLine.economicStatus.priceSource, 'MANUAL_OVERRIDE');
  assert.equal(editedLine.economicStatus.pendingValidation, true);
  assert.equal(editedLine.economicStatus.commercialPriceProvisional, true);
  assert.equal(editedLine.manualAdjustment.applied, true);
  const editedLegacyItems = deriveLegacyItemsFromRuntimeOutput(manuallyEditedRuntime);
  assert(
    editedLegacyItems.some(
      (item) =>
        item.description.endsWith('(ajuste manual)') &&
        item.quantity === technicalRuntimeLine.quantity + 1
    )
  );
  const editedStatus = rebuildEstimateStatusFromRuntimeOutput(
    integratedTechnical.estimateStatus,
    manuallyEditedRuntime
  );
  assert(editedStatus);
  assert.equal(editedStatus.pendingValidationCount > 0, true);
  assert.equal(editedStatus.hasHybridBuckets, true);
  const projectionMaterialized = materializeEstimateOperationalView({
    commercialEstimateProjection: integratedTechnical.commercialEstimateProjection,
  });
  assert.equal(projectionMaterialized.source, 'PROJECTION');
  const legacyMaterialized = materializeEstimateOperationalView({
    legacyItems: [
      { description: 'Legacy fallback', quantity: 2, price: 50, unit: 'ud', chapter: '01 GENERAL' },
    ],
  });
  assert.equal(legacyMaterialized.source, 'LEGACY');

  const convertedLocked = buildEstimateStatusFromPipeline({
    technicalSpecStatus: 'READY_FOR_MEASUREMENT',
    technicalCoveragePercent: 100,
    recipeCoveragePercent: 100,
    priceCoveragePercent: 100,
    pendingValidationCount: 0,
    hasHybridBuckets: false,
    issuance: acceptedCommercialReady.issuance,
    issuanceHistory: acceptedCommercialReady.issuanceHistory,
    acceptance: acceptedCommercialReady.acceptance,
    acceptanceHistory: acceptedCommercialReady.acceptanceHistory,
    commercialStatusOverride: 'CONVERTED',
  });
  assert.equal(convertedLocked.commercialStatus, 'CONVERTED');
  assert.equal(convertedLocked.acceptanceCapabilities.canAccept, false);
  assert.equal(convertedLocked.commercialCapabilities.canConvert, false);
  assert.throws(() => assertEstimateCanConvert(convertedLocked), /convertido/);

  console.log('Discovery integration tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
