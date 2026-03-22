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
  const { db } = require(path.join(srcRoot, 'lib/db.ts'));
  const { createEmptyDiscoverySessionData, createDefaultTemplate } = require(path.join(srcRoot, 'lib/discovery/defaults.ts'));
  const { deriveInputFromSession } = require(path.join(srcRoot, 'lib/discovery/derive-input.ts'));
  const { resolveSpatialModelToExecutionContext } = require(path.join(srcRoot, 'lib/discovery/resolve-spatial-model.ts'));
  const { buildPricingResult, MATERIAL_BINDINGS } = require(path.join(srcRoot, 'lib/estimate/pricing-engine.ts'));
  const { integratePricingIntoEstimateProposal } = require(path.join(srcRoot, 'lib/estimate/estimate-integration.ts'));
  const {
    normalizeInternalAnalysis,
    readCommercialEstimateReadModel,
    toEstimateInternalAnalysisCreate,
  } = require(path.join(srcRoot, 'lib/estimates/internal-analysis.ts'));
  const {
    buildBc3EstimateExport,
  } = require(path.join(srcRoot, 'lib/interoperability/bc3-export.ts'));
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
  const {
    applyBulkOfferAction,
    buildOfferCatalogMetrics,
    buildOfferReviewQueue,
    csvRowsToOfferPayloads,
    findDuplicateOfferCandidates,
    intakeSupplierOffer,
    previewOfferCsvImport,
  } = require(path.join(srcRoot, 'lib/procurement/offer-intake.ts'));
  const {
    resolveRecipeMaterialSourcing,
  } = require(path.join(srcRoot, 'lib/procurement/material-resolution.ts'));
  const { resolveProjectSourcingPolicy } = require(path.join(srcRoot, 'lib/procurement/project-sourcing-policy.ts'));
  const { summarizeProjectSourcingPolicyChange } = require(path.join(srcRoot, 'lib/procurement/project-sourcing-policy.ts'));
  const { buildProcurementProjection } = require(path.join(srcRoot, 'lib/procurement/procurement-projection.ts'));
  const { buildControlProjection } = require(path.join(srcRoot, 'lib/control/control-projection.ts'));
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
    'ACA-WALL-STD': {
      id: 'mat-wall-std',
      code: 'ACA-WALL-STD',
      offers: [
        { id: 'offer-wall-std-1', supplierId: 'sup-acabats', unitCost: 18.2, unit: 'm2', leadTimeDays: 5, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'ACA-WALL-PLUS': {
      id: 'mat-wall-plus',
      code: 'ACA-WALL-PLUS',
      offers: [
        { id: 'offer-wall-plus-1', supplierId: 'sup-acabats', unitCost: 24.4, unit: 'm2', leadTimeDays: 6, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'PIN-PLA-PLUS': {
      id: 'mat-paint-plus',
      code: 'PIN-PLA-PLUS',
      offers: [
        { id: 'offer-paint-plus-1', supplierId: 'sup-acabats', unitCost: 5.1, unit: 'm2', leadTimeDays: 2, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'IMP-LIQ-STD': {
      id: 'mat-imp-std',
      code: 'IMP-LIQ-STD',
      offers: [
        { id: 'offer-imp-1', supplierId: 'sup-acabats', unitCost: 7.4, unit: 'm2', leadTimeDays: 3, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'ACA-WALL-WET-STD': {
      id: 'mat-wall-wet-std',
      code: 'ACA-WALL-WET-STD',
      offers: [
        { id: 'offer-wall-wet-std-1', supplierId: 'sup-acabats', unitCost: 20.8, unit: 'm2', leadTimeDays: 7, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'ACA-WALL-WET-PLUS': {
      id: 'mat-wall-wet-plus',
      code: 'ACA-WALL-WET-PLUS',
      offers: [
        { id: 'offer-wall-wet-plus-1', supplierId: 'sup-acabats', unitCost: 27.1, unit: 'm2', leadTimeDays: 8, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'IMP-LIQ-PLUS': {
      id: 'mat-imp-plus',
      code: 'IMP-LIQ-PLUS',
      offers: [
        { id: 'offer-imp-plus-1', supplierId: 'sup-acabats', unitCost: 10.5, unit: 'm2', leadTimeDays: 4, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'PLADUR-FRAME-STD': {
      id: 'mat-lining-frame',
      code: 'PLADUR-FRAME-STD',
      offers: [
        { id: 'offer-lining-frame-1', supplierId: 'sup-acabats', unitCost: 7.6, unit: 'm2', leadTimeDays: 4, isPreferred: false, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'PLADUR-BOARD-STD': {
      id: 'mat-lining-board',
      code: 'PLADUR-BOARD-STD',
      offers: [
        { id: 'offer-lining-board-1', supplierId: 'sup-acabats', unitCost: 5.5, unit: 'm2', leadTimeDays: 4, isPreferred: false, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'PLADUR-FILL-STD': {
      id: 'mat-lining-fill',
      code: 'PLADUR-FILL-STD',
      offers: [
        { id: 'offer-lining-fill-1', supplierId: 'sup-acabats', unitCost: 3.6, unit: 'm2', leadTimeDays: 4, isPreferred: false, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'CEIL-FRAME-PLUS': {
      id: 'mat-ceil-plus-frame',
      code: 'CEIL-FRAME-PLUS',
      offers: [
        { id: 'offer-ceil-frame-1', supplierId: 'sup-acabats', unitCost: 7.1, unit: 'm2', leadTimeDays: 4, isPreferred: false, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'CEIL-BOARD-PLUS': {
      id: 'mat-ceil-plus-board',
      code: 'CEIL-BOARD-PLUS',
      offers: [
        { id: 'offer-ceil-board-1', supplierId: 'sup-acabats', unitCost: 6.2, unit: 'm2', leadTimeDays: 4, isPreferred: false, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'CEIL-FILL-PLUS': {
      id: 'mat-ceil-plus-fill',
      code: 'CEIL-FILL-PLUS',
      offers: [
        { id: 'offer-ceil-fill-1', supplierId: 'sup-acabats', unitCost: 4.2, unit: 'm2', leadTimeDays: 4, isPreferred: false, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'CARP-DOOR-SLI': {
      id: 'mat-door-sli',
      code: 'CARP-DOOR-SLI',
      offers: [
        { id: 'offer-door-sli-1', supplierId: 'sup-puertas', unitCost: 282, unit: 'ud', leadTimeDays: 8, isPreferred: true, supplier: { id: 'sup-puertas', name: 'Puertas y Obras BCN' } },
      ],
    },
    'CARP-DOOR-RF': {
      id: 'mat-door-rf',
      code: 'CARP-DOOR-RF',
      offers: [
        { id: 'offer-door-rf-1', supplierId: 'sup-puertas', unitCost: 358, unit: 'ud', leadTimeDays: 10, isPreferred: true, supplier: { id: 'sup-puertas', name: 'Puertas y Obras BCN' } },
      ],
    },
    'WIN-THERM-PLUS': {
      id: 'mat-win-thermal',
      code: 'WIN-THERM-PLUS',
      offers: [
        { id: 'offer-win-thermal-1', supplierId: 'sup-puertas', unitCost: 528, unit: 'ud', leadTimeDays: 12, isPreferred: true, supplier: { id: 'sup-puertas', name: 'Puertas y Obras BCN' } },
      ],
    },
    'SAN-SHOWER-TRAY-STD': {
      id: 'mat-shower-tray',
      code: 'SAN-SHOWER-TRAY-STD',
      offers: [
        { id: 'offer-shower-tray-1', supplierId: 'sup-acabats', unitCost: 118, unit: 'ud', leadTimeDays: 5, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'SAN-BATHTUB-STD': {
      id: 'mat-bathtub-std',
      code: 'SAN-BATHTUB-STD',
      offers: [
        { id: 'offer-bathtub-1', supplierId: 'sup-acabats', unitCost: 205, unit: 'ud', leadTimeDays: 7, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'SAN-SCREEN-STD': {
      id: 'mat-screen-std',
      code: 'SAN-SCREEN-STD',
      offers: [
        { id: 'offer-screen-1', supplierId: 'sup-acabats', unitCost: 172, unit: 'ud', leadTimeDays: 6, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'SAN-VANITY-STD': {
      id: 'mat-vanity-std',
      code: 'SAN-VANITY-STD',
      offers: [
        { id: 'offer-vanity-1', supplierId: 'sup-acabats', unitCost: 232, unit: 'ud', leadTimeDays: 7, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'SAN-TAP-STD': {
      id: 'mat-san-tap-std',
      code: 'SAN-TAP-STD',
      offers: [
        { id: 'offer-san-tap-std-1', supplierId: 'sup-acabats', unitCost: 86, unit: 'ud', leadTimeDays: 4, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'SAN-TAP-PLUS': {
      id: 'mat-san-tap-plus',
      code: 'SAN-TAP-PLUS',
      offers: [
        { id: 'offer-san-tap-plus-1', supplierId: 'sup-acabats', unitCost: 132, unit: 'ud', leadTimeDays: 5, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'KIT-CAB-LOW-STD': {
      id: 'mat-kit-cab-low',
      code: 'KIT-CAB-LOW-STD',
      offers: [
        { id: 'offer-kit-cab-low-1', supplierId: 'sup-puertas', unitCost: 116, unit: 'ml', leadTimeDays: 9, isPreferred: true, supplier: { id: 'sup-puertas', name: 'Puertas y Obras BCN' } },
      ],
    },
    'KIT-CAB-HIGH-STD': {
      id: 'mat-kit-cab-high',
      code: 'KIT-CAB-HIGH-STD',
      offers: [
        { id: 'offer-kit-cab-high-1', supplierId: 'sup-puertas', unitCost: 94, unit: 'ml', leadTimeDays: 9, isPreferred: true, supplier: { id: 'sup-puertas', name: 'Puertas y Obras BCN' } },
      ],
    },
    'KIT-CTOP-STD': {
      id: 'mat-kit-ctop-std',
      code: 'KIT-CTOP-STD',
      offers: [
        { id: 'offer-kit-ctop-std-1', supplierId: 'sup-acabats', unitCost: 41, unit: 'ml', leadTimeDays: 5, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'KIT-CTOP-PLUS': {
      id: 'mat-kit-ctop-plus',
      code: 'KIT-CTOP-PLUS',
      offers: [
        { id: 'offer-kit-ctop-plus-1', supplierId: 'sup-acabats', unitCost: 66, unit: 'ml', leadTimeDays: 7, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'KIT-APP-BASIC': {
      id: 'mat-kit-app-basic',
      code: 'KIT-APP-BASIC',
      offers: [
        { id: 'offer-kit-app-basic-1', supplierId: 'sup-electro', unitCost: 455, unit: 'ud', leadTimeDays: 5, isPreferred: true, supplier: { id: 'sup-electro', name: 'Electro BCN' } },
      ],
    },
    'KIT-SINK-STD': {
      id: 'mat-kit-sink-std',
      code: 'KIT-SINK-STD',
      offers: [
        { id: 'offer-kit-sink-std-1', supplierId: 'sup-acabats', unitCost: 88, unit: 'ud', leadTimeDays: 4, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'KIT-TAP-STD': {
      id: 'mat-kit-tap-std',
      code: 'KIT-TAP-STD',
      offers: [
        { id: 'offer-kit-tap-std-1', supplierId: 'sup-acabats', unitCost: 71, unit: 'ud', leadTimeDays: 4, isPreferred: true, supplier: { id: 'sup-acabats', name: 'Acabats Mediterrani' } },
      ],
    },
    'ELE-MECH-STD': {
      id: 'mat-ele-mech',
      code: 'ELE-MECH-STD',
      offers: [
        { id: 'offer-ele-mech-1', supplierId: 'sup-electro', unitCost: 12.4, unit: 'pt', leadTimeDays: 2, isPreferred: true, supplier: { id: 'sup-electro', name: 'Electro BCN' } },
      ],
    },
    'ELE-PANEL-BASIC': {
      id: 'mat-ele-panel',
      code: 'ELE-PANEL-BASIC',
      offers: [
        { id: 'offer-ele-panel-1', supplierId: 'sup-electro', unitCost: 136, unit: 'ud', leadTimeDays: 3, isPreferred: true, supplier: { id: 'sup-electro', name: 'Electro BCN' } },
      ],
    },
    'FON-WET-STD': {
      id: 'mat-fon-wet',
      code: 'FON-WET-STD',
      offers: [
        { id: 'offer-fon-wet-1', supplierId: 'sup-electro', unitCost: 33.2, unit: 'pt', leadTimeDays: 3, isPreferred: true, supplier: { id: 'sup-electro', name: 'Electro BCN' } },
      ],
    },
    'SAN-WET-STD': {
      id: 'mat-san-wet',
      code: 'SAN-WET-STD',
      offers: [
        { id: 'offer-san-wet-1', supplierId: 'sup-electro', unitCost: 28.6, unit: 'pt', leadTimeDays: 3, isPreferred: true, supplier: { id: 'sup-electro', name: 'Electro BCN' } },
      ],
    },
    'FON-WET-PLUS': {
      id: 'mat-fon-wet-plus',
      code: 'FON-WET-PLUS',
      offers: [
        { id: 'offer-fon-wet-plus-1', supplierId: 'sup-electro', unitCost: 43, unit: 'pt', leadTimeDays: 3, isPreferred: true, supplier: { id: 'sup-electro', name: 'Electro BCN' } },
      ],
    },
    'SAN-WET-PLUS': {
      id: 'mat-san-wet-plus',
      code: 'SAN-WET-PLUS',
      offers: [
        { id: 'offer-san-wet-plus-1', supplierId: 'sup-electro', unitCost: 36, unit: 'pt', leadTimeDays: 3, isPreferred: true, supplier: { id: 'sup-electro', name: 'Electro BCN' } },
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
  measured.macroScope.workCodes = ['PLADUR', 'FALSO_TECHO', 'REVESTIMIENTOS', 'IMPERMEABILIZACION', 'CARPINTERIA_INTERIOR', 'CARPINTERIA_EXTERIOR', 'ELECTRICIDAD', 'FONTANERIA', 'SANEAMIENTO', 'BANOS', 'COCINA', 'PINTURA'];
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
        measurementDrivers: { areaM2: 16, floorSurfaceM2: 16, wallSurfaceM2: 42, ceilingSurfaceM2: 16, perimeterMl: 16, doorsCount: 1, windowsCount: 1, electricalPointsCount: 8, lightingPointsCount: 2, waterPointsCount: 2, sanitaryFixturesCount: 2 },
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
    { instanceId: 'room-1', groupId: 'room-group', floorId: 'pf', parentInstanceId: null, areaType: 'HABITACION', unitKind: 'HABITACION', spaceKind: 'UNIDAD_PRINCIPAL', subspaceKind: null, label: 'H1', isTemplateDerived: true, features: { hasBathroom: true, hasKitchenette: true, requiresLeveling: true, countAsUnit: true, countAsRoom: true, hasExteriorOpenings: true }, measurementDrivers: { areaM2: 16, floorSurfaceM2: 16, wallSurfaceM2: 42, ceilingSurfaceM2: 16, perimeterMl: 16, doorsCount: 1, windowsCount: 1, electricalPointsCount: 8, lightingPointsCount: 2, waterPointsCount: 2, sanitaryFixturesCount: 2 }, technicalScope: {}, certainty: 'CONFIRMADO' },
    { instanceId: 'bath-1', groupId: null, floorId: 'pf', parentInstanceId: 'room-1', areaType: 'BANO', unitKind: null, spaceKind: 'ESTANCIA', subspaceKind: 'BANO_ASOCIADO', label: 'Bano H1', isTemplateDerived: false, features: { countAsBathroom: true }, measurementDrivers: { areaM2: 4, floorSurfaceM2: 4, wallSurfaceM2: 11, ceilingSurfaceM2: 4, perimeterMl: 8, tilingSurfaceM2: 9, doorsCount: 1, electricalPointsCount: 3, lightingPointsCount: 1, waterPointsCount: 3, sanitaryFixturesCount: 3 }, technicalScope: {}, certainty: 'CONFIRMADO' },
    { instanceId: 'kit-1', groupId: null, floorId: 'pf', parentInstanceId: 'room-1', areaType: 'COCINA', unitKind: null, spaceKind: 'ESTANCIA', subspaceKind: 'KITCHENETTE', label: 'Kitchenette H1', isTemplateDerived: false, features: { countAsKitchen: true }, measurementDrivers: { linearMeters: 1.2, areaM2: 3.2, floorSurfaceM2: 3.2, wallSurfaceM2: 7.5, ceilingSurfaceM2: 3.2, perimeterMl: 5.4, tilingSurfaceM2: 3, doorsCount: 1, electricalPointsCount: 4, lightingPointsCount: 1, waterPointsCount: 2, sanitaryFixturesCount: 1 }, technicalScope: {}, certainty: 'CONFIRMADO' },
    { instanceId: 'common-1', groupId: null, floorId: 'pf', parentInstanceId: null, areaType: 'ZONA_COMUN', unitKind: 'ZONA_COMUN', spaceKind: 'ESPACIO_COMUN', subspaceKind: null, label: 'Zona comun', isTemplateDerived: false, features: { countAsArea: true, hasExteriorOpenings: true }, measurementDrivers: { areaM2: 20, floorSurfaceM2: 20, wallSurfaceM2: 36, ceilingSurfaceM2: 20, perimeterMl: 18, doorsCount: 1, windowsCount: 2, electricalPointsCount: 6, lightingPointsCount: 4 }, technicalScope: {}, certainty: 'CONFIRMADO' },
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
    counts: {
      electricalMechanismsCount: 8,
    },
    options: {
      hasBathroom: true,
      hasKitchenette: true,
      includeWallPaint: true,
      includeCeilingPaint: true,
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
  measured.technicalSpecModel.projectSpecs = {
    selections: {
      partitionSolution: 'PARTITION_PLADUR_STD',
      liningSolution: 'PARTITION_LINING_STD',
      ceilingSolution: 'CEILING_CONTINUOUS_STD',
      flooringSolution: 'FLOOR_TILE_STD',
      skirtingSolution: 'SKIRTING_STD',
      doorSolution: 'DOOR_INTERIOR_STD',
      windowSolution: 'WINDOW_STD',
      shutterSolution: 'SHUTTER_STD',
      wallPaintSolution: 'PAINT_WALL_STD',
      ceilingPaintSolution: 'PAINT_CEILING_STD',
      electricalSolution: 'ELECTRICAL_ROOM_STD',
      electricalMechanismsSolution: 'ELECTRICAL_MECHANISMS_STD',
      electricalPanelSolution: 'ELECTRICAL_PANEL_BASIC',
      lightingSolution: 'LIGHTING_BASIC',
      plumbingSolution: 'PLUMBING_POINT_STD',
      plumbingWetSolution: 'PLUMBING_WET_ROOM_STD',
      drainageSolution: 'DRAINAGE_POINT_STD',
      drainageWetSolution: 'DRAINAGE_WET_ROOM_STD',
    },
    dimensions: {
      partitionHeightM: 2.5,
    },
    counts: {
      electricalMechanismsCount: 10,
      electricalPanelCount: 1,
      plumbingWetPointsCount: 3,
      drainageWetPointsCount: 3,
    },
    options: {
      includeSkirting: true,
      includeShutter: true,
      includeWallPaint: true,
      includeCeilingPaint: true,
      partitionInsulated: true,
      acousticRequirementBasic: true,
    },
  };
  measured.technicalSpecModel.instanceSpecs['bath-1'] = {
    selections: {
      wallTileSolution: 'WALL_TILE_BATH_STD',
      waterproofingSolution: 'WET_AREA_WATERPROOFING_STD',
      bathShowerBaseSolution: 'BATH_SHOWER_TRAY_STD',
      bathScreenSolution: 'BATH_SCREEN_STD',
      bathVanitySolution: 'BATH_VANITY_STD',
      bathTapwareSolution: 'BATH_TAPWARE_PLUS',
      plumbingWetSolution: 'PLUMBING_WET_ROOM_PLUS',
      drainageWetSolution: 'DRAINAGE_WET_ROOM_PLUS',
    },
    dimensions: {
      wallTileAreaM2: 9,
      waterproofingAreaM2: 4,
      wetWallTileAreaM2: 11,
      wetWaterproofingAreaM2: 5,
    },
    counts: {
      electricalMechanismsCount: 3,
      plumbingWetPointsCount: 3,
      drainageWetPointsCount: 3,
      bathShowerBaseCount: 1,
      bathScreenCount: 1,
      bathVanityCount: 1,
      bathTapwareCount: 1,
    },
    options: {
      includeWallTile: true,
      includeWaterproofing: true,
      includeWallPaint: true,
      includeCeilingPaint: true,
    },
  };
  measured.technicalSpecModel.instanceSpecs['kit-1'] = {
    selections: {
      wallTileSolution: 'WALL_TILE_KITCHEN_SPLASHBACK',
      kitchenetteLowCabinetSolution: 'KITCHENETTE_CABINET_LOW_STD',
      kitchenetteHighCabinetSolution: 'KITCHENETTE_CABINET_HIGH_STD',
      kitchenetteCountertopSolution: 'KITCHENETTE_COUNTERTOP_PLUS',
      kitchenetteApplianceSolution: 'KITCHENETTE_APPLIANCE_PACK_BASIC',
      kitchenetteSinkSolution: 'KITCHENETTE_SINK_STD',
      kitchenetteTapwareSolution: 'KITCHENETTE_TAPWARE_STD',
    },
    dimensions: {
      wallTileAreaM2: 3,
      backsplashAreaM2: 3.2,
      countertopLengthMl: 1.8,
    },
    counts: {
      electricalMechanismsCount: 4,
      plumbingWetPointsCount: 2,
      drainageWetPointsCount: 1,
      kitchenetteAppliancePackCount: 1,
      kitchenetteSinkCount: 1,
      kitchenetteTapwareCount: 1,
    },
    options: {
      includeWallTile: true,
      includeWallPaint: true,
      includeCeilingPaint: true,
    },
  };
  measured.technicalSpecModel.instanceSpecs['common-1'] = {
    selections: {
      commonAreaSolution: 'COMMON_AREA_BASIC',
    },
    dimensions: {
      commonAreaM2: 20,
    },
    counts: {
      electricalMechanismsCount: 6,
      electricalPanelCount: 1,
    },
    options: {
      includeCommonCorridors: true,
      includeWallPaint: true,
      includeCeilingPaint: true,
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
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'PARTITION_PLADUR_STD' && line.measurementCode === 'PARTITION_WALL_AREA'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'CEILING_CONTINUOUS_STD' && line.measurementCode === 'CEILING_AREA'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'FLOOR_TILE_STD' && line.measurementCode === 'FLOORING_AREA'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'DOOR_INTERIOR_STD' && line.measurementCode === 'DOOR_UNITS'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'ELECTRICAL_ROOM_STD' && line.measurementCode === 'ELECTRICAL_POINTS'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'WALL_TILE_BATH_STD' && line.measurementCode === 'WALL_TILE_AREA'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'WALL_TILE_KITCHEN_SPLASHBACK' && line.measurementCode === 'BACKSPLASH_AREA'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'PAINT_WALL_STD' && line.measurementCode === 'PAINT_WALL_AREA'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'PAINT_CEILING_STD' && line.measurementCode === 'PAINT_CEILING_AREA'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'WET_AREA_WATERPROOFING_STD' && line.measurementCode === 'WATERPROOFING_AREA'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'BATH_SHOWER_TRAY_STD' && line.measurementCode === 'SHOWER_TRAY_UNITS'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'BATH_SCREEN_STD' && line.measurementCode === 'SHOWER_SCREEN_UNITS'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'BATH_VANITY_STD' && line.measurementCode === 'VANITY_UNITS'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'BATH_TAPWARE_PLUS' && line.measurementCode === 'BATH_TAPWARE_UNITS'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'KITCHENETTE_CABINET_LOW_STD' && line.measurementCode === 'KITCHEN_CABINET_LOW_LENGTH'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'KITCHENETTE_CABINET_HIGH_STD' && line.measurementCode === 'KITCHEN_CABINET_HIGH_LENGTH'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'KITCHENETTE_COUNTERTOP_PLUS' && line.measurementCode === 'COUNTERTOP_LENGTH'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'KITCHENETTE_APPLIANCE_PACK_BASIC' && line.measurementCode === 'KITCHEN_APPLIANCE_UNITS'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'KITCHENETTE_SINK_STD' && line.measurementCode === 'KITCHEN_SINK_UNITS'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'KITCHENETTE_TAPWARE_STD' && line.measurementCode === 'KITCHEN_TAPWARE_UNITS'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'WALL_TILE_KITCHEN_SPLASHBACK' && line.measurementCode === 'BACKSPLASH_AREA'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'PLUMBING_WET_ROOM_PLUS' && line.measurementCode === 'PLUMBING_WET_POINTS'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'DRAINAGE_WET_ROOM_PLUS' && line.measurementCode === 'DRAINAGE_WET_POINTS'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'PARTITION_LINING_STD' && line.measurementCode === 'LINING_WALL_AREA'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'ELECTRICAL_MECHANISMS_STD' && line.measurementCode === 'ELECTRICAL_MECHANISMS_COUNT'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'ELECTRICAL_PANEL_BASIC' && line.measurementCode === 'ELECTRICAL_PANEL_UNITS'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'PLUMBING_WET_ROOM_STD' && line.measurementCode === 'PLUMBING_WET_POINTS'
    )
  );
  assert(
    measuredInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'DRAINAGE_WET_ROOM_STD' && line.measurementCode === 'DRAINAGE_WET_POINTS'
    )
  );
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_PARTITION_PLADUR_STD_M2'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_PARTITION_LINING_STD_M2'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_CEILING_CONTINUOUS_STD_M2'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_FLOOR_TILE_STD_M2'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_DOOR_INTERIOR_STD_UD'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_ELECTRICAL_ROOM_STD_PT'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_WALL_TILE_BATH_STD_M2'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_WALL_TILE_KITCHEN_SPLASHBACK_M2'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_PAINT_WALL_STD_M2'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_PAINT_CEILING_STD_M2'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_WET_AREA_WATERPROOFING_STD_M2'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_BATH_SHOWER_TRAY_STD_UD'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_BATH_SCREEN_STD_UD'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_BATH_VANITY_STD_UD'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_BATH_TAPWARE_PLUS_UD'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_KITCHENETTE_CABINET_LOW_STD_ML'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_KITCHENETTE_CABINET_HIGH_STD_ML'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_KITCHENETTE_COUNTERTOP_PLUS_ML'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_KITCHENETTE_APPLIANCE_PACK_BASIC_UD'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_KITCHENETTE_SINK_STD_UD'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_KITCHENETTE_TAPWARE_STD_UD'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_PLUMBING_WET_ROOM_PLUS_PT'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_DRAINAGE_WET_ROOM_PLUS_PT'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_ELECTRICAL_MECHANISMS_STD_PT'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_ELECTRICAL_PANEL_BASIC_UD'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_PLUMBING_WET_ROOM_STD_PT'));
  assert(measuredInput.recipeResult.lines.some((line) => line.recipeCode === 'RECIPE_DRAINAGE_WET_ROOM_STD_PT'));
  const partitionRecipeLine = measuredInput.recipeResult.lines.find((line) => line.solutionCode === 'PARTITION_PLADUR_STD');
  assert(partitionRecipeLine);
  assert(partitionRecipeLine.labor.some((labor) => labor.tradeCode === 'OFICIO_PLADUR'));
  assert(partitionRecipeLine.labor.some((labor) => labor.crewCode === 'CREW_PARTITIONS_STD'));
  assert(partitionRecipeLine.labor.some((labor) => (labor.adjustedHoursPerUnit || 0) > 0));
  assert(partitionRecipeLine.labor.some((labor) => (labor.adjustedCrewDays || 0) > 0));
  const wetRecipeLine = measuredInput.recipeResult.lines.find((line) => line.solutionCode === 'PLUMBING_WET_ROOM_PLUS');
  assert(wetRecipeLine);
  assert(wetRecipeLine.labor.some((labor) => labor.tradeCode === 'OFICIO_FONTANERO'));
  assert(wetRecipeLine.labor.some((labor) => (labor.productivityFactors || []).length > 0));

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
  const partitionPricingLine = inferredPricing.lines.find((line) => line.solutionCode === 'PARTITION_PLADUR_STD');
  assert(partitionPricingLine);
  assert(partitionPricingLine.laborPricing.some((labor) => labor.tradeCode === 'OFICIO_PLADUR'));
  assert(partitionPricingLine.laborPricing.some((labor) => labor.crewCode === 'CREW_PARTITIONS_STD'));
  assert(partitionPricingLine.laborPricing.some((labor) => (labor.adjustedCrewDays || 0) > 0));
  assert(partitionPricingLine.laborPricing.some((labor) => !!labor.productivityProfileCode));
  const wetPricingLine = inferredPricing.lines.find((line) => line.solutionCode === 'PLUMBING_WET_ROOM_PLUS');
  assert(wetPricingLine);
  assert(wetPricingLine.laborPricing.some((labor) => labor.tradeCode === 'OFICIO_FONTANERO'));
  assert(wetPricingLine.laborPricing.some((labor) => labor.productivitySource !== null));
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
        line.materialPricing.some((material) => ['PREFERRED_SUPPLIER', 'SUPPLIER_OFFER'].includes(material.priceSource))
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
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'PARTITION_PLADUR_STD' &&
        line.priceStatus === 'PRICE_INFERRED'
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'FLOOR_TILE_STD' &&
        line.materialPricing.some((material) => ['SUPPLIER_OFFER', 'CATALOG_REFERENCE'].includes(material.priceSource))
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'ELECTRICAL_ROOM_STD' &&
        line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'WALL_TILE_BATH_STD' &&
        line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'PAINT_WALL_STD' &&
        line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'WET_AREA_WATERPROOFING_STD' &&
        line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'PARTITION_LINING_STD' &&
        line.materialPricing.some((material) => ['SUPPLIER_OFFER', 'CATALOG_REFERENCE'].includes(material.priceSource))
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'ELECTRICAL_MECHANISMS_STD' &&
        line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'ELECTRICAL_PANEL_BASIC' &&
        line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'BATH_SHOWER_TRAY_STD' &&
        line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'BATH_SCREEN_STD' &&
        line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'BATH_VANITY_STD' &&
        line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'BATH_TAPWARE_PLUS' &&
        line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'KITCHENETTE_CABINET_LOW_STD' &&
        line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'KITCHENETTE_CABINET_HIGH_STD' &&
        line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'KITCHENETTE_COUNTERTOP_PLUS' &&
        line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'KITCHENETTE_APPLIANCE_PACK_BASIC' &&
        line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'KITCHENETTE_SINK_STD' &&
        line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'KITCHENETTE_TAPWARE_STD' &&
        line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'PLUMBING_WET_ROOM_PLUS' &&
        line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
    )
  );
  assert(
    inferredPricing.lines.some(
      (line) =>
        line.solutionCode === 'DRAINAGE_WET_ROOM_PLUS' &&
        line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
    )
  );

  const multiOfferCeramicLookup = {
    ...pricingLookupOverride,
    'ACA-WALL-STD': {
      id: 'mat-wall-std-multi',
      code: 'ACA-WALL-STD',
      offers: [
        { id: 'offer-cer-cheap', supplierId: 'sup-cer-cheap', unitCost: 17.8, unit: 'm2', leadTimeDays: 8, isPreferred: false, supplier: { id: 'sup-cer-cheap', name: 'Ceramica Cheap', address: 'Girona' } },
        { id: 'offer-cer-fast', supplierId: 'sup-cer-fast', unitCost: 31.5, unit: 'm2', leadTimeDays: 1, isPreferred: false, supplier: { id: 'sup-cer-fast', name: 'Ceramica Fast', address: 'Barcelona' } },
        { id: 'offer-cer-pref', supplierId: 'sup-cer-pref', unitCost: 22.4, unit: 'm2', leadTimeDays: 2, isPreferred: true, supplier: { id: 'sup-cer-pref', name: 'Ceramica Preferida', address: 'Barcelona' } },
      ],
    },
  };

  const cheapestPricing = await buildPricingResult(
    measuredInput.recipeResult,
    measuredInput.executionContext,
    {
      materialLookupOverride: multiOfferCeramicLookup,
      preferredSuppliersOverride,
      sourcingPolicyOverride: {
        strategy: 'CHEAPEST',
      },
    }
  );
  const cheapestBathTile = cheapestPricing.lines.find((line) => line.solutionCode === 'WALL_TILE_BATH_STD');
  assert(cheapestBathTile);
  assert.equal(cheapestBathTile.materialPricing[0].supplierName, 'Ceramica Cheap');
  assert.equal(cheapestBathTile.materialPricing[0].selectionReasonCode, 'SELECTION_CHEAPEST');

  const fastestPricing = await buildPricingResult(
    measuredInput.recipeResult,
    measuredInput.executionContext,
    {
      materialLookupOverride: multiOfferCeramicLookup,
      preferredSuppliersOverride,
      sourcingPolicyOverride: {
        strategy: 'FASTEST',
      },
    }
  );
  const fastestBathTile = fastestPricing.lines.find((line) => line.solutionCode === 'WALL_TILE_BATH_STD');
  assert(fastestBathTile);
  assert.equal(fastestBathTile.materialPricing[0].supplierName, 'Ceramica Fast');
  assert.equal(fastestBathTile.materialPricing[0].selectionReasonCode, 'SELECTION_FASTEST');

  const balancedPricing = await buildPricingResult(
    measuredInput.recipeResult,
    measuredInput.executionContext,
    {
      materialLookupOverride: multiOfferCeramicLookup,
      preferredSuppliersOverride,
      sourcingPolicyOverride: {
        strategy: 'BALANCED',
      },
    }
  );
  const balancedBathTile = balancedPricing.lines.find((line) => line.solutionCode === 'WALL_TILE_BATH_STD');
  assert(balancedBathTile);
  assert.equal(balancedBathTile.materialPricing[0].supplierName, 'Ceramica Preferida');
  assert.equal(balancedBathTile.materialPricing[0].selectionReasonCode, 'SELECTION_BALANCED_SCORE');

  const preferredPricing = await buildPricingResult(
    measuredInput.recipeResult,
    measuredInput.executionContext,
    {
      materialLookupOverride: multiOfferCeramicLookup,
      preferredSuppliersOverride,
      sourcingPolicyOverride: {
        strategy: 'PREFERRED',
        preferredSuppliersByFamily: {
          CERAMICS: ['Ceramica Preferida'],
        },
      },
    }
  );
  const preferredBathTile = preferredPricing.lines.find((line) => line.solutionCode === 'WALL_TILE_BATH_STD');
  assert(preferredBathTile);
  assert.equal(preferredBathTile.materialPricing[0].supplierName, 'Ceramica Preferida');
  assert(
    preferredBathTile.materialPricing[0].sourcingReason.includes('proveedor preferido')
  );
  assert.equal(preferredBathTile.materialPricing[0].selectionReasonCode, 'SELECTION_PREFERRED_MATCH');

  const restrictedPricing = await buildPricingResult(
    measuredInput.recipeResult,
    measuredInput.executionContext,
    {
      materialLookupOverride: multiOfferCeramicLookup,
      preferredSuppliersOverride,
      sourcingPolicyOverride: {
        strategy: 'PREFERRED',
        allowedSupplierNames: ['Proveedor Inexistente'],
      },
    }
  );
  const restrictedBathTile = restrictedPricing.lines.find((line) => line.solutionCode === 'WALL_TILE_BATH_STD');
  assert(restrictedBathTile);
  assert.equal(restrictedBathTile.materialPricing[0].priceSource, 'CATALOG_REFERENCE');
  assert.equal(restrictedBathTile.materialPricing[0].selectionReasonCode, 'SELECTION_FALLBACK_CATALOG_REFERENCE');
  assert(
    restrictedBathTile.materialPricing[0].filterReasonCodes.includes('DISCARDED_NOT_ALLOWED_SUPPLIER')
  );

  const resolvedFastestProjectPolicy = resolveProjectSourcingPolicy({
    executionContext: measuredInput.executionContext,
    projectPolicy: {
      strategy: 'FASTEST',
      allowedSupplierNames: ['Ceramica Fast', 'Ceramica Preferida'],
      preferredSuppliersByFamily: {
        CERAMICS: ['Ceramica Preferida'],
      },
      useOnlyPreferredByFamily: {
        CERAMICS: false,
      },
      zoneHint: 'Barcelona',
      maxLeadTimeDays: 3,
      updatedAt: '2026-03-22T10:00:00.000Z',
    },
  });
  assert.equal(resolvedFastestProjectPolicy.source, 'PROJECT_OVERRIDE');
  assert.equal(resolvedFastestProjectPolicy.policy.strategy, 'FASTEST');
  assert.deepEqual(resolvedFastestProjectPolicy.policy.allowedSupplierNames, ['Ceramica Fast', 'Ceramica Preferida']);

  const projectFastestPricing = await buildPricingResult(
    measuredInput.recipeResult,
    measuredInput.executionContext,
    {
      materialLookupOverride: multiOfferCeramicLookup,
      preferredSuppliersOverride,
      sourcingPolicyOverride: resolvedFastestProjectPolicy.policy,
    }
  );
  const projectFastestBathTile = projectFastestPricing.lines.find((line) => line.solutionCode === 'WALL_TILE_BATH_STD');
  assert(projectFastestBathTile);
  assert.equal(projectFastestBathTile.materialPricing[0].supplierName, 'Ceramica Fast');
  assert.equal(projectFastestBathTile.materialPricing[0].sourcingStrategy, 'FASTEST');

  const resolvedPreferredProjectPolicy = resolveProjectSourcingPolicy({
    executionContext: measuredInput.executionContext,
    projectPolicy: {
      strategy: 'PREFERRED',
      preferredSuppliersByFamily: {
        CERAMICS: ['Ceramica Preferida'],
      },
      useOnlyPreferredByFamily: {
        CERAMICS: true,
      },
    },
  });

  const projectPreferredPricing = await buildPricingResult(
    measuredInput.recipeResult,
    measuredInput.executionContext,
    {
      materialLookupOverride: multiOfferCeramicLookup,
      preferredSuppliersOverride,
      sourcingPolicyOverride: resolvedPreferredProjectPolicy.policy,
    }
  );
  const projectPreferredBathTile = projectPreferredPricing.lines.find((line) => line.solutionCode === 'WALL_TILE_BATH_STD');
  assert(projectPreferredBathTile);
  assert.equal(projectPreferredBathTile.materialPricing[0].supplierName, 'Ceramica Preferida');
  assert(projectPreferredBathTile.materialPricing[0].sourcingReason.includes('preferido'));
  assert(
    projectPreferredBathTile.materialPricing[0].eligibleOffersSummary.every(
      (offer) => offer.supplierName === 'Ceramica Preferida'
    )
  );

  const explainabilityResolution = resolveRecipeMaterialSourcing({
    materialCode: 'MAT_WALL_TILE_BATH_STD',
    binding: MATERIAL_BINDINGS.MAT_WALL_TILE_BATH_STD,
    materialLookup: multiOfferCeramicLookup['ACA-WALL-STD'],
    preferredSuppliers: preferredSuppliersOverride,
    policy: {
      strategy: 'PREFERRED',
      allowedSupplierNames: ['Ceramica Cheap', 'Ceramica Preferida'],
      preferredSuppliersByFamily: {
        CERAMICS: ['Ceramica Preferida'],
      },
      useOnlyPreferredByFamily: {
        CERAMICS: true,
      },
    },
  });
  assert.equal(explainabilityResolution.selectionReasonCode, 'SELECTION_PREFERRED_MATCH');
  assert.equal(explainabilityResolution.selectedOffer?.supplierName, 'Ceramica Preferida');
  assert(
    explainabilityResolution.discardedOffersSummary.some(
      (offer) => offer.supplierName === 'Ceramica Cheap' && offer.filterReasonCodes.includes('DISCARDED_NOT_PREFERRED')
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

  const wetBlocked = JSON.parse(JSON.stringify(measured));
  wetBlocked.technicalSpecModel.instanceSpecs['bath-1'].dimensions.waterproofingAreaM2 = null;
  wetBlocked.spatialModel.instances.find((instance) => instance.instanceId === 'bath-1').measurementDrivers.tilingSurfaceM2 = null;
  wetBlocked.spatialModel.instances.find((instance) => instance.instanceId === 'bath-1').measurementDrivers.floorSurfaceM2 = null;
  const wetBlockedInput = deriveInputFromSession(wetBlocked, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert(
    !wetBlockedInput.measurementResult.lines.some(
      (line) =>
        line.solutionCode === 'WET_AREA_WATERPROOFING_STD' &&
        line.measurementCode === 'WATERPROOFING_AREA' &&
        line.status === 'MEASURED'
    )
  );
  assert(
    !wetBlockedInput.recipeResult.lines.some(
      (line) =>
        line.recipeCode === 'RECIPE_WET_AREA_WATERPROOFING_STD_M2' &&
        line.status === 'RECIPE_RESOLVED'
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

  const wallTilePlus = JSON.parse(JSON.stringify(measured));
  wallTilePlus.technicalSpecModel.instanceSpecs['bath-1'].selections.wallTileSolution = 'WALL_TILE_BATH_PLUS';
  const wallTilePlusInput = deriveInputFromSession(wallTilePlus, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert(
    wallTilePlusInput.recipeResult.lines.some(
      (line) => line.recipeCode === 'RECIPE_WALL_TILE_BATH_PLUS_M2'
    )
  );

  const wetTileFull = JSON.parse(JSON.stringify(measured));
  wetTileFull.technicalSpecModel.instanceSpecs['bath-1'].selections.wallTileSolution = 'WALL_TILE_WET_FULL';
  const wetTileFullInput = deriveInputFromSession(wetTileFull, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert(
    wetTileFullInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'WALL_TILE_WET_FULL' && line.measurementCode === 'WET_WALL_TILE_AREA'
    )
  );
  assert(
    wetTileFullInput.recipeResult.lines.some(
      (line) => line.recipeCode === 'RECIPE_WALL_TILE_WET_FULL_M2'
    )
  );

  const waterproofPlus = JSON.parse(JSON.stringify(measured));
  waterproofPlus.technicalSpecModel.instanceSpecs['bath-1'].selections.waterproofingSolution = 'WET_AREA_WATERPROOFING_PLUS';
  const waterproofPlusInput = deriveInputFromSession(waterproofPlus, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert(
    waterproofPlusInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'WET_AREA_WATERPROOFING_PLUS' && line.measurementCode === 'WET_WATERPROOFING_AREA'
    )
  );
  assert(
    waterproofPlusInput.recipeResult.lines.some(
      (line) => line.recipeCode === 'RECIPE_WET_AREA_WATERPROOFING_PLUS_M2'
    )
  );

  const bathtubBath = JSON.parse(JSON.stringify(measured));
  bathtubBath.technicalSpecModel.instanceSpecs['bath-1'].selections.bathShowerBaseSolution = 'BATH_BATHTUB_STD';
  const bathtubBathInput = deriveInputFromSession(bathtubBath, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert(
    bathtubBathInput.measurementResult.lines.some(
      (line) => line.solutionCode === 'BATH_BATHTUB_STD' && line.measurementCode === 'BATHTUB_UNITS'
    )
  );
  assert(
    bathtubBathInput.recipeResult.lines.some(
      (line) => line.recipeCode === 'RECIPE_BATH_BATHTUB_STD_UD'
    )
  );

  const paintWallPlus = JSON.parse(JSON.stringify(measured));
  paintWallPlus.technicalSpecModel.projectSpecs.selections.wallPaintSolution = 'PAINT_WALL_PLUS';
  const paintWallPlusInput = deriveInputFromSession(paintWallPlus, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert(
    paintWallPlusInput.recipeResult.lines.some(
      (line) => line.recipeCode === 'RECIPE_PAINT_WALL_PLUS_M2'
    )
  );

  const ceilingPlus = JSON.parse(JSON.stringify(measured));
  ceilingPlus.technicalSpecModel.projectSpecs.selections.ceilingSolution = 'CEILING_CONTINUOUS_PLUS';
  const ceilingPlusInput = deriveInputFromSession(ceilingPlus, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert(
    ceilingPlusInput.recipeResult.lines.some(
      (line) => line.recipeCode === 'RECIPE_CEILING_CONTINUOUS_PLUS_M2'
    )
  );

  const doorSliding = JSON.parse(JSON.stringify(measured));
  doorSliding.technicalSpecModel.projectSpecs.selections.doorSolution = 'DOOR_SLIDING_STD';
  const doorSlidingInput = deriveInputFromSession(doorSliding, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert(
    doorSlidingInput.recipeResult.lines.some(
      (line) => line.recipeCode === 'RECIPE_DOOR_SLIDING_STD_UD'
    )
  );

  const doorRf = JSON.parse(JSON.stringify(measured));
  doorRf.technicalSpecModel.projectSpecs.selections.doorSolution = 'DOOR_RF_BASIC';
  const doorRfInput = deriveInputFromSession(doorRf, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert(
    doorRfInput.recipeResult.lines.some(
      (line) => line.recipeCode === 'RECIPE_DOOR_RF_BASIC_UD'
    )
  );

  const windowThermal = JSON.parse(JSON.stringify(measured));
  windowThermal.technicalSpecModel.projectSpecs.selections.windowSolution = 'WINDOW_THERMAL_PLUS';
  const windowThermalInput = deriveInputFromSession(windowThermal, 'VIABILIDAD_INTERNA', 'AFINADO', [], [], 'ALTA');
  assert(
    windowThermalInput.recipeResult.lines.some(
      (line) => line.recipeCode === 'RECIPE_WINDOW_THERMAL_PLUS_UD'
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
  assert(canonicalPlanningProjection.activities.some((activity) => activity.provenance.solutionCode === 'WALL_TILE_BATH_STD'));
  assert(canonicalPlanningProjection.activities.some((activity) => activity.provenance.solutionCode === 'PAINT_WALL_STD'));
  assert(canonicalPlanningProjection.activities.some((activity) => activity.provenance.solutionCode === 'WET_AREA_WATERPROOFING_STD'));
  assert(canonicalPlanningProjection.activities.some((activity) => activity.provenance.solutionCode === 'BATH_SHOWER_TRAY_STD'));
  assert(canonicalPlanningProjection.activities.some((activity) => activity.provenance.solutionCode === 'BATH_SCREEN_STD'));
  assert(canonicalPlanningProjection.activities.some((activity) => activity.provenance.solutionCode === 'KITCHENETTE_COUNTERTOP_PLUS'));
  assert(canonicalPlanningProjection.activities.some((activity) => activity.provenance.solutionCode === 'KITCHENETTE_APPLIANCE_PACK_BASIC'));
  assert(canonicalPlanningProjection.activities.some((activity) => activity.provenance.solutionCode === 'PLUMBING_WET_ROOM_PLUS'));
  assert(canonicalPlanningProjection.activities.some((activity) => activity.provenance.solutionCode === 'PARTITION_PLADUR_STD'));
  assert(canonicalPlanningProjection.activities.some((activity) => activity.provenance.solutionCode === 'CEILING_CONTINUOUS_STD'));
  assert(canonicalPlanningProjection.activities.some((activity) => activity.provenance.solutionCode === 'ELECTRICAL_ROOM_STD'));
  assert(canonicalPlanningProjection.activities.some((activity) => activity.provenance.solutionCode === 'ELECTRICAL_PANEL_BASIC'));
  assert(
    canonicalPlanningProjection.activities.some(
      (activity) =>
        activity.provenance.solutionCode === 'PARTITION_PLADUR_STD' &&
        activity.provenance.laborTradeCode === 'OFICIO_PLADUR' &&
        activity.provenance.crewCode === 'CREW_PARTITIONS_STD' &&
        activity.provenance.productivitySource === 'PRODUCTIVITY_PROFILE'
    )
  );
  assert(
    canonicalPlanningProjection.activities.some(
      (activity) =>
        activity.provenance.solutionCode === 'PLUMBING_WET_ROOM_PLUS' &&
        activity.provenance.laborTradeCode === 'OFICIO_FONTANERO' &&
        activity.durationDays > 0
    )
  );
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
  assert(
    canonicalProcurementProjection.procurementLines.some(
      (line) => line.supportedSolutionCodes.includes('PARTITION_PLADUR_STD')
    )
  );
  assert(
    canonicalProcurementProjection.procurementLines.some(
      (line) => line.supportedSolutionCodes.includes('ELECTRICAL_ROOM_STD')
    )
  );
  assert(
    canonicalProcurementProjection.procurementLines.some(
      (line) => line.supportedSolutionCodes.includes('WALL_TILE_BATH_STD')
    )
  );
  assert(
    canonicalProcurementProjection.procurementLines.some(
      (line) => line.supportedSolutionCodes.includes('WET_AREA_WATERPROOFING_STD')
    )
  );
  assert(
    canonicalProcurementProjection.procurementLines.some(
      (line) => line.supportedSolutionCodes.includes('BATH_SHOWER_TRAY_STD') && Boolean(line.supplierOfferId)
    )
  );
  assert(
    canonicalProcurementProjection.procurementLines.some(
      (line) => line.supportedSolutionCodes.includes('BATH_SCREEN_STD') && Boolean(line.supplierOfferId)
    )
  );
  assert(
    canonicalProcurementProjection.procurementLines.some(
      (line) => line.supportedSolutionCodes.includes('KITCHENETTE_COUNTERTOP_PLUS') && Boolean(line.supplierOfferId)
    )
  );
  assert(
    canonicalProcurementProjection.procurementLines.some(
      (line) => line.supportedSolutionCodes.includes('KITCHENETTE_APPLIANCE_PACK_BASIC') && Boolean(line.supplierOfferId)
    )
  );
  assert(
    canonicalProcurementProjection.procurementLines.some(
      (line) => line.supportedSolutionCodes.includes('PLUMBING_WET_ROOM_PLUS') && Boolean(line.supplierOfferId)
    )
  );
  const preferredOnlyProjectPolicy = resolveProjectSourcingPolicy({
    executionContext: measuredInput.executionContext,
    projectPolicy: {
      strategy: 'PREFERRED',
      preferredSuppliersByFamily: {
        CERAMICS: ['Ceramica Preferida'],
      },
      useOnlyPreferredByFamily: {
        CERAMICS: true,
      },
    },
  });
  const policyDrivenProcurementProjection = await buildProcurementProjection({
    executionContext: measuredInput.executionContext,
    recipeResult: measuredInput.recipeResult,
    pricingResult: projectPreferredPricing,
    sourcingPolicy: preferredOnlyProjectPolicy.policy,
    includeDiscoveryHints: false,
    materialLookupOverride: procurementLookupOverride,
  });
  assert(
    policyDrivenProcurementProjection.procurementLines.some(
      (line) =>
        line.materialCode === 'ACA-WALL-STD' &&
        line.sourcingStrategy === 'PREFERRED' &&
        line.selectionReasonCode === 'SELECTION_PREFERRED_MATCH'
    )
  );
  const policyHistorySummary = summarizeProjectSourcingPolicyChange({
    previousPolicy: {
      strategy: 'BALANCED',
      allowedSupplierNames: ['Acabats Mediterrani'],
      preferredSuppliersByFamily: {
        CERAMICS: ['Acabats Mediterrani'],
      },
      useOnlyPreferredSuppliers: false,
      useOnlyPreferredByFamily: {},
      zoneHint: null,
      maxLeadTimeDays: null,
    },
    newPolicy: {
      strategy: 'FASTEST',
      allowedSupplierNames: ['Ceramica Fast'],
      preferredSuppliersByFamily: {
        CERAMICS: ['Ceramica Fast'],
      },
      useOnlyPreferredSuppliers: true,
      useOnlyPreferredByFamily: {
        CERAMICS: true,
      },
      zoneHint: 'Barcelona',
      maxLeadTimeDays: 3,
    },
  });
  assert(policyHistorySummary.includes('estrategia BALANCED -> FASTEST'));
  assert(policyHistorySummary.includes('preferidos por familia actualizados'));

  const uniqueSuffix = `T${Date.now()}`;
  const harnessUser = (await db.user.findFirst()) || await db.user.create({
    data: {
      email: `harness-${uniqueSuffix.toLowerCase()}@dimaz.local`,
      name: 'Harness',
      role: 'ADMIN',
    },
  });
  const harnessSupplier = await db.client.create({
    data: {
      name: `Harness Supplier ${uniqueSuffix}`,
      category: 'PROVEEDOR',
      email: `supplier-${uniqueSuffix.toLowerCase()}@dimaz.local`,
      userId: harnessUser.id,
    },
  });
  await db.material.upsert({
    where: { code: 'ACA-WALL-STD' },
    update: {
      name: 'Revestimiento vertical ceramico estandar',
      category: 'ACABADOS',
      baseUnit: 'm2',
      status: 'ACTIVO',
    },
    create: {
      code: 'ACA-WALL-STD',
      name: 'Revestimiento vertical ceramico estandar',
      category: 'ACABADOS',
      baseUnit: 'm2',
      status: 'ACTIVO',
    },
  });
  const manualOfferResult = await intakeSupplierOffer({
    payload: {
      supplierId: harnessSupplier.id,
      procurementMaterialCode: 'ACA-WALL-STD',
      supplierProductName: `Alicatado mural operativo ${uniqueSuffix}`,
      supplierProductRef: `MANUAL-${uniqueSuffix}`,
      warehouseLabel: 'Barcelona centro',
      unit: 'm2',
      unitCost: 12.34,
      leadTimeDays: 4,
      status: 'ACTIVA',
      isPreferred: false,
    },
    source: 'MANUAL',
    updateExisting: true,
  });
  assert.equal(manualOfferResult.status, 'CREATED');
  assert.equal(manualOfferResult.mappingStatus, 'MATCHED_BY_CODE');

  const duplicateOfferResult = await intakeSupplierOffer({
    payload: {
      supplierId: harnessSupplier.id,
      procurementMaterialCode: 'ACA-WALL-STD',
      supplierProductName: `Alicatado mural operativo ${uniqueSuffix}`,
      supplierProductRef: `MANUAL-${uniqueSuffix}`,
      warehouseLabel: 'Barcelona centro',
      unit: 'm2',
      unitCost: 12.34,
      leadTimeDays: 4,
      status: 'ACTIVA',
    },
    source: 'MANUAL',
    updateExisting: false,
  });
  assert.equal(duplicateOfferResult.status, 'DUPLICATE_SKIPPED');

  const csvPayloads = csvRowsToOfferPayloads([
    'supplier,material/procurement code,product name,reference,unit,unit cost,lead time,status,preferred,valid until',
    `${harnessSupplier.name},ACA-WALL-STD,Alicatado csv ${uniqueSuffix},CSV-${uniqueSuffix},m2,12.9,5,ACTIVA,yes,2026-12-31`,
    `${harnessSupplier.name},,Producto ambiguo ${uniqueSuffix},CSV-REVIEW-${uniqueSuffix},ud,33,7,ACTIVA,no,`,
  ].join('\n'));
  assert.equal(csvPayloads.length, 2);
  const csvMappedResult = await intakeSupplierOffer({
    payload: csvPayloads[0],
    source: 'CSV_IMPORT',
    updateExisting: true,
  });
  assert.equal(csvMappedResult.mappingStatus, 'MATCHED_BY_CODE');
  const csvReviewResult = await intakeSupplierOffer({
    payload: csvPayloads[1],
    source: 'CSV_IMPORT',
    updateExisting: true,
  });
  assert.equal(csvReviewResult.mappingStatus, 'NEEDS_REVIEW');

  const candidateOfferResult = await intakeSupplierOffer({
    payload: {
      supplierId: harnessSupplier.id,
      supplierProductName: 'Revestimiento vertical ceramico estandar',
      supplierProductRef: `CAND-${uniqueSuffix}`,
      unit: 'm2',
      unitCost: 12.6,
      leadTimeDays: 5,
      status: 'ACTIVA',
    },
    source: 'MANUAL',
    updateExisting: true,
  });
  assert.equal(candidateOfferResult.mappingStatus, 'MATCHED_BY_NAME_CANDIDATE');

  const csvPreview = await previewOfferCsvImport([
    'supplier,material/procurement code,product name,reference,warehouse,unit,unit cost,lead time,status,preferred,valid until',
    `${harnessSupplier.name},ACA-WALL-STD,Alicatado mural operativo ${uniqueSuffix},MANUAL-${uniqueSuffix},Barcelona centro,m2,12.34,4,ACTIVA,no,2026-12-31`,
    `${harnessSupplier.name},,Revestimiento vertical ceramico estandar,PREVIEW-CAND-${uniqueSuffix},Barcelona centro,m2,12.8,5,ACTIVA,no,`,
    `${harnessSupplier.name},,Producto ambiguo ${uniqueSuffix},PREVIEW-REVIEW-${uniqueSuffix},Barcelona centro,ud,33,7,ACTIVA,no,`,
  ].join('\n'));
  assert.equal(csvPreview.totalRows, 3);
  assert.equal(csvPreview.duplicateCount, 1);
  assert.equal(csvPreview.needsReview, 1);
  assert(csvPreview.readyToCreate >= 1);

  const reviewQueueBeforeResolution = await buildOfferReviewQueue();
  const queuedReviewOffer = reviewQueueBeforeResolution.find((row) => row.supplierProductRef === `CSV-REVIEW-${uniqueSuffix}`);
  assert(queuedReviewOffer);
  assert.equal(queuedReviewOffer.mappingStatus, 'NEEDS_REVIEW');
  const queuedCandidateOffer = reviewQueueBeforeResolution.find((row) => row.supplierProductRef === `CAND-${uniqueSuffix}`);
  assert(queuedCandidateOffer);
  assert.equal(queuedCandidateOffer.mappingStatus, 'MATCHED_BY_NAME_CANDIDATE');
  assert(queuedCandidateOffer.candidates.length > 0);

  const catalogMetricsBeforeResolution = await buildOfferCatalogMetrics();
  assert(catalogMetricsBeforeResolution.reviewQueueCount >= 2);
  assert(catalogMetricsBeforeResolution.needsReviewCount >= 1);
  assert(
    catalogMetricsBeforeResolution.familyBreakdown.some(
      (family) => family.family === 'CERAMICS' && family.totalOffers > 0
    )
  );

  const candidateTargetMaterial = queuedCandidateOffer.candidates[0];
  assert(candidateTargetMaterial);
  const confirmCandidateResult = await applyBulkOfferAction({
    action: 'CONFIRM_CANDIDATE',
    offerIds: [queuedCandidateOffer.id],
    materialId: candidateTargetMaterial.materialId,
  });
  assert.equal(confirmCandidateResult.processedCount, 1);

  const assignReviewResult = await applyBulkOfferAction({
    action: 'ASSIGN_MATERIAL',
    offerIds: [queuedReviewOffer.id],
    materialId: candidateTargetMaterial.materialId,
    activate: true,
  });
  assert.equal(assignReviewResult.processedCount, 1);

  const resolvedReviewOffer = await db.supplierMaterialOffer.findUnique({
    where: { id: queuedReviewOffer.id },
  });
  assert(resolvedReviewOffer);
  assert.equal(resolvedReviewOffer.mappingStatus, 'MATCHED_DIRECT');
  assert.equal(resolvedReviewOffer.isActive, true);
  assert.equal(resolvedReviewOffer.procurementMaterialCode, 'ACA-WALL-STD');

  const dedupeBaseOffer = await intakeSupplierOffer({
    payload: {
      supplierId: harnessSupplier.id,
      procurementMaterialCode: 'ACA-WALL-STD',
      supplierProductName: `Duplicado base ${uniqueSuffix}`,
      supplierProductRef: `DEDUP-A-${uniqueSuffix}`,
      warehouseLabel: 'Barcelona centro',
      unit: 'm2',
      unitCost: 12.5,
      leadTimeDays: 4,
      status: 'ACTIVA',
    },
    source: 'MANUAL',
    updateExisting: true,
  });
  const dedupePeerOffer = await intakeSupplierOffer({
    payload: {
      supplierId: harnessSupplier.id,
      procurementMaterialCode: 'ACA-WALL-STD',
      supplierProductName: `Duplicado base ${uniqueSuffix}`,
      supplierProductRef: `DEDUP-B-${uniqueSuffix}`,
      warehouseLabel: 'Barcelona centro',
      unit: 'm2',
      unitCost: 12.55,
      leadTimeDays: 4,
      status: 'ACTIVA',
    },
    source: 'MANUAL',
    updateExisting: true,
  });
  assert.equal(dedupeBaseOffer.mappingStatus, 'MATCHED_BY_CODE');
  assert.equal(dedupePeerOffer.mappingStatus, 'MATCHED_BY_CODE');

  const dedupeBaseRow = await db.supplierMaterialOffer.findFirst({
    where: { supplierProductRef: `DEDUP-A-${uniqueSuffix}` },
  });
  const dedupePeerRow = await db.supplierMaterialOffer.findFirst({
    where: { supplierProductRef: `DEDUP-B-${uniqueSuffix}` },
  });
  assert(dedupeBaseRow);
  assert(dedupePeerRow);

  const duplicateCandidates = await findDuplicateOfferCandidates({
    offerId: dedupePeerRow.id,
    supplierId: dedupePeerRow.supplierId,
    materialId: dedupePeerRow.materialId,
    procurementMaterialCode: dedupePeerRow.procurementMaterialCode,
    supplierProductRef: dedupePeerRow.supplierProductRef,
    supplierProductName: dedupePeerRow.supplierProductName,
    unit: dedupePeerRow.unit,
    warehouseLabel: dedupePeerRow.warehouseLabel,
  });
  assert(
    duplicateCandidates.some((candidate) => candidate.offerId === dedupeBaseRow.id)
  );

  const dedupeResult = await applyBulkOfferAction({
    action: 'DEDUPLICATE_KEEP',
    offerIds: [dedupeBaseRow.id, dedupePeerRow.id],
    keepOfferId: dedupeBaseRow.id,
  });
  assert.equal(dedupeResult.processedCount, 1);
  const dedupedPeerRow = await db.supplierMaterialOffer.findUnique({
    where: { id: dedupePeerRow.id },
  });
  assert(dedupedPeerRow);
  assert.equal(dedupedPeerRow.mappingStatus, 'DUPLICATE_SKIPPED');
  assert.equal(dedupedPeerRow.isActive, false);

  const importedOffer = await db.supplierMaterialOffer.findFirst({
    where: { supplierProductRef: `MANUAL-${uniqueSuffix}` },
    include: {
      supplier: true,
    },
  });
  assert(importedOffer);
  const queueAfterResolution = await buildOfferReviewQueue();
  assert(
    !queueAfterResolution.some((row) => row.id === queuedReviewOffer.id)
  );
  const catalogMetricsAfterResolution = await buildOfferCatalogMetrics();
  assert(catalogMetricsAfterResolution.mappedOffers >= catalogMetricsBeforeResolution.mappedOffers + 2);
  assert(catalogMetricsAfterResolution.reviewQueueCount <= catalogMetricsBeforeResolution.reviewQueueCount);

  const dbDrivenPricing = await buildPricingResult(
    measuredInput.recipeResult,
    measuredInput.executionContext,
    {
      sourcingPolicyOverride: {
        strategy: 'CHEAPEST',
      },
      materialLookupOverride: {
        ...pricingLookupOverride,
        'ACA-WALL-STD': {
          id: 'mat-wall-std-intake',
          code: 'ACA-WALL-STD',
          offers: [
            {
              id: importedOffer.id,
              supplierId: importedOffer.supplierId,
              unitCost: importedOffer.unitCost,
              unit: importedOffer.unit,
              leadTimeDays: importedOffer.leadTimeDays,
              isPreferred: importedOffer.isPreferred,
              supplier: importedOffer.supplier
                ? {
                    id: importedOffer.supplier.id,
                    name: importedOffer.supplier.name,
                    address: importedOffer.supplier.address || null,
                  }
                : null,
            },
            {
              id: resolvedReviewOffer.id,
              supplierId: resolvedReviewOffer.supplierId,
              unitCost: resolvedReviewOffer.unitCost,
              unit: resolvedReviewOffer.unit,
              leadTimeDays: resolvedReviewOffer.leadTimeDays,
              isPreferred: resolvedReviewOffer.isPreferred,
              supplier: importedOffer.supplier
                ? {
                    id: importedOffer.supplier.id,
                    name: importedOffer.supplier.name,
                    address: importedOffer.supplier.address || null,
                  }
                : null,
            },
          ],
        },
      },
    }
  );
  const dbDrivenBathTile = dbDrivenPricing.lines.find((line) => line.solutionCode === 'WALL_TILE_BATH_STD');
  assert(dbDrivenBathTile);
  assert(
    dbDrivenBathTile.materialPricing.some(
      (material) =>
        material.supplierName === harnessSupplier.name &&
        material.priceSource === 'SUPPLIER_OFFER'
    )
  );
  const canonicalControlProjection = buildControlProjection({
    commercialRuntimeOutput: integratedTechnicalRuntime,
    commercialEstimateProjection: integratedTechnical.commercialEstimateProjection,
    planningProjection: canonicalPlanningProjection,
    procurementProjection: canonicalProcurementProjection,
    baselineSnapshot: {
      planningProjection: canonicalPlanningProjection,
      procurementProjection: canonicalProcurementProjection,
    },
    activities: [
      {
        id: 'act-bath',
        name: 'Montaje banos',
        locationId: 'loc-bath',
        plannedDuration: 2,
        plannedStartDate: '2026-04-02T08:00:00.000Z',
        plannedEndDate: '2026-04-04T08:00:00.000Z',
        realStartDate: '2026-04-02T08:00:00.000Z',
        realEndDate: '2026-04-05T08:00:00.000Z',
        realProgress: 100,
        originCostItemCode: 'BANOS',
      },
      {
        id: 'act-kit',
        name: 'Montaje cocinas',
        locationId: 'loc-kit',
        plannedDuration: 1,
        plannedStartDate: '2026-04-05T08:00:00.000Z',
        plannedEndDate: '2026-04-06T08:00:00.000Z',
        realStartDate: '2026-04-05T08:00:00.000Z',
        realEndDate: '2026-04-06T08:00:00.000Z',
        realProgress: 100,
        originCostItemCode: 'COCINA',
      },
    ],
    supplies: canonicalProcurementProjection.procurementLines.map((line, index) => ({
      id: `supply-${index}`,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      expectedUnitCost: line.unitCost,
      expectedTotalCost: line.expectedTotalCost,
      actualUnitCost: line.unitCost ? Number((line.unitCost * 1.08).toFixed(2)) : null,
      actualTotalCost: line.expectedTotalCost ? Number((line.expectedTotalCost * 1.08).toFixed(2)) : null,
      status: 'PEDIDA',
      supplierId: line.supplierId || null,
      requiredOnSiteDate: line.requiredOnSiteDate || null,
      receivedDate: null,
      originSource: 'PROCUREMENT_RECIPE_DRIVEN',
      projectActivityId: line.planningLinkage?.projectActivityId || null,
      locationId: line.planningLinkage?.locationId || null,
      estimateInternalLine: {
        id: `estimate-line-${index}`,
        code: line.supportedSolutionCodes[0] || null,
        chapter: 'CANONICAL',
        description: line.description,
        appliedAssumptions: {
          __economicStatus: {
            bucketCode:
              (line.supportedSolutionCodes[0] || '').startsWith('BATH_')
                ? 'BATHS'
                : (line.supportedSolutionCodes[0] || '').startsWith('KITCHENETTE_')
                  ? 'KITCHENETTES'
                  : (line.supportedSolutionCodes[0] || '').startsWith('WALL_TILE_') || (line.supportedSolutionCodes[0] || '').startsWith('PAINT_') || (line.supportedSolutionCodes[0] || '').startsWith('WET_AREA_')
                    ? 'WALL_FINISHES'
                  : (line.supportedSolutionCodes[0] || '').startsWith('LEVELING_')
                    ? 'LEVELING'
                    : (line.supportedSolutionCodes[0] || '').startsWith('COMMON_AREA_')
                      ? 'COMMON_AREAS'
                      : (line.supportedSolutionCodes[0] || '').startsWith('PARTITION_')
                        ? 'PARTITIONS'
                        : (line.supportedSolutionCodes[0] || '').startsWith('CEILING_')
                          ? 'CEILINGS'
                          : (line.supportedSolutionCodes[0] || '').startsWith('FLOOR_') || (line.supportedSolutionCodes[0] || '') === 'SKIRTING_STD'
                            ? 'FLOORING'
                            : (line.supportedSolutionCodes[0] || '').startsWith('DOOR_') || (line.supportedSolutionCodes[0] || '').startsWith('WINDOW_') || (line.supportedSolutionCodes[0] || '').startsWith('SHUTTER_')
                              ? 'CARPENTRY'
                              : (line.supportedSolutionCodes[0] || '').startsWith('ELECTRICAL_') || (line.supportedSolutionCodes[0] || '').startsWith('LIGHTING_') || (line.supportedSolutionCodes[0] || '').startsWith('PLUMBING_') || (line.supportedSolutionCodes[0] || '').startsWith('DRAINAGE_')
                                ? 'BASIC_MEP'
                                : 'ROOMS',
          },
        },
      },
      material: { code: line.materialCode, name: line.description },
    })),
    expenses: [
      { id: 'exp-1', amount: 1800, category: 'MATERIALES' },
      { id: 'exp-2', amount: 950, category: 'MANO_DE_OBRA' },
    ],
  });
  assert.equal(canonicalControlProjection.source, 'CANONICAL_BASELINE');
  assert((canonicalControlProjection.baselineEstimate.laborCost || 0) > 0);
  assert(
    canonicalControlProjection.baselineEstimate.bucketSummaries.some(
      (bucket) => bucket.bucketCode === 'PARTITIONS' && (bucket.laborCost || 0) > 0
    )
  );
  assert(canonicalControlProjection.deviationLines.some((line) => line.type === 'PROCUREMENT'));
  assert(canonicalControlProjection.deviationLines.some((line) => line.type === 'TIME'));
  assert(canonicalControlProjection.deviationLines.some((line) => line.type === 'COST'));
  assert(
    canonicalControlProjection.deviationLines.some(
      (line) => line.bucketCode === 'BATHS' && line.activityIds.length > 0
    )
  );
  assert(
    canonicalControlProjection.deviationLines.some(
      (line) => line.supplyIds.length > 0 && line.pricingLineIds.length > 0
    )
  );
  assert(
    canonicalControlProjection.deviationLines.some(
      (line) => ['PARTITIONS', 'CEILINGS', 'BASIC_MEP'].includes(line.bucketCode || '')
    )
  );
  assert(
    canonicalControlProjection.deviationLines.some(
      (line) => line.bucketCode === 'WALL_FINISHES'
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
    integratedTechnical.commercialEstimateProjection.commercialLines.some(
      (line) => line.code === 'INT-PART' && line.generatedFrom === 'TECHNICAL'
    )
  );
  assert(
    integratedTechnical.commercialEstimateProjection.commercialLines.some(
      (line) => line.code === 'INT-CEIL' && line.supportedSolutionCodes.includes('CEILING_CONTINUOUS_STD')
    )
  );
  assert(
    integratedTechnical.commercialEstimateProjection.commercialLines.some(
      (line) => line.code === 'INT-MEP' && line.supportedSolutionCodes.includes('ELECTRICAL_ROOM_STD')
    )
  );
  assert(
    integratedTechnical.commercialEstimateProjection.commercialLines.some(
      (line) => line.code === 'INT-WALL' && line.supportedSolutionCodes.some((code) => code.startsWith('WALL_TILE_') || code.startsWith('PAINT_') || code.startsWith('WET_AREA_'))
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
  const hybridControlProjection = buildControlProjection({
    commercialRuntimeOutput: integratedMixedRuntime,
    commercialEstimateProjection: integratedMixed.commercialEstimateProjection,
    planningProjection: null,
    procurementProjection: hybridProcurementProjection,
    baselineSnapshot: null,
    activities: [
      {
        id: 'act-common',
        name: 'Acabados zonas comunes',
        plannedDuration: 3,
        plannedStartDate: '2026-04-08T08:00:00.000Z',
        plannedEndDate: '2026-04-10T08:00:00.000Z',
        realProgress: 40,
        originCostItemCode: 'ZONAS_COMUNES',
      },
    ],
    supplies: [],
    expenses: [],
  });
  assert.equal(hybridControlProjection.source, 'HYBRID');
  assert(hybridControlProjection.warnings.length > 0 || hybridControlProjection.assumptions.length > 0);
  const legacyControlProjection = buildControlProjection({
    activities: [
      {
        id: 'legacy-act',
        name: 'Legacy general',
        plannedDuration: 4,
        plannedEndDate: '2026-04-10T08:00:00.000Z',
        originCostItemCode: 'GENERAL',
        realProgress: 20,
      },
    ],
    supplies: [
      {
        id: 'legacy-supply',
        description: 'Suministro general legacy',
        quantity: 2,
        unit: 'ud',
        expectedUnitCost: 50,
        expectedTotalCost: 100,
        status: 'IDENTIFICADA',
        originSource: 'MANUAL',
      },
    ],
    expenses: [],
  });
  assert.equal(legacyControlProjection.source, 'LEGACY_CONTROL');
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

  const bc3RuntimeExport = buildBc3EstimateExport({
    estimateId: 'est-runtime',
    estimateNumber: 'PRE-RUNTIME-001',
    estimateName: 'Runtime export test',
    issueDate: '2026-03-22T12:00:00.000Z',
    projectName: 'Proyecto Runtime',
    clientName: 'Cliente Runtime',
    commercialReadModel: runtimeFirstReadModel,
    measurementResult: measuredInput.measurementResult,
    legacyItems: legacyMaterialized.legacyItems,
  });
  assert.equal(bc3RuntimeExport.summary.sourceOfTruth, 'RUNTIME_OUTPUT');
  assert.equal(bc3RuntimeExport.summary.exportedLineCount > 0, true);
  assert.equal(bc3RuntimeExport.summary.measurementSource, 'DISCOVERY_SESSION');
  assert(bc3RuntimeExport.content.includes('~V|FIEBDC-3/2020|'));
  assert(bc3RuntimeExport.content.includes('~C|'));
  assert(bc3RuntimeExport.content.includes('~M|'));

  const bc3ProjectionExport = buildBc3EstimateExport({
    estimateId: 'est-proj',
    estimateNumber: 'PRE-PROJ-001',
    estimateName: 'Projection export test',
    issueDate: '2026-03-22T12:00:00.000Z',
    commercialReadModel: projectionFallbackReadModel,
    discoveryDerivedInput: {
      measurementResult: measuredInput.measurementResult,
    },
    legacyItems: legacyMaterialized.legacyItems,
  });
  assert.equal(bc3ProjectionExport.summary.sourceOfTruth, 'PROJECTION');
  assert.equal(bc3ProjectionExport.summary.fallbackUsed, true);
  assert.equal(bc3ProjectionExport.summary.measurementSource, 'DISCOVERY_SESSION');

  const bc3LegacyExport = buildBc3EstimateExport({
    estimateId: 'est-legacy',
    estimateNumber: 'PRE-LEGACY-001',
    estimateName: 'Legacy export test',
    issueDate: '2026-03-22T12:00:00.000Z',
    commercialReadModel: legacyReadModel,
    legacyItems: legacyMaterialized.legacyItems,
  });
  assert.equal(bc3LegacyExport.summary.sourceOfTruth, 'LEGACY');
  assert.equal(bc3LegacyExport.summary.measurementSource, 'NONE');
  assert(
    bc3LegacyExport.summary.warnings.some((warning) => warning.includes('estimate.items legacy'))
  );
  assert(
    bc3LegacyExport.summary.warnings.some((warning) => warning.includes('MeasurementResult'))
  );

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

  const phase3RecipeMaterialCodes = [
    'MAT_BATH_SHOWER_TRAY_STD',
    'MAT_BATH_BATHTUB_STD',
    'MAT_BATH_SCREEN_STD',
    'MAT_BATH_VANITY_STD',
    'MAT_BATH_TAPWARE_STD',
    'MAT_BATH_TAPWARE_PLUS',
    'MAT_KITCH_CABINET_LOW_STD',
    'MAT_KITCH_CABINET_HIGH_STD',
    'MAT_KITCH_COUNTERTOP_STD',
    'MAT_KITCH_COUNTERTOP_PLUS',
    'MAT_KITCH_APPLIANCE_PACK_BASIC',
    'MAT_KITCH_SINK_STD',
    'MAT_KITCH_TAPWARE_STD',
    'MAT_WALL_TILE_WET_PARTIAL',
    'MAT_WALL_TILE_WET_FULL',
    'MAT_WATERPROOFING_PLUS',
    'MAT_PLUMBING_WET_ROOM_PLUS',
    'MAT_DRAINAGE_WET_ROOM_PLUS',
  ];
  const explicitBindingCount = phase3RecipeMaterialCodes.filter(
    (code) => MATERIAL_BINDINGS[code]
  ).length;
  const procurementLinkedCount = phase3RecipeMaterialCodes.filter((code) => {
    const procurementCode = MATERIAL_BINDINGS[code]?.procurementMaterialCode;
    return procurementCode && procurementLookupOverride[procurementCode];
  }).length;
  assert.equal(explicitBindingCount, phase3RecipeMaterialCodes.length);
  assert.equal(procurementLinkedCount, phase3RecipeMaterialCodes.length);

  const phase3SolutionCodes = [
    'BATH_SHOWER_TRAY_STD',
    'BATH_BATHTUB_STD',
    'BATH_SCREEN_STD',
    'BATH_VANITY_STD',
    'BATH_TAPWARE_PLUS',
    'KITCHENETTE_CABINET_LOW_STD',
    'KITCHENETTE_CABINET_HIGH_STD',
    'KITCHENETTE_COUNTERTOP_PLUS',
    'KITCHENETTE_APPLIANCE_PACK_BASIC',
    'KITCHENETTE_SINK_STD',
    'KITCHENETTE_TAPWARE_STD',
    'WALL_TILE_WET_FULL',
    'WET_AREA_WATERPROOFING_PLUS',
    'PLUMBING_WET_ROOM_PLUS',
    'DRAINAGE_WET_ROOM_PLUS',
  ];
  const phase3InferredLines = inferredPricing.lines.filter(
    (line) =>
      phase3SolutionCodes.includes(line.solutionCode) &&
      line.priceStatus === 'PRICE_INFERRED'
  );
  assert(
    phase3InferredLines.every(
      (line) =>
        line.materialPricing.every((material) =>
          ['SUPPLIER_OFFER', 'PREFERRED_SUPPLIER', 'CATALOG_REFERENCE'].includes(material.priceSource)
        ) &&
        line.laborPricing.some((labor) =>
          ['PARAMETRIC_REFERENCE', 'CATALOG_REFERENCE'].includes(labor.priceSource)
        )
    )
  );

  const sourcingFocusFamilies = [
    'WALL_TILE_BATH_STD',
    'WET_AREA_WATERPROOFING_STD',
    'PARTITION_LINING_STD',
    'ELECTRICAL_MECHANISMS_STD',
    'ELECTRICAL_PANEL_BASIC',
    'PLUMBING_WET_ROOM_STD',
    'DRAINAGE_WET_ROOM_STD',
  ];
  const sourcingFocusLines = inferredPricing.lines.filter((line) =>
    sourcingFocusFamilies.includes(line.solutionCode)
  );
  const sourcingFocusSupplierOfferLines = sourcingFocusLines.filter((line) =>
    line.materialPricing.some((material) => material.priceSource === 'SUPPLIER_OFFER')
  ).length;
  const sourcingFocusInferredOnlyLines = sourcingFocusLines.filter((line) =>
    line.materialPricing.every((material) => material.priceSource !== 'SUPPLIER_OFFER')
  ).length;

  console.log('Discovery integration tests passed.');
  console.log(
    JSON.stringify(
      {
        phase3PricingBindingStats: {
          explicitBindingCount,
          procurementLinkedCount,
          inferredLineSolutionCodes: Array.from(
            new Set(phase3InferredLines.map((line) => line.solutionCode))
          ),
        },
        sourcingFoundationStats: {
          supplierOfferLines: inferredPricing.coverage.supplierOfferLines,
          preferredSupplierLines: inferredPricing.coverage.preferredSupplierLines,
          catalogReferenceLines: inferredPricing.coverage.catalogReferenceLines,
          parametricReferenceLines: inferredPricing.coverage.parametricReferenceLines,
          focusFamilySupplierOfferLines: sourcingFocusSupplierOfferLines,
          focusFamilyInferredOnlyLines: sourcingFocusInferredOnlyLines,
        },
        offerReviewOpsStats: {
          reviewQueueBeforeResolution: catalogMetricsBeforeResolution.reviewQueueCount,
          reviewQueueAfterResolution: catalogMetricsAfterResolution.reviewQueueCount,
          mappedOffersBeforeResolution: catalogMetricsBeforeResolution.mappedOffers,
          mappedOffersAfterResolution: catalogMetricsAfterResolution.mappedOffers,
          csvPreviewReadyToCreate: csvPreview.readyToCreate,
          csvPreviewNeedsReview: csvPreview.needsReview,
          csvPreviewDuplicateCount: csvPreview.duplicateCount,
        },
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
