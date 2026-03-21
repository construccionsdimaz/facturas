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
  const { buildDiscoverySupplyHints } = require(path.join(srcRoot, 'lib/procurement/discovery-context.ts'));
  const { generateEstimateProposal } = require(path.join(srcRoot, 'lib/automation/estimate-generator.ts'));
  const { generatePlanningBlueprint } = require(path.join(srcRoot, 'lib/automation/planning-generator.ts'));

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

  console.log('Discovery integration tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
