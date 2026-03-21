import { db } from '@/lib/db';
import { AutomationContext, FinishLevel } from './types';

type RuleObject = Record<string, unknown> | null | undefined;

const STANDARD_ACTIVITY_SEEDS = [
  {
    code: 'PRE-IMPL',
    name: 'Implantacion y protecciones',
    category: 'PRELIMINARES',
    defaultUnit: 'ud',
    requiresLocation: true,
    relatedToPurchases: true,
  },
  {
    code: 'DEM-RET',
    name: 'Demoliciones y retirada',
    category: 'DEMOLICIONES',
    defaultUnit: 'm2',
    requiresLocation: true,
    relatedToPurchases: true,
  },
  {
    code: 'ALB-INT',
    name: 'Albanileria, pladur y cerramientos',
    category: 'ALBANILERIA',
    defaultUnit: 'm2',
    requiresLocation: true,
  },
  {
    code: 'EST-REF',
    name: 'Estructura y refuerzos',
    category: 'ESTRUCTURA',
    defaultUnit: 'm2',
    requiresLocation: true,
    relatedToPurchases: true,
  },
  {
    code: 'INS-GEN',
    name: 'Instalaciones electricas y fontaneria',
    category: 'INSTALACIONES',
    defaultUnit: 'punto',
    requiresLocation: true,
    relatedToPurchases: true,
  },
  {
    code: 'ACA-GEN',
    name: 'Revestimientos y acabados',
    category: 'ACABADOS',
    defaultUnit: 'm2',
    requiresLocation: true,
    relatedToPurchases: true,
  },
  {
    code: 'CAR-REM',
    name: 'Carpinterias, equipamiento y remates',
    category: 'CARPINTERIA',
    defaultUnit: 'ud',
    requiresLocation: true,
    relatedToPurchases: true,
  },
  {
    code: 'ENT-CIE',
    name: 'Limpieza final y entrega',
    category: 'CIERRE',
    defaultUnit: 'ud',
    requiresLocation: true,
  },
];

const PRODUCTIVITY_RATE_SEEDS = [
  { name: 'Implantacion base', standardActivityCode: 'PRE-IMPL', value: 1, unit: 'ud/dia', category: 'PRELIMINARES', complexity: 'MEDIA' },
  { name: 'Demolicion interior', standardActivityCode: 'DEM-RET', value: 28, unit: 'm2/dia', category: 'DEMOLICIONES', complexity: 'MEDIA' },
  { name: 'Albanileria interior', standardActivityCode: 'ALB-INT', value: 30, unit: 'm2/dia', category: 'ALBANILERIA', complexity: 'MEDIA' },
  { name: 'Refuerzo estructural', standardActivityCode: 'EST-REF', value: 35, unit: 'm2/dia', category: 'ESTRUCTURA', complexity: 'ALTA' },
  { name: 'Instalaciones interiores', standardActivityCode: 'INS-GEN', value: 22, unit: 'punto/dia', category: 'INSTALACIONES', complexity: 'MEDIA' },
  { name: 'Acabados generales', standardActivityCode: 'ACA-GEN', value: 20, unit: 'm2/dia', category: 'ACABADOS', complexity: 'MEDIA' },
  { name: 'Carpinteria y remates', standardActivityCode: 'CAR-REM', value: 8, unit: 'ud/dia', category: 'CARPINTERIA', complexity: 'MEDIA' },
  { name: 'Cierre y entrega', standardActivityCode: 'ENT-CIE', value: 1, unit: 'ud/dia', category: 'CIERRE', complexity: 'BAJA' },
];

type TypologySeed = {
  code: string;
  name: string;
  description: string;
  workType: string;
  siteType: string;
  scopeType: string;
  complexityFactor: number;
  costSensitivity: number;
  timeSensitivity: number;
  operationalSensitivity: number;
  costItems: Array<{
    code: string;
    chapterCode: string;
    chapterName: string;
    name: string;
    unit: string;
    lineKind?: string;
    order: number;
    standardActivityCode?: string;
    productivityRateName?: string;
    inclusionRule?: RuleObject;
    measurementRule?: RuleObject;
    pricingRule?: RuleObject;
  }>;
  locationTemplates: Array<{
    code: string;
    name: string;
    type: string;
    parentCode?: string | null;
    generationMode?: string;
    quantityRule?: RuleObject;
    order: number;
  }>;
  activityTemplates: Array<{
    code: string;
    standardActivityCode: string;
    nameOverride?: string;
    wbsCode?: string;
    locationCode?: string;
    costItemCode?: string;
    order: number;
    dependencyType?: string;
    lagDays?: number;
    inclusionRule?: RuleObject;
    durationRule?: RuleObject;
  }>;
};

const finishFactor: Record<FinishLevel, number> = {
  BASICO: 0.9,
  MEDIO: 1,
  MEDIO_ALTO: 1.15,
  ALTO: 1.3,
};

const accessFactor: Record<string, number> = {
  FACIL: 1,
  NORMAL: 1.06,
  COMPLICADO: 1.15,
  MUY_COMPLICADO: 1.28,
};

const siteFactor: Record<string, number> = {
  PISO: 1,
  LOCAL: 0.92,
  EDIFICIO: 1.35,
  VIVIENDA_UNIFAMILIAR: 1.08,
  OBRA_NUEVA: 1.45,
  CAMBIO_USO: 1.18,
  OFICINA: 0.9,
  NAVE: 1.1,
};

const scopeFactor: Record<string, number> = {
  REFORMA_INTEGRAL: 1,
  REFORMA_PARCIAL: 0.65,
  REHABILITACION: 1.1,
  ADECUACION: 0.8,
  OBRA_NUEVA: 1.35,
  REESTRUCTURACION: 1.45,
  CAMBIO_USO: 1.2,
};

function buildComplexBuildingTypology(seed: {
  code: string;
  name: string;
  description: string;
  workType: string;
  scopeType: string;
  complexityFactor: number;
  costSensitivity: number;
  timeSensitivity: number;
  operationalSensitivity: number;
  includeFacade?: boolean;
  includeKitchenPackage?: boolean;
}) {
  const kitchenPackage = seed.includeKitchenPackage === false
    ? []
    : [
        {
          code: 'COCINAS_OFFICE',
          chapterCode: '05',
          chapterName: 'ACABADOS Y EQUIPAMIENTO',
          name: 'Kitchenettes, cocinas comunes y puntos de office',
          unit: 'ud',
          order: 58,
          standardActivityCode: 'CAR-REM',
          productivityRateName: 'Carpinteria y remates',
          inclusionRule: { anyCountSources: ['kitchens'], fallbackUnlessScopeIn: ['CAMBIO_USO', 'REESTRUCTURACION', 'REHABILITACION'] },
          measurementRule: { terms: [{ source: 'kitchens', factor: 1 }], min: 0.1 },
          pricingRule: { materialRate: 2800, associatedRate: 180, commercialFactor: 1.28, fallbackLaborHoursPerUnit: 10 },
        },
      ];

  const facadePackage = seed.includeFacade
    ? [
        {
          code: 'ENVOLVENTE',
          chapterCode: '07',
          chapterName: 'ENVOLVENTE Y OBRAS EXTERIORES',
          name: 'Fachadas, huecos, impermeabilizacion y ajustes de envolvente',
          unit: 'm2',
          order: 80,
          standardActivityCode: 'ACA-GEN',
          productivityRateName: 'Acabados generales',
          inclusionRule: { worksAnyTags: ['tile', 'joinery'], fallbackUnlessScopeIn: ['REHABILITACION', 'CAMBIO_USO'] },
          measurementRule: { terms: [{ source: 'area', factor: 0.12 }, { source: 'floors', factor: 18 }], min: 0.1 },
          pricingRule: { materialRate: 45, associatedRate: 16, commercialFactor: 1.26, fallbackLaborHoursPerUnit: 0.24 },
        },
      ]
    : [];

  return {
    code: seed.code,
    name: seed.name,
    description: seed.description,
    workType: seed.workType,
    siteType: 'EDIFICIO',
    scopeType: seed.scopeType,
    complexityFactor: seed.complexityFactor,
    costSensitivity: seed.costSensitivity,
    timeSensitivity: seed.timeSensitivity,
    operationalSensitivity: seed.operationalSensitivity,
    costItems: [
      {
        code: 'PRELIMINARES',
        chapterCode: '01',
        chapterName: 'IMPLANTACION Y SEGURIDAD',
        name: 'Implantacion, protecciones, sectorizacion y medios auxiliares de edificio',
        unit: 'ud',
        lineKind: 'PROVISIONAL',
        order: 10,
        standardActivityCode: 'PRE-IMPL',
        productivityRateName: 'Implantacion base',
        measurementRule: { base: 1, terms: [{ source: 'floors', factor: 0.12 }, { source: 'units', factor: 0.05 }] },
        pricingRule: { materialRate: 420, associatedRate: 240, commercialFactor: 1.2, fallbackLaborHoursPerUnit: 18 },
      },
      {
        code: 'DEMOLICION',
        chapterCode: '02',
        chapterName: 'DEMOLICIONES Y DESMONTAJES',
        name: 'Demolicion interior, desmontajes y retirada selectiva',
        unit: 'm2',
        order: 20,
        standardActivityCode: 'DEM-RET',
        productivityRateName: 'Demolicion interior',
        inclusionRule: { worksAnyTags: ['demolition'], fallbackUnlessScopeIn: ['CAMBIO_USO', 'REESTRUCTURACION', 'REHABILITACION'] },
        measurementRule: { terms: [{ source: 'area', factor: 0.42 }, { source: 'rooms', factor: 2 }], conditionalTerms: [{ tag: 'demolition', source: 'area', factor: 0.32 }], min: 0.1 },
        pricingRule: { materialRate: 14, associatedRate: 30, commercialFactor: 1.24, fallbackLaborHoursPerUnit: 0.3 },
      },
      {
        code: 'REDISTRIBUCION',
        chapterCode: '03',
        chapterName: 'ALBANILERIA Y REDISTRIBUCION',
        name: 'Nuevas distribuciones, pladur, cierres y regularizacion',
        unit: 'm2',
        order: 30,
        standardActivityCode: 'ALB-INT',
        productivityRateName: 'Albanileria interior',
        inclusionRule: { worksAnyTags: ['plasterboard'], includeIfStructural: true, fallbackUnlessScopeIn: ['REESTRUCTURACION', 'CAMBIO_USO', 'REHABILITACION'] },
        measurementRule: { terms: [{ source: 'area', factor: 0.2 }, { source: 'rooms', factor: 4 }, { source: 'units', factor: 6 }], conditionalTerms: [{ tag: 'plasterboard', source: 'area', factor: 0.24 }], min: 0.1 },
        pricingRule: { materialRate: 32, associatedRate: 12, commercialFactor: 1.25, fallbackLaborHoursPerUnit: 0.26 },
      },
      {
        code: 'INSTALACIONES',
        chapterCode: '04',
        chapterName: 'INSTALACIONES GENERALES',
        name: 'Electricidad, fontaneria, saneamiento, ventilacion y climatizacion base',
        unit: 'punto',
        order: 40,
        standardActivityCode: 'INS-GEN',
        productivityRateName: 'Instalaciones interiores',
        inclusionRule: { worksAnyTags: ['installations'], fallbackUnlessScopeIn: ['CAMBIO_USO', 'REESTRUCTURACION', 'REHABILITACION'] },
        measurementRule: { terms: [{ source: 'area', factor: 0.55 }, { source: 'bathrooms', factor: 16 }, { source: 'kitchens', factor: 12 }, { source: 'rooms', factor: 3.5 }], conditionalTerms: [{ tag: 'installations', source: 'area', factor: 0.28 }], min: 0.1 },
        pricingRule: { materialRate: 52, associatedRate: 17, commercialFactor: 1.29, fallbackLaborHoursPerUnit: 0.36 },
      },
      {
        code: 'BANOS_REPETITIVOS',
        chapterCode: '05',
        chapterName: 'ACABADOS Y EQUIPAMIENTO',
        name: 'Banos repetitivos, alicatados y aparatos sanitarios',
        unit: 'ud',
        order: 50,
        standardActivityCode: 'ACA-GEN',
        productivityRateName: 'Acabados generales',
        inclusionRule: { anyCountSources: ['bathrooms'], fallbackUnlessScopeIn: ['CAMBIO_USO', 'REESTRUCTURACION', 'REHABILITACION'] },
        measurementRule: { terms: [{ source: 'bathrooms', factor: 1 }], min: 0.1 },
        pricingRule: { materialRate: 2350, associatedRate: 120, commercialFactor: 1.27, fallbackLaborHoursPerUnit: 11 },
      },
      ...kitchenPackage,
      {
        code: 'ACABADOS_HAB',
        chapterCode: '05',
        chapterName: 'ACABADOS Y EQUIPAMIENTO',
        name: 'Suelos, pintura, techos y acabados de habitaciones y unidades',
        unit: 'm2',
        order: 60,
        standardActivityCode: 'ACA-GEN',
        productivityRateName: 'Acabados generales',
        measurementRule: { terms: [{ source: 'area', factor: 0.84 }], min: 0.1 },
        pricingRule: { materialRate: 34, associatedRate: 9, commercialFactor: 1.25, fallbackLaborHoursPerUnit: 0.18 },
      },
      {
        code: 'ZONAS_COMUNES',
        chapterCode: '06',
        chapterName: 'ZONAS COMUNES Y REMATES',
        name: 'Portales, pasillos, escaleras, office comun y remates generales',
        unit: 'm2',
        order: 70,
        standardActivityCode: 'CAR-REM',
        productivityRateName: 'Carpinteria y remates',
        measurementRule: { terms: [{ source: 'area', factor: 0.18 }, { source: 'floors', factor: 6 }], min: 0.1 },
        pricingRule: { materialRate: 48, associatedRate: 14, commercialFactor: 1.24, fallbackLaborHoursPerUnit: 0.22 },
      },
      ...facadePackage,
      {
        code: 'CIERRE',
        chapterCode: '08',
        chapterName: 'LIMPIEZA Y ENTREGA',
        name: 'Limpieza final, legalizacion documental y entrega',
        unit: 'ud',
        lineKind: 'ASSOCIATED',
        order: 90,
        standardActivityCode: 'ENT-CIE',
        productivityRateName: 'Cierre y entrega',
        measurementRule: { base: 1, terms: [{ source: 'units', factor: 0.08 }] },
        pricingRule: { materialRate: 120, associatedRate: 65, commercialFactor: 1.2, fallbackLaborHoursPerUnit: 10 },
      },
    ],
    locationTemplates: [
      { code: 'site-root', name: 'Edificio', type: 'EDIFICIO', order: 10, generationMode: 'FIXED', quantityRule: { count: 1 } },
      { code: 'floor', name: 'Planta', type: 'PLANTA', parentCode: 'site-root', order: 20, generationMode: 'COUNT', quantityRule: { source: 'floors', fallback: 2 } },
      { code: 'unit', name: 'Unidad', type: 'VIVIENDA', parentCode: 'site-root', order: 30, generationMode: 'COUNT', quantityRule: { source: 'units', fallback: 4 } },
      { code: 'room', name: 'Habitacion', type: 'HABITACION', parentCode: 'site-root', order: 40, generationMode: 'COUNT', quantityRule: { source: 'rooms', fallback: 8 } },
      { code: 'bath', name: 'Bano', type: 'BANO', parentCode: 'site-root', order: 50, generationMode: 'COUNT', quantityRule: { source: 'bathrooms', fallback: 4 } },
      { code: 'kitchen', name: 'Cocina / kitchenette', type: 'COCINA', parentCode: 'site-root', order: 60, generationMode: 'COUNT', quantityRule: { source: 'kitchens', fallback: 2 } },
      { code: 'common', name: 'Zonas comunes', type: 'ZONA_COMUN', parentCode: 'site-root', order: 70, generationMode: 'FIXED', quantityRule: { count: 1 } },
    ],
    activityTemplates: [
      { code: 'ACT-PRELIM', standardActivityCode: 'PRE-IMPL', wbsCode: '01', locationCode: 'site-root', costItemCode: 'PRELIMINARES', order: 10 },
      { code: 'ACT-DEM', standardActivityCode: 'DEM-RET', wbsCode: '02', locationCode: 'site-root', costItemCode: 'DEMOLICION', order: 20, dependencyType: 'FS', lagDays: 0 },
      { code: 'ACT-RED', standardActivityCode: 'ALB-INT', wbsCode: '03', locationCode: 'floor', costItemCode: 'REDISTRIBUCION', order: 30, dependencyType: 'FS', lagDays: 0 },
      { code: 'ACT-INS', standardActivityCode: 'INS-GEN', wbsCode: '04', locationCode: 'room', costItemCode: 'INSTALACIONES', order: 40, dependencyType: 'FS', lagDays: 0 },
      { code: 'ACT-BAN', standardActivityCode: 'ACA-GEN', wbsCode: '05', locationCode: 'bath', costItemCode: 'BANOS_REPETITIVOS', order: 50, dependencyType: 'FS', lagDays: 0 },
      ...(seed.includeKitchenPackage === false
        ? []
        : [{ code: 'ACT-KIT', standardActivityCode: 'CAR-REM', wbsCode: '05', locationCode: 'kitchen', costItemCode: 'COCINAS_OFFICE', order: 55, dependencyType: 'FS', lagDays: 0 }]),
      { code: 'ACT-ACA', standardActivityCode: 'ACA-GEN', wbsCode: '05', locationCode: 'room', costItemCode: 'ACABADOS_HAB', order: 60, dependencyType: 'FS', lagDays: 0 },
      { code: 'ACT-COM', standardActivityCode: 'CAR-REM', wbsCode: '06', locationCode: 'common', costItemCode: 'ZONAS_COMUNES', order: 70, dependencyType: 'FS', lagDays: 0 },
      ...(seed.includeFacade ? [{ code: 'ACT-FAC', standardActivityCode: 'ACA-GEN', wbsCode: '07', locationCode: 'site-root', costItemCode: 'ENVOLVENTE', order: 80, dependencyType: 'FS', lagDays: 0 }] : []),
      { code: 'ACT-CIE', standardActivityCode: 'ENT-CIE', wbsCode: '08', locationCode: 'site-root', costItemCode: 'CIERRE', order: 90, dependencyType: 'FS', lagDays: 0 },
    ],
  } satisfies TypologySeed;
}

export function detectWorkTags(text: string) {
  const value = (text || '').toLowerCase();
  return {
    demolition: /demolic|derribo|retirada/.test(value),
    installations: /electric|fontaner|clima|telecom/.test(value),
    plasterboard: /pladur|tabique|trasdos/.test(value),
    floor: /suelo|paviment|tarima|laminad/.test(value),
    paint: /pintur|repint/.test(value),
    kitchen: /cocin/.test(value),
    bath: /bano|baño/.test(value),
    joinery: /carpinter|puerta|armario/.test(value),
    tile: /alicat|azulej|revest/.test(value),
  };
}

function getContextMetric(source: string, context: AutomationContext) {
  switch (source) {
    case 'area':
      return Math.max(0, context.area || 0);
    case 'bathrooms':
      return Math.max(0, context.bathrooms || 0);
    case 'kitchens':
      return Math.max(0, context.kitchens || 0);
    case 'rooms':
      return Math.max(0, context.rooms || 0);
    case 'roomsDerived':
      return Math.max(2, context.rooms || Math.round((context.area || 0) / 22));
    case 'units':
      return Math.max(1, context.units || 1);
    case 'floors':
      return Math.max(1, context.floors || 1);
    case 'fixed':
      return 1;
    default:
      return 0;
  }
}

export function matchesInclusionRule(rule: RuleObject, context: AutomationContext, tags = detectWorkTags(context.works || '')) {
  if (!rule || typeof rule !== 'object') return true;
  const worksAnyTags = Array.isArray(rule.worksAnyTags) ? (rule.worksAnyTags as string[]) : [];
  const fallbackUnlessWorkTypeIn = Array.isArray(rule.fallbackUnlessWorkTypeIn) ? (rule.fallbackUnlessWorkTypeIn as string[]) : [];
  const fallbackUnlessScopeIn = Array.isArray(rule.fallbackUnlessScopeIn) ? (rule.fallbackUnlessScopeIn as string[]) : [];
  const anyCountSources = Array.isArray(rule.anyCountSources) ? (rule.anyCountSources as string[]) : [];

  if (worksAnyTags.length > 0 && worksAnyTags.some((tag) => tags[tag as keyof typeof tags])) return true;
  if (rule.includeIfStructural === true && context.structuralWorks) return true;
  if (anyCountSources.some((source) => getContextMetric(source, context) > 0)) return true;
  if (fallbackUnlessWorkTypeIn.length > 0) return !fallbackUnlessWorkTypeIn.includes(context.workType);
  if (fallbackUnlessScopeIn.length > 0) return fallbackUnlessScopeIn.includes(context.scopeType);
  if (worksAnyTags.length > 0 || anyCountSources.length > 0 || rule.includeIfStructural === true) return false;
  return true;
}

export function evaluateMeasurementRule(rule: RuleObject, context: AutomationContext, tags = detectWorkTags(context.works || '')) {
  if (!rule || typeof rule !== 'object') return 0;

  let total = typeof rule.base === 'number' ? rule.base : 0;
  const terms = Array.isArray(rule.terms) ? (rule.terms as Array<Record<string, unknown>>) : [];
  const conditionalTerms = Array.isArray(rule.conditionalTerms) ? (rule.conditionalTerms as Array<Record<string, unknown>>) : [];

  for (const term of terms) {
    const source = typeof term.source === 'string' ? term.source : '';
    const factor = typeof term.factor === 'number' ? term.factor : 0;
    total += getContextMetric(source, context) * factor;
  }

  for (const term of conditionalTerms) {
    const source = typeof term.source === 'string' ? term.source : '';
    const factor = typeof term.factor === 'number' ? term.factor : 0;
    const tag = typeof term.tag === 'string' ? term.tag : '';
    const ifStructural = term.ifStructural === true;

    if (tag && tags[tag as keyof typeof tags]) total += getContextMetric(source, context) * factor;
    if (ifStructural && context.structuralWorks) total += getContextMetric(source, context) * factor;
  }

  if (typeof rule.multiplyBySource === 'string') {
    total *= getContextMetric(rule.multiplyBySource, context);
  }

  const thresholds = Array.isArray(rule.areaThresholds) ? (rule.areaThresholds as Array<Record<string, unknown>>) : [];
  for (const threshold of thresholds) {
    const minArea = typeof threshold.minArea === 'number' ? threshold.minArea : Number.NEGATIVE_INFINITY;
    const value = typeof threshold.value === 'number' ? threshold.value : total;
    if ((context.area || 0) >= minArea) total = value;
  }

  const min = typeof rule.min === 'number' ? rule.min : 0;
  return Math.max(min, total);
}

function getRatePerDay(rate: { value: number; unit: string } | null | undefined) {
  if (!rate || !rate.value) return null;
  return /\/dia|\/día/i.test(rate.unit) ? rate.value : null;
}

export function estimateDurationFromRate(quantity: number, rate: { value: number; unit: string } | null | undefined, fallbackHoursPerUnit = 0) {
  const perDay = getRatePerDay(rate);
  if (perDay && perDay > 0) return Math.max(1, Number((quantity / perDay).toFixed(1)));
  if (fallbackHoursPerUnit > 0) return Math.max(1, Number(((quantity * fallbackHoursPerUnit) / 8).toFixed(1)));
  return 1;
}

export function estimateLaborHours(quantity: number, rate: { value: number; unit: string } | null | undefined, fallbackHoursPerUnit = 0) {
  const duration = estimateDurationFromRate(quantity, rate, fallbackHoursPerUnit);
  const perDay = getRatePerDay(rate);
  if (perDay && perDay > 0) return Number((duration * 8).toFixed(2));
  return Number((quantity * fallbackHoursPerUnit).toFixed(2));
}

const TYPOLOGY_SEEDS: TypologySeed[] = [
  {
    code: 'REFORMA_INTEGRAL_PISO',
    name: 'Reforma integral vivienda',
    description: 'Tipologia base para reforma integral de piso o vivienda',
    workType: 'REFORMA_INTEGRAL_VIVIENDA',
    siteType: 'PISO',
    scopeType: 'REFORMA_INTEGRAL',
    complexityFactor: 1,
    costSensitivity: 1,
    timeSensitivity: 1,
    operationalSensitivity: 1,
    costItems: [
      {
        code: 'PRELIMINARES',
        chapterCode: '01',
        chapterName: 'PRELIMINARES',
        name: 'Implantacion, protecciones generales y medios iniciales',
        unit: 'ud',
        lineKind: 'PROVISIONAL',
        order: 10,
        standardActivityCode: 'PRE-IMPL',
        productivityRateName: 'Implantacion base',
        measurementRule: { base: 1, areaThresholds: [{ minArea: 120, value: 1.2 }] },
        pricingRule: { materialRate: 180, associatedRate: 120, commercialFactor: 1.22, fallbackLaborHoursPerUnit: 10 },
      },
      {
        code: 'DEMOLICION',
        chapterCode: '02',
        chapterName: 'DEMOLICIONES Y RETIRADAS',
        name: 'Demolicion y retirada de elementos existentes',
        unit: 'm2',
        order: 20,
        standardActivityCode: 'DEM-RET',
        productivityRateName: 'Demolicion interior',
        inclusionRule: { worksAnyTags: ['demolition'], fallbackUnlessWorkTypeIn: ['REHABILITACION_LIGERA'] },
        measurementRule: { terms: [{ source: 'area', factor: 0.45 }], conditionalTerms: [{ tag: 'demolition', source: 'area', factor: 1 }], multiplyBySource: 'units', min: 0.1 },
        pricingRule: { materialRate: 12, associatedRate: 24, commercialFactor: 1.25, fallbackLaborHoursPerUnit: 0.28 },
      },
      {
        code: 'ALBANILERIA',
        chapterCode: '03',
        chapterName: 'ALBANILERIA Y ESTRUCTURA',
        name: 'Albanileria, rozas, tapados y pequenos cerramientos',
        unit: 'm2',
        order: 30,
        standardActivityCode: 'ALB-INT',
        productivityRateName: 'Albanileria interior',
        inclusionRule: { worksAnyTags: ['plasterboard'], includeIfStructural: true, fallbackUnlessWorkTypeIn: ['REHABILITACION_LIGERA'] },
        measurementRule: { terms: [{ source: 'area', factor: 0.18 }], conditionalTerms: [{ tag: 'plasterboard', source: 'area', factor: 0.35 }], min: 0.1 },
        pricingRule: { materialRate: 24, associatedRate: 10, commercialFactor: 1.24, fallbackLaborHoursPerUnit: 0.22 },
      },
      {
        code: 'INSTALACIONES',
        chapterCode: '04',
        chapterName: 'INSTALACIONES',
        name: 'Instalaciones electricas y fontaneria',
        unit: 'punto',
        order: 40,
        standardActivityCode: 'INS-GEN',
        productivityRateName: 'Instalaciones interiores',
        inclusionRule: { worksAnyTags: ['installations'], fallbackUnlessWorkTypeIn: ['REHABILITACION_LIGERA'] },
        measurementRule: { terms: [{ source: 'area', factor: 0.7 }, { source: 'bathrooms', factor: 14 }, { source: 'kitchens', factor: 10 }], conditionalTerms: [{ tag: 'installations', source: 'area', factor: 0.35 }], min: 0.1 },
        pricingRule: { materialRate: 48, associatedRate: 14, commercialFactor: 1.28, fallbackLaborHoursPerUnit: 0.33 },
      },
      {
        code: 'PAVIMENTOS',
        chapterCode: '05',
        chapterName: 'REVESTIMIENTOS Y ACABADOS',
        name: 'Pavimento general y colocacion de acabados',
        unit: 'm2',
        order: 50,
        standardActivityCode: 'ACA-GEN',
        productivityRateName: 'Acabados generales',
        measurementRule: { terms: [{ source: 'area', factor: 0.72 }], conditionalTerms: [{ tag: 'floor', source: 'area', factor: 0.92 }], min: 0.1 },
        pricingRule: { materialRate: 26, associatedRate: 8, commercialFactor: 1.26, fallbackLaborHoursPerUnit: 0.18 },
      },
      {
        code: 'PINTURA',
        chapterCode: '05',
        chapterName: 'REVESTIMIENTOS Y ACABADOS',
        name: 'Pintura de paramentos y techos',
        unit: 'm2',
        order: 60,
        standardActivityCode: 'ACA-GEN',
        productivityRateName: 'Acabados generales',
        inclusionRule: { worksAnyTags: ['paint'], fallbackUnlessWorkTypeIn: ['REHABILITACION_LIGERA'] },
        measurementRule: { terms: [{ source: 'area', factor: 2.8 }], min: 0.1 },
        pricingRule: { materialRate: 7, associatedRate: 3, commercialFactor: 1.24, fallbackLaborHoursPerUnit: 0.07 },
      },
      {
        code: 'ALICATADOS',
        chapterCode: '05',
        chapterName: 'REVESTIMIENTOS Y ACABADOS',
        name: 'Alicatados y revestimientos',
        unit: 'm2',
        order: 70,
        standardActivityCode: 'ACA-GEN',
        productivityRateName: 'Acabados generales',
        inclusionRule: { worksAnyTags: ['tile'], anyCountSources: ['bathrooms', 'kitchens'] },
        measurementRule: { terms: [{ source: 'bathrooms', factor: 16 }, { source: 'kitchens', factor: 12 }], conditionalTerms: [{ tag: 'tile', source: 'area', factor: 0.25 }], min: 0.1 },
        pricingRule: { materialRate: 32, associatedRate: 9, commercialFactor: 1.28, fallbackLaborHoursPerUnit: 0.2 },
      },
      {
        code: 'CARPINTERIA',
        chapterCode: '06',
        chapterName: 'CARPINTERIAS Y ESPECIALES',
        name: 'Carpinteria interior y remates de equipamiento',
        unit: 'ud',
        order: 80,
        standardActivityCode: 'CAR-REM',
        productivityRateName: 'Carpinteria y remates',
        inclusionRule: { worksAnyTags: ['joinery'], fallbackUnlessWorkTypeIn: ['REHABILITACION_LIGERA'] },
        measurementRule: { terms: [{ source: 'roomsDerived', factor: 1 }, { source: 'bathrooms', factor: 1.5 }, { source: 'kitchens', factor: 2 }], min: 0.1 },
        pricingRule: { materialRate: 260, associatedRate: 35, commercialFactor: 1.22, fallbackLaborHoursPerUnit: 1.1 },
      },
      {
        code: 'RESIDUOS',
        chapterCode: '07',
        chapterName: 'LIMPIEZA, RESIDUOS Y ENTREGA',
        name: 'Retirada de residuos, contenedor y gestion medioambiental',
        unit: 'm3',
        lineKind: 'ASSOCIATED',
        order: 90,
        standardActivityCode: 'DEM-RET',
        productivityRateName: 'Demolicion interior',
        measurementRule: { base: 2, terms: [{ source: 'area', factor: 0.04 }], conditionalTerms: [{ tag: 'demolition', source: 'area', factor: 0.09 }], multiplyBySource: 'units', min: 2 },
        pricingRule: { materialRate: 18, associatedRate: 42, commercialFactor: 1.3, fallbackLaborHoursPerUnit: 0.08 },
      },
      {
        code: 'CIERRE',
        chapterCode: '07',
        chapterName: 'LIMPIEZA, RESIDUOS Y ENTREGA',
        name: 'Limpieza final, protecciones y entrega de obra',
        unit: 'ud',
        lineKind: 'ASSOCIATED',
        order: 100,
        standardActivityCode: 'ENT-CIE',
        productivityRateName: 'Cierre y entrega',
        measurementRule: { base: 1 },
        pricingRule: { materialRate: 55, associatedRate: 18, commercialFactor: 1.2, fallbackLaborHoursPerUnit: 6 },
      },
    ],
    locationTemplates: [
      { code: 'site-root', name: 'Piso / vivienda', type: 'PISO', order: 10, generationMode: 'FIXED', quantityRule: { count: 1 } },
      { code: 'living', name: 'Salon / zona dia', type: 'SALON', parentCode: 'site-root', order: 20, generationMode: 'FIXED', quantityRule: { count: 1 } },
      { code: 'kitchen', name: 'Cocina', type: 'COCINA', parentCode: 'site-root', order: 30, generationMode: 'FIXED', quantityRule: { count: 1 } },
      { code: 'bath', name: 'Bano', type: 'BANO', parentCode: 'site-root', order: 40, generationMode: 'COUNT', quantityRule: { source: 'bathrooms', fallback: 1 } },
      { code: 'room', name: 'Habitacion', type: 'HABITACION', parentCode: 'site-root', order: 50, generationMode: 'COUNT', quantityRule: { source: 'rooms', fallback: 3 } },
    ],
    activityTemplates: [
      { code: 'ACT-PRELIM', standardActivityCode: 'PRE-IMPL', wbsCode: '01', locationCode: 'site-root', costItemCode: 'PRELIMINARES', order: 10 },
      { code: 'ACT-DEM', standardActivityCode: 'DEM-RET', wbsCode: '02', locationCode: 'site-root', costItemCode: 'DEMOLICION', order: 20, inclusionRule: { worksAnyTags: ['demolition'], fallbackUnlessScopeIn: ['ADECUACION'] } },
      { code: 'ACT-ALB', standardActivityCode: 'ALB-INT', wbsCode: '03', locationCode: 'site-root', costItemCode: 'ALBANILERIA', order: 30, inclusionRule: { worksAnyTags: ['plasterboard'], includeIfStructural: true, fallbackUnlessScopeIn: ['REFORMA_INTEGRAL'] } },
      { code: 'ACT-INS', standardActivityCode: 'INS-GEN', wbsCode: '04', locationCode: 'site-root', costItemCode: 'INSTALACIONES', order: 40, inclusionRule: { worksAnyTags: ['installations'], fallbackUnlessScopeIn: ['OBRA_NUEVA'] } },
      { code: 'ACT-ACA', standardActivityCode: 'ACA-GEN', wbsCode: '05', locationCode: 'site-root', costItemCode: 'PAVIMENTOS', order: 50, inclusionRule: { worksAnyTags: ['floor', 'paint', 'tile'], fallbackUnlessScopeIn: ['REFORMA_INTEGRAL', 'REHABILITACION'] } },
      { code: 'ACT-CAR', standardActivityCode: 'CAR-REM', wbsCode: '06', locationCode: 'site-root', costItemCode: 'CARPINTERIA', order: 60 },
      { code: 'ACT-CIE', standardActivityCode: 'ENT-CIE', wbsCode: '07', locationCode: 'site-root', costItemCode: 'CIERRE', order: 70 },
    ],
  },
  {
    code: 'REFORMA_PARCIAL_PISO',
    name: 'Reforma parcial vivienda',
    description: 'Tipologia para actuaciones parciales en vivienda',
    workType: 'REFORMA_PARCIAL',
    siteType: 'PISO',
    scopeType: 'REFORMA_PARCIAL',
    complexityFactor: 0.9,
    costSensitivity: 0.85,
    timeSensitivity: 0.85,
    operationalSensitivity: 0.9,
    costItems: [
      { code: 'PRELIMINARES', chapterCode: '01', chapterName: 'PRELIMINARES', name: 'Implantacion y protecciones parciales', unit: 'ud', order: 10, standardActivityCode: 'PRE-IMPL', productivityRateName: 'Implantacion base', measurementRule: { base: 1 }, pricingRule: { materialRate: 95, associatedRate: 60, commercialFactor: 1.18, fallbackLaborHoursPerUnit: 5 } },
      { code: 'PARTIDA_GENERAL', chapterCode: '05', chapterName: 'REVESTIMIENTOS Y ACABADOS', name: 'Trabajos parciales de reforma y remate', unit: 'm2', order: 20, standardActivityCode: 'ACA-GEN', productivityRateName: 'Acabados generales', measurementRule: { terms: [{ source: 'area', factor: 0.65 }], min: 0.1 }, pricingRule: { materialRate: 22, associatedRate: 7, commercialFactor: 1.22, fallbackLaborHoursPerUnit: 0.18 } },
      { code: 'CIERRE', chapterCode: '07', chapterName: 'LIMPIEZA, RESIDUOS Y ENTREGA', name: 'Limpieza final y entrega parcial', unit: 'ud', lineKind: 'ASSOCIATED', order: 30, standardActivityCode: 'ENT-CIE', productivityRateName: 'Cierre y entrega', measurementRule: { base: 1 }, pricingRule: { materialRate: 30, associatedRate: 12, commercialFactor: 1.18, fallbackLaborHoursPerUnit: 3 } },
    ],
    locationTemplates: [
      { code: 'site-root', name: 'Zona de intervencion', type: 'ZONA_COMUN', order: 10, generationMode: 'FIXED', quantityRule: { count: 1 } },
    ],
    activityTemplates: [
      { code: 'ACT-PRELIM', standardActivityCode: 'PRE-IMPL', wbsCode: '01', locationCode: 'site-root', costItemCode: 'PRELIMINARES', order: 10 },
      { code: 'ACT-REFORMA', standardActivityCode: 'ACA-GEN', wbsCode: '05', locationCode: 'site-root', costItemCode: 'PARTIDA_GENERAL', order: 20 },
      { code: 'ACT-CIE', standardActivityCode: 'ENT-CIE', wbsCode: '07', locationCode: 'site-root', costItemCode: 'CIERRE', order: 30 },
    ],
  },
  {
    code: 'ADECUACION_LOCAL',
    name: 'Adecuacion de local',
    description: 'Tipologia base para local comercial u oficina',
    workType: 'ADECUACION_LOCAL',
    siteType: 'LOCAL',
    scopeType: 'ADECUACION',
    complexityFactor: 1,
    costSensitivity: 1,
    timeSensitivity: 1.05,
    operationalSensitivity: 1.1,
    costItems: [
      { code: 'PRELIMINARES', chapterCode: '01', chapterName: 'PRELIMINARES', name: 'Implantacion y protecciones de local', unit: 'ud', order: 10, standardActivityCode: 'PRE-IMPL', productivityRateName: 'Implantacion base', measurementRule: { base: 1 }, pricingRule: { materialRate: 160, associatedRate: 110, commercialFactor: 1.2, fallbackLaborHoursPerUnit: 9 } },
      { code: 'INSTALACIONES', chapterCode: '04', chapterName: 'INSTALACIONES', name: 'Instalaciones y adecuacion tecnica del local', unit: 'punto', order: 20, standardActivityCode: 'INS-GEN', productivityRateName: 'Instalaciones interiores', measurementRule: { terms: [{ source: 'area', factor: 0.8 }], conditionalTerms: [{ tag: 'installations', source: 'area', factor: 0.45 }], min: 0.1 }, pricingRule: { materialRate: 55, associatedRate: 16, commercialFactor: 1.3, fallbackLaborHoursPerUnit: 0.34 } },
      { code: 'ACABADOS', chapterCode: '05', chapterName: 'REVESTIMIENTOS Y ACABADOS', name: 'Suelos, pintura y acabados del local', unit: 'm2', order: 30, standardActivityCode: 'ACA-GEN', productivityRateName: 'Acabados generales', measurementRule: { terms: [{ source: 'area', factor: 0.88 }], min: 0.1 }, pricingRule: { materialRate: 28, associatedRate: 10, commercialFactor: 1.26, fallbackLaborHoursPerUnit: 0.19 } },
      { code: 'ESPECIALES', chapterCode: '06', chapterName: 'CARPINTERIAS Y ESPECIALES', name: 'Trabajos especiales por adecuacion funcional y legalizacion', unit: 'ud', order: 40, standardActivityCode: 'CAR-REM', productivityRateName: 'Carpinteria y remates', measurementRule: { base: 3, conditionalTerms: [{ ifStructural: true, source: 'fixed', factor: 2 }] }, pricingRule: { materialRate: 320, associatedRate: 48, commercialFactor: 1.34, fallbackLaborHoursPerUnit: 2.4 } },
    ],
    locationTemplates: [
      { code: 'site-root', name: 'Local comercial', type: 'LOCAL', order: 10, generationMode: 'FIXED', quantityRule: { count: 1 } },
      { code: 'main-zone', name: 'Zona principal', type: 'ZONA_COMUN', parentCode: 'site-root', order: 20, generationMode: 'FIXED', quantityRule: { count: 1 } },
      { code: 'service-zone', name: 'Aseo / servicios', type: 'BANO', parentCode: 'site-root', order: 30, generationMode: 'FIXED', quantityRule: { count: 1 } },
      { code: 'access-zone', name: 'Accesos y escaparate', type: 'EXTERIOR', parentCode: 'site-root', order: 40, generationMode: 'FIXED', quantityRule: { count: 1 } },
    ],
    activityTemplates: [
      { code: 'ACT-PRELIM', standardActivityCode: 'PRE-IMPL', wbsCode: '01', locationCode: 'site-root', costItemCode: 'PRELIMINARES', order: 10 },
      { code: 'ACT-INS', standardActivityCode: 'INS-GEN', wbsCode: '04', locationCode: 'site-root', costItemCode: 'INSTALACIONES', order: 20 },
      { code: 'ACT-ACA', standardActivityCode: 'ACA-GEN', wbsCode: '05', locationCode: 'main-zone', costItemCode: 'ACABADOS', order: 30 },
      { code: 'ACT-ESP', standardActivityCode: 'CAR-REM', wbsCode: '06', locationCode: 'site-root', costItemCode: 'ESPECIALES', order: 40 },
      { code: 'ACT-CIE', standardActivityCode: 'ENT-CIE', wbsCode: '07', locationCode: 'site-root', order: 50 },
    ],
  },
  buildComplexBuildingTypology({
    code: 'REHABILITACION_EDIFICIO_BASE',
    name: 'Rehabilitacion ligera edificio',
    description: 'Tipologia base para rehabilitacion ligera de edificio, hotel o inmueble multiunidad',
    workType: 'REHABILITACION_LIGERA',
    scopeType: 'REHABILITACION',
    complexityFactor: 1.18,
    costSensitivity: 1.16,
    timeSensitivity: 1.18,
    operationalSensitivity: 1.18,
    includeFacade: true,
    includeKitchenPackage: true,
  }),
  buildComplexBuildingTypology({
    code: 'EDIFICIO_REESTRUCTURACION_BASE',
    name: 'Reestructuracion edificio completa',
    description: 'Tipologia base para redistribucion intensa, instalaciones completas y reforma integral de edificio',
    workType: 'REHABILITACION_LIGERA',
    scopeType: 'REESTRUCTURACION',
    complexityFactor: 1.28,
    costSensitivity: 1.24,
    timeSensitivity: 1.26,
    operationalSensitivity: 1.24,
    includeFacade: false,
    includeKitchenPackage: true,
  }),
  buildComplexBuildingTypology({
    code: 'EDIFICIO_CAMBIO_USO_BASE',
    name: 'Cambio de uso edificio',
    description: 'Tipologia base para cambio de uso de edificio con redistribucion, instalaciones completas y repeticion de habitaciones o unidades',
    workType: 'REHABILITACION_LIGERA',
    scopeType: 'CAMBIO_USO',
    complexityFactor: 1.32,
    costSensitivity: 1.28,
    timeSensitivity: 1.3,
    operationalSensitivity: 1.3,
    includeFacade: true,
    includeKitchenPackage: true,
  }),
  buildComplexBuildingTypology({
    code: 'COLIVING_REESTRUCTURACION_BASE',
    name: 'Coliving multiunidad',
    description: 'Tipologia base para coliving, habitaciones repetitivas, banos, kitchenettes y zonas comunes',
    workType: 'COLIVING',
    scopeType: 'REESTRUCTURACION',
    complexityFactor: 1.3,
    costSensitivity: 1.26,
    timeSensitivity: 1.28,
    operationalSensitivity: 1.3,
    includeFacade: false,
    includeKitchenPackage: true,
  }),
  buildComplexBuildingTypology({
    code: 'COLIVING_CAMBIO_USO_BASE',
    name: 'Coliving por cambio de uso',
    description: 'Tipologia base para cambio de uso a coliving con repeticion de habitaciones, banos y kitchenettes',
    workType: 'COLIVING',
    scopeType: 'CAMBIO_USO',
    complexityFactor: 1.36,
    costSensitivity: 1.3,
    timeSensitivity: 1.34,
    operationalSensitivity: 1.34,
    includeFacade: true,
    includeKitchenPackage: true,
  }),
];

const AUTOMATION_SEED_KEY = 'automation-masters';
export const AUTOMATION_SEED_VERSION = 3;

async function upsertStandardActivities(client: any = db) {
  for (const seed of STANDARD_ACTIVITY_SEEDS) {
    await client.standardActivity.upsert({
      where: { code: seed.code },
      update: {
        name: seed.name,
        category: seed.category,
        defaultUnit: seed.defaultUnit,
        requiresQuantity: seed.defaultUnit !== 'ud',
        requiresLocation: seed.requiresLocation,
        relatedToPurchases: seed.relatedToPurchases || false,
        status: 'ACTIVA',
      },
      create: {
        code: seed.code,
        name: seed.name,
        category: seed.category,
        defaultUnit: seed.defaultUnit,
        requiresQuantity: seed.defaultUnit !== 'ud',
        requiresLocation: seed.requiresLocation,
        relatedToPurchases: seed.relatedToPurchases || false,
        status: 'ACTIVA',
      },
    });
  }
}

async function upsertProductivityRates(client: any = db) {
  const activities = await client.standardActivity.findMany();
  const activityMap = new Map<string, string>(activities.map((activity: { code: string; id: string }) => [activity.code, activity.id]));

  for (const seed of PRODUCTIVITY_RATE_SEEDS) {
    await client.productivityRate.upsert({
      where: { id: `${seed.standardActivityCode}-${seed.name}` },
      update: {
        value: seed.value,
        unit: seed.unit,
        category: seed.category,
        complexity: seed.complexity,
        confidenceLevel: 'BASE_PLANIFICACION',
        status: 'ACTIVO',
        standardActivityId: activityMap.get(seed.standardActivityCode) || null,
      },
      create: {
        id: `${seed.standardActivityCode}-${seed.name}`,
        name: seed.name,
        standardActivityId: activityMap.get(seed.standardActivityCode) || null,
        value: seed.value,
        unit: seed.unit,
        category: seed.category,
        complexity: seed.complexity,
        workType: 'GENERICO',
        locationType: 'INTERIOR',
        confidenceLevel: 'BASE_PLANIFICACION',
        status: 'ACTIVO',
      },
    });
  }
}

async function upsertTypologies(client: any = db) {
  const activities = await client.standardActivity.findMany();
  const rates = await client.productivityRate.findMany();
  const activityMap = new Map<string, string>(activities.map((activity: { code: string; id: string }) => [activity.code, activity.id]));
  const rateMap = new Map<string, string>(rates.map((rate: { name: string; id: string }) => [rate.name, rate.id]));

  for (const seed of TYPOLOGY_SEEDS) {
    const typology = await client.projectTypology.upsert({
      where: { code: seed.code },
      update: {
        name: seed.name,
        description: seed.description,
        workType: seed.workType,
        siteType: seed.siteType,
        scopeType: seed.scopeType,
        complexityFactor: seed.complexityFactor,
        costSensitivity: seed.costSensitivity,
        timeSensitivity: seed.timeSensitivity,
        operationalSensitivity: seed.operationalSensitivity,
        status: 'ACTIVA',
      },
      create: {
        code: seed.code,
        name: seed.name,
        description: seed.description,
        workType: seed.workType,
        siteType: seed.siteType,
        scopeType: seed.scopeType,
        complexityFactor: seed.complexityFactor,
        costSensitivity: seed.costSensitivity,
        timeSensitivity: seed.timeSensitivity,
        operationalSensitivity: seed.operationalSensitivity,
        status: 'ACTIVA',
      },
    });

    await client.typologyCostItem.deleteMany({ where: { typologyId: typology.id } });
    await client.typologyLocationTemplate.deleteMany({ where: { typologyId: typology.id } });
    await client.typologyActivityTemplate.deleteMany({ where: { typologyId: typology.id } });

    for (const item of seed.costItems) {
      await client.typologyCostItem.create({
        data: {
          typologyId: typology.id,
          code: item.code,
          chapterCode: item.chapterCode,
          chapterName: item.chapterName,
          name: item.name,
          unit: item.unit,
          lineKind: item.lineKind || 'DIRECT',
          order: item.order,
          status: 'ACTIVA',
          inclusionRule: item.inclusionRule || null,
          measurementRule: item.measurementRule || null,
          pricingRule: item.pricingRule || null,
          standardActivityId: item.standardActivityCode ? activityMap.get(item.standardActivityCode) || null : null,
          productivityRateId: item.productivityRateName ? rateMap.get(item.productivityRateName) || null : null,
        },
      });
    }

    for (const location of seed.locationTemplates) {
      await client.typologyLocationTemplate.create({
        data: {
          typologyId: typology.id,
          code: location.code,
          name: location.name,
          type: location.type,
          parentCode: location.parentCode || null,
          generationMode: location.generationMode || 'FIXED',
          quantityRule: location.quantityRule || null,
          order: location.order,
          status: 'ACTIVA',
        },
      });
    }

    for (const activity of seed.activityTemplates) {
      const standardActivityId = activityMap.get(activity.standardActivityCode);
      if (!standardActivityId) continue;

      await client.typologyActivityTemplate.create({
        data: {
          typologyId: typology.id,
          code: activity.code,
          nameOverride: activity.nameOverride || null,
          wbsCode: activity.wbsCode || null,
          locationCode: activity.locationCode || null,
          costItemCode: activity.costItemCode || null,
          order: activity.order,
          dependencyType: activity.dependencyType || 'FS',
          lagDays: activity.lagDays || 0,
          inclusionRule: activity.inclusionRule || null,
          durationRule: activity.durationRule || null,
          status: 'ACTIVA',
          standardActivityId,
          productivityRateId: activity.costItemCode ? null : rates.find((rate: { standardActivityId: string | null; id: string }) => rate.standardActivityId === standardActivityId)?.id || null,
        },
      });
    }
  }
}

async function validateAutomationSeedIntegrity(client: any = db) {
  const typologies = await client.projectTypology.findMany({
    where: { code: { in: TYPOLOGY_SEEDS.map((seed) => seed.code) } },
    include: {
      costItems: true,
      locationTemplates: true,
      activityTemplates: true,
    },
  });
  const activities = await client.standardActivity.count({
    where: { code: { in: STANDARD_ACTIVITY_SEEDS.map((seed) => seed.code) } },
  });
  const rates = await client.productivityRate.count({
    where: { id: { in: PRODUCTIVITY_RATE_SEEDS.map((seed) => `${seed.standardActivityCode}-${seed.name}`) } },
  });

  const byCode = new Map<string, any>(typologies.map((typology: any) => [typology.code, typology]));
  const typologyIntegrity = TYPOLOGY_SEEDS.every((seed) => {
    const saved = byCode.get(seed.code);
    return saved
      && saved.costItems.length === seed.costItems.length
      && saved.locationTemplates.length === seed.locationTemplates.length
      && saved.activityTemplates.length === seed.activityTemplates.length;
  });

  return {
    valid:
      activities === STANDARD_ACTIVITY_SEEDS.length
      && rates === PRODUCTIVITY_RATE_SEEDS.length
      && typologies.length === TYPOLOGY_SEEDS.length
      && typologyIntegrity,
    snapshot: {
      standardActivities: activities,
      productivityRates: rates,
      typologies: typologies.length,
      seedVersion: AUTOMATION_SEED_VERSION,
    },
  };
}

export async function ensureAutomationMasters() {
  const state = await (db as any).automationSeedState.findUnique({
    where: { key: AUTOMATION_SEED_KEY },
  }).catch(() => null);
  const integrity = await validateAutomationSeedIntegrity();

  if (state?.version === AUTOMATION_SEED_VERSION && integrity.valid) return;

  await (db as any).$transaction(async (tx: any) => {
    await upsertStandardActivities(tx);
    await upsertProductivityRates(tx);
    await upsertTypologies(tx);

    const finalIntegrity = await validateAutomationSeedIntegrity(tx);
    if (!finalIntegrity.valid) {
      throw new Error('Automation masters seeding finished with incomplete integrity.');
    }

    await tx.automationSeedState.upsert({
      where: { key: AUTOMATION_SEED_KEY },
      update: {
        version: AUTOMATION_SEED_VERSION,
        status: 'OK',
        seededAt: new Date(),
        details: finalIntegrity.snapshot,
      },
      create: {
        key: AUTOMATION_SEED_KEY,
        version: AUTOMATION_SEED_VERSION,
        status: 'OK',
        seededAt: new Date(),
        details: finalIntegrity.snapshot,
      },
    });
  });
}

export async function loadAutomationTypology(context: AutomationContext) {
  await ensureAutomationMasters();

  const include = {
    costItems: {
      include: {
        standardActivity: true,
        productivityRate: true,
      },
      orderBy: { order: 'asc' as const },
    },
    locationTemplates: {
      orderBy: { order: 'asc' as const },
    },
    activityTemplates: {
      include: {
        standardActivity: true,
        productivityRate: true,
      },
      orderBy: { order: 'asc' as const },
    },
  };

  const exact = await (db as any).projectTypology.findFirst({
    where: {
      workType: context.workType,
      siteType: context.siteType,
      scopeType: context.scopeType,
      status: 'ACTIVA',
    },
    include,
  });

  if (exact) return exact;

  return (db as any).projectTypology.findFirst({
    where: {
      workType: context.workType,
      siteType: context.siteType,
      status: 'ACTIVA',
    },
    include,
  });
}

export function deriveComplexityFactor(context: AutomationContext, typology: { complexityFactor?: number; costSensitivity?: number; timeSensitivity?: number } | null | undefined) {
  const conditions = (context.conditions || '').toLowerCase();
  const conditionFactor = conditions.includes('complic') ? 1.15 : conditions.includes('acceso') ? 1.1 : 1;

  return {
    conditionFactor,
    accessFactor: accessFactor[context.accessLevel || 'NORMAL'] || 1,
    finishFactor: finishFactor[context.finishLevel] || 1,
    siteFactor: siteFactor[context.siteType] || 1,
    scopeFactor: scopeFactor[context.scopeType] || 1,
    typologyCostFactor: typology?.costSensitivity || 1,
    typologyTimeFactor: typology?.timeSensitivity || 1,
    complexityFactor: typology?.complexityFactor || 1,
  };
}

export function expandLocationTemplate(
  template: { code: string; name: string; type: string; parentCode?: string | null; generationMode: string; quantityRule?: RuleObject | null },
  context: AutomationContext
) {
  const items: Array<{ key: string; name: string; type: string; parentKey?: string | null; code?: string | null }> = [];
  const quantityRule = template.quantityRule && typeof template.quantityRule === 'object' ? template.quantityRule : null;

  let count = 1;
  if (template.generationMode === 'COUNT' && quantityRule && typeof quantityRule.source === 'string') {
    const fallback = typeof quantityRule.fallback === 'number' ? quantityRule.fallback : 1;
    count = Math.max(1, Math.round(getContextMetric(quantityRule.source, context) || fallback));
  } else if (quantityRule && typeof quantityRule.count === 'number') {
    count = Math.max(1, quantityRule.count);
  }

  if (count === 1) {
    items.push({
      key: template.code,
      name: template.name,
      type: template.type,
      parentKey: template.parentCode || null,
      code: template.code.toUpperCase(),
    });
    return items;
  }

  for (let index = 1; index <= count; index += 1) {
    items.push({
      key: `${template.code}-${index}`,
      name: `${template.name} ${index}`,
      type: template.type,
      parentKey: template.parentCode || null,
      code: `${template.code.toUpperCase()}${index}`,
    });
  }

  return items;
}

export function resolveLocationKey(templateCode: string | null | undefined, locationNodes: Array<{ key: string }>) {
  if (!templateCode) return 'site-root';
  const exact = locationNodes.find((location) => location.key === templateCode);
  if (exact) return exact.key;
  const prefix = locationNodes.find((location) => location.key.startsWith(`${templateCode}-`));
  return prefix?.key || 'site-root';
}
