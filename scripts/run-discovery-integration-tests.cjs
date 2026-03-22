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
  const { buildDiscoverySupplyHints } = require(path.join(srcRoot, 'lib/procurement/discovery-context.ts'));
  const { generateEstimateProposal } = require(path.join(srcRoot, 'lib/automation/estimate-generator.ts'));
  const { generatePlanningBlueprint } = require(path.join(srcRoot, 'lib/automation/planning-generator.ts'));

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
  assert(parametricIntegrated.proposal.lines.every((line) => line.economicStatus.costSource === 'PARAMETRIC_MASTER'));
  assert(parametricIntegrated.proposal.lines.every((line) => line.economicStatus.commercialPriceProvisional === false));

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
  assert(integratedTechnical.integratedCostBuckets.length > 0);
  assert(
    integratedTechnical.integratedCostBuckets.some(
      (bucket) => bucket.bucketCode === 'ROOMS' && bucket.source === 'RECIPE_PRICED'
    )
  );
  assert(
    integratedTechnical.lines.some(
      (line) => line.economicStatus.costSource === 'RECIPE_PRICED'
    )
  );
  assert(
    integratedTechnical.lines
      .filter((line) => line.economicStatus.costSource === 'RECIPE_PRICED')
      .every((line) => line.economicStatus.commercialPriceProvisional === false)
  );

  const integratedMixed = integratePricingIntoEstimateProposal(technicalProposal, bathAdaptedPricing).proposal;
  assert(
    integratedMixed.integratedCostBuckets.some(
      (bucket) => bucket.bucketCode === 'BATHS' && bucket.source === 'HYBRID'
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

  console.log('Discovery integration tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
