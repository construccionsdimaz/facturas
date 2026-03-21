export type WorkType =
  | 'REFORMA_INTEGRAL_VIVIENDA'
  | 'REFORMA_COCINA_BANO'
  | 'REFORMA_PARCIAL'
  | 'ADECUACION_LOCAL'
  | 'COLIVING'
  | 'REHABILITACION_LIGERA';

export type SiteType =
  | 'PISO'
  | 'LOCAL'
  | 'EDIFICIO'
  | 'VIVIENDA_UNIFAMILIAR'
  | 'OBRA_NUEVA'
  | 'CAMBIO_USO'
  | 'OFICINA'
  | 'NAVE';

export type ScopeType =
  | 'REFORMA_INTEGRAL'
  | 'REFORMA_PARCIAL'
  | 'REHABILITACION'
  | 'ADECUACION'
  | 'OBRA_NUEVA'
  | 'REESTRUCTURACION'
  | 'CAMBIO_USO';

export type AccessLevel = 'FACIL' | 'NORMAL' | 'COMPLICADO' | 'MUY_COMPLICADO';

export type FinishLevel = 'BASICO' | 'MEDIO' | 'MEDIO_ALTO' | 'ALTO';

export interface EstimateGenerationInput {
  workType: WorkType;
  siteType: SiteType;
  scopeType: ScopeType;
  area: number;
  works: string;
  finishLevel: FinishLevel;
  accessLevel?: AccessLevel;
  conditions?: string;
  bathrooms?: number;
  kitchens?: number;
  rooms?: number;
  units?: number;
  floors?: number;
  hasElevator?: boolean;
  structuralWorks?: boolean;
}

export interface GeneratedEstimateLine {
  chapter: string;
  description: string;
  unit: string;
  quantity: number;
  commercialPrice: number;
  internalCost: number;
  laborHours: number;
  laborCost: number;
  materialCost: number;
  associatedCost: number;
  kind: 'DIRECT' | 'LABOR' | 'ASSOCIATED' | 'PROVISIONAL';
}

export interface GeneratedEstimateSummary {
  materialCost: number;
  laborCost: number;
  associatedCost: number;
  internalCost: number;
  marginAmount: number;
  commercialSubtotal: number;
  vatAmount: number;
  commercialTotal: number;
}

export interface GeneratedEstimateProposal {
  chapters: string[];
  lines: GeneratedEstimateLine[];
  summary: GeneratedEstimateSummary;
  notes: string[];
}

type ChapterSeed = {
  code: string;
  name: string;
};

const CHAPTERS: ChapterSeed[] = [
  { code: '01', name: 'PRELIMINARES' },
  { code: '02', name: 'DEMOLICIONES Y RETIRADAS' },
  { code: '03', name: 'ALBANILERIA Y ESTRUCTURA' },
  { code: '04', name: 'INSTALACIONES' },
  { code: '05', name: 'REVESTIMIENTOS Y ACABADOS' },
  { code: '06', name: 'CARPINTERIAS Y ESPECIALES' },
  { code: '07', name: 'LIMPIEZA, RESIDUOS Y ENTREGA' },
  { code: '08', name: 'INDIRECTOS Y CONTINGENCIA' },
];

type LineTemplate = {
  chapter: string;
  description: string;
  unit: string;
  quantity: (input: EstimateGenerationInput) => number;
  materialRate: number;
  laborHoursPerUnit: number;
  associatedRate: number;
  commercialFactor: number;
  kind?: 'DIRECT' | 'LABOR' | 'ASSOCIATED' | 'PROVISIONAL';
  includeWhen?: (input: EstimateGenerationInput) => boolean;
};

const finishFactor: Record<FinishLevel, number> = {
  BASICO: 0.9,
  MEDIO: 1,
  MEDIO_ALTO: 1.15,
  ALTO: 1.3,
};

const scopeFactor: Record<ScopeType, number> = {
  REFORMA_INTEGRAL: 1,
  REFORMA_PARCIAL: 0.65,
  REHABILITACION: 1.1,
  ADECUACION: 0.8,
  OBRA_NUEVA: 1.35,
  REESTRUCTURACION: 1.45,
  CAMBIO_USO: 1.2,
};

const siteFactor: Record<SiteType, number> = {
  PISO: 1,
  LOCAL: 0.92,
  EDIFICIO: 1.35,
  VIVIENDA_UNIFAMILIAR: 1.08,
  OBRA_NUEVA: 1.45,
  CAMBIO_USO: 1.18,
  OFICINA: 0.9,
  NAVE: 1.1,
};

const accessFactor: Record<AccessLevel, number> = {
  FACIL: 1,
  NORMAL: 1.06,
  COMPLICADO: 1.15,
  MUY_COMPLICADO: 1.28,
};

const workTypeFactor: Record<WorkType, number> = {
  REFORMA_INTEGRAL_VIVIENDA: 1,
  REFORMA_COCINA_BANO: 0.65,
  REFORMA_PARCIAL: 0.55,
  ADECUACION_LOCAL: 0.8,
  COLIVING: 1.15,
  REHABILITACION_LIGERA: 0.45,
};

const siteLabel: Record<SiteType, string> = {
  PISO: 'Piso / vivienda',
  LOCAL: 'Local comercial',
  EDIFICIO: 'Edificio completo',
  VIVIENDA_UNIFAMILIAR: 'Vivienda unifamiliar',
  OBRA_NUEVA: 'Obra nueva',
  CAMBIO_USO: 'Cambio de uso',
  OFICINA: 'Oficina',
  NAVE: 'Nave / industrial',
};

const scopeLabel: Record<ScopeType, string> = {
  REFORMA_INTEGRAL: 'Reforma integral',
  REFORMA_PARCIAL: 'Reforma parcial',
  REHABILITACION: 'Rehabilitacion',
  ADECUACION: 'Adecuacion',
  OBRA_NUEVA: 'Obra nueva',
  REESTRUCTURACION: 'Reestructuracion',
  CAMBIO_USO: 'Cambio de uso',
};

const parseWorks = (works: string) => {
  const text = works.toLowerCase();
  return {
    demolition: /demolic|derribo|retirada/.test(text),
    installations: /electric|fontaner|clima|telecom/.test(text),
    plasterboard: /pladur|tabique|trasdos/.test(text),
    floor: /suelo|paviment|tarima|laminad/.test(text),
    paint: /pintur|repint/.test(text),
    kitchen: /cocin/.test(text),
    bath: /bano|baño/.test(text),
    joinery: /carpinter|puerta|armario/.test(text),
    tile: /alicat|azulej|revest/.test(text),
  };
};

const countUnits = (input: EstimateGenerationInput) => Math.max(1, input.units || 1);
const countFloors = (input: EstimateGenerationInput) => Math.max(1, input.floors || 1);

const computeBaseValue = (input: EstimateGenerationInput) => {
  const area = Math.max(0, input.area || 0);
  const type = workTypeFactor[input.workType] ?? 1;
  const finish = finishFactor[input.finishLevel] ?? 1;
  const scope = scopeFactor[input.scopeType] ?? 1;
  const site = siteFactor[input.siteType] ?? 1;
  const access = input.accessLevel ? accessFactor[input.accessLevel] : 1;

  const base = area * 420 * type * finish * scope * site * access;
  const unitBoost =
    (input.bathrooms || 0) * 2800 +
    (input.kitchens || 0) * 4200 +
    (input.rooms || 0) * 650;
  const structuralBoost = (input.structuralWorks ? area * 120 : 0) + ((input.floors || 0) > 1 ? (input.floors || 0) * 950 : 0);
  const multiUnitBoost = (input.units || 0) > 1 ? (input.units || 0) * 1800 : 0;
  return base + unitBoost + structuralBoost + multiUnitBoost;
};

const lines: LineTemplate[] = [
  {
    chapter: '01',
    description: 'Implantacion, protecciones generales y medios iniciales',
    unit: 'ud',
    quantity: (input) => (input.area > 120 ? 1.2 : 1),
    materialRate: 180,
    laborHoursPerUnit: 10,
    associatedRate: 120,
    commercialFactor: 1.22,
    kind: 'PROVISIONAL',
  },
  {
    chapter: '02',
    description: 'Demolicion y retirada de elementos existentes',
    unit: 'm2',
    quantity: (input) => input.area * (parseWorks(input.works).demolition ? 1 : 0.45) * countUnits(input),
    materialRate: 12,
    laborHoursPerUnit: 0.28,
    associatedRate: 24,
    commercialFactor: 1.25,
    includeWhen: (input) => parseWorks(input.works).demolition || input.workType !== 'REHABILITACION_LIGERA',
  },
  {
    chapter: '03',
    description: 'Albanileria, rozas, tapados y pequenos cerramientos',
    unit: 'm2',
    quantity: (input) => input.area * (parseWorks(input.works).plasterboard ? 0.35 : 0.18) * (input.siteType === 'EDIFICIO' ? countFloors(input) : 1),
    materialRate: 24,
    laborHoursPerUnit: 0.22,
    associatedRate: 10,
    commercialFactor: 1.24,
    includeWhen: (input) => parseWorks(input.works).plasterboard || input.workType !== 'REHABILITACION_LIGERA' || input.structuralWorks === true,
  },
  {
    chapter: '03',
    description: 'Refuerzo estructural, redistribucion y elementos portantes',
    unit: 'm2',
    quantity: (input) => input.area * (input.structuralWorks ? 0.28 : 0.08) * countFloors(input),
    materialRate: 48,
    laborHoursPerUnit: 0.3,
    associatedRate: 16,
    commercialFactor: 1.35,
    includeWhen: (input) => input.structuralWorks || input.scopeType === 'REESTRUCTURACION' || input.siteType === 'EDIFICIO',
  },
  {
    chapter: '04',
    description: 'Instalaciones electricas y fontaneria',
    unit: 'punto',
    quantity: (input) => {
      const basePoints = input.area * 0.7;
      const bathPoints = (input.bathrooms || 0) * 14;
      const kitchenPoints = (input.kitchens || 0) * 10;
      return basePoints + bathPoints + kitchenPoints + (parseWorks(input.works).installations ? input.area * 0.35 : 0);
    },
    materialRate: 48,
    laborHoursPerUnit: 0.33,
    associatedRate: 14,
    commercialFactor: 1.28,
    includeWhen: (input) => parseWorks(input.works).installations || input.workType !== 'REHABILITACION_LIGERA' || input.scopeType === 'OBRA_NUEVA',
  },
  {
    chapter: '04',
    description: 'Zonas comunes, accesos, portales y elementos compartidos',
    unit: 'm2',
    quantity: (input) => (input.siteType === 'EDIFICIO' ? input.area * 0.22 * countUnits(input) : 0),
    materialRate: 22,
    laborHoursPerUnit: 0.14,
    associatedRate: 9,
    commercialFactor: 1.24,
    includeWhen: (input) => input.siteType === 'EDIFICIO' || input.scopeType === 'REESTRUCTURACION',
  },
  {
    chapter: '05',
    description: 'Pavimento general y colocacion de acabados',
    unit: 'm2',
    quantity: (input) => input.area * (parseWorks(input.works).floor ? 0.92 : 0.72),
    materialRate: 26,
    laborHoursPerUnit: 0.18,
    associatedRate: 8,
    commercialFactor: 1.26,
  },
  {
    chapter: '05',
    description: 'Pintura de paramentos y techos',
    unit: 'm2',
    quantity: (input) => input.area * 2.8,
    materialRate: 7,
    laborHoursPerUnit: 0.07,
    associatedRate: 3,
    commercialFactor: 1.24,
    includeWhen: (input) => parseWorks(input.works).paint || input.workType !== 'REHABILITACION_LIGERA',
  },
  {
    chapter: '05',
    description: 'Alicatados y revestimientos',
    unit: 'm2',
    quantity: (input) => {
      const bathArea = (input.bathrooms || 0) * 16;
      const kitchenArea = (input.kitchens || 0) * 12;
      const userArea = parseWorks(input.works).tile ? input.area * 0.25 : 0;
      return bathArea + kitchenArea + userArea;
    },
    materialRate: 32,
    laborHoursPerUnit: 0.2,
    associatedRate: 9,
    commercialFactor: 1.28,
    includeWhen: (input) => parseWorks(input.works).tile || (input.bathrooms || 0) > 0 || (input.kitchens || 0) > 0,
  },
  {
    chapter: '05',
    description: 'Fachada, envolvente y cerramientos exteriores',
    unit: 'm2',
    quantity: (input) => (input.siteType === 'EDIFICIO' ? input.area * 0.35 * countFloors(input) : input.scopeType === 'REHABILITACION' ? input.area * 0.18 : 0),
    materialRate: 30,
    laborHoursPerUnit: 0.16,
    associatedRate: 12,
    commercialFactor: 1.3,
    includeWhen: (input) => input.siteType === 'EDIFICIO' || input.scopeType === 'REHABILITACION',
  },
  {
    chapter: '06',
    description: 'Carpinteria interior y remates de equipamiento',
    unit: 'ud',
    quantity: (input) => {
      const rooms = input.rooms || Math.max(2, Math.round(input.area / 22));
      return rooms + (input.bathrooms || 0) * 1.5 + (input.kitchens || 0) * 2;
    },
    materialRate: 260,
    laborHoursPerUnit: 1.1,
    associatedRate: 35,
    commercialFactor: 1.22,
    includeWhen: (input) => parseWorks(input.works).joinery || input.workType !== 'REHABILITACION_LIGERA' || input.scopeType === 'CAMBIO_USO',
  },
  {
    chapter: '06',
    description: 'Trabajos especiales por cambio de uso, oficina o local tecnico',
    unit: 'ud',
    quantity: (input) => {
      const siteBoost = input.siteType === 'CAMBIO_USO' ? 4 : input.siteType === 'LOCAL' ? 3 : input.siteType === 'OFICINA' ? 2 : 0;
      return siteBoost + (input.structuralWorks ? 2 : 0);
    },
    materialRate: 320,
    laborHoursPerUnit: 2.4,
    associatedRate: 48,
    commercialFactor: 1.34,
    includeWhen: (input) => input.siteType === 'CAMBIO_USO' || input.siteType === 'LOCAL' || input.scopeType === 'CAMBIO_USO' || input.structuralWorks === true,
  },
  {
    chapter: '07',
    description: 'Retirada de residuos, contenedor y gestion medioambiental',
    unit: 'm3',
    quantity: (input) => Math.max(2, input.area * (parseWorks(input.works).demolition ? 0.09 : 0.04) * countUnits(input)),
    materialRate: 18,
    laborHoursPerUnit: 0.08,
    associatedRate: 42,
    commercialFactor: 1.3,
    kind: 'ASSOCIATED',
  },
  {
    chapter: '07',
    description: 'Limpieza final, protecciones y entrega de obra',
    unit: 'ud',
    quantity: () => 1,
    materialRate: 55,
    laborHoursPerUnit: 6,
    associatedRate: 18,
    commercialFactor: 1.2,
    kind: 'ASSOCIATED',
  },
];

const chapterTitle = (code: string) => {
  const found = CHAPTERS.find((chapter) => chapter.code === code);
  return found ? `${found.code} ${found.name}` : `${code} GENERAL`;
};

export function generateEstimateProposal(input: EstimateGenerationInput): GeneratedEstimateProposal {
  const parsed = parseWorks(input.works);
  const baseValue = computeBaseValue(input);
  const complexity = input.conditions?.toLowerCase().includes('complic')
    ? 1.15
    : input.conditions?.toLowerCase().includes('acceso')
      ? 1.1
      : 1;
  const access = input.accessLevel ? accessFactor[input.accessLevel] : 1;
  const site = siteFactor[input.siteType] ?? 1;
  const scope = scopeFactor[input.scopeType] ?? 1;
  const notes: string[] = [
    `Contexto: ${siteLabel[input.siteType]} / ${scopeLabel[input.scopeType]}`,
  ];

  if (input.conditions) {
    notes.push(`Condicionantes detectados: ${input.conditions}`);
  }

  if (input.siteType === 'EDIFICIO' && !(input.units && input.units > 1)) {
    notes.push('Para edificios o reestructuracion conviene indicar numero de viviendas/unidades para ajustar la estimacion.');
  }

  const generatedLines = lines
    .filter((line) => (line.includeWhen ? line.includeWhen(input) : true))
    .map((line) => {
      const quantity = Math.max(0.1, Number(line.quantity(input).toFixed(2)));
      const finishMultiplier = finishFactor[input.finishLevel] ?? 1;
      const laborHours = Number((quantity * line.laborHoursPerUnit * finishMultiplier * complexity).toFixed(2));
      const laborCost = Number((laborHours * 28 * (input.siteType === 'OBRA_NUEVA' ? 1.08 : 1)).toFixed(2));
      const materialCost = Number((quantity * line.materialRate * finishMultiplier * (1 + (parsed.demolition ? 0.05 : 0))).toFixed(2));
      const associatedCost = Number((quantity * line.associatedRate * complexity * site * (input.hasElevator ? 0.95 : 1)).toFixed(2));
      const internalCost = Number((materialCost + laborCost + associatedCost).toFixed(2));
      const commercialPrice = Number((internalCost * line.commercialFactor * access * (site > 1.2 ? 1.03 : 1) * (scope > 1.2 ? 1.04 : 1)).toFixed(2));

      return {
        chapter: chapterTitle(line.chapter),
        description: line.description,
        unit: line.unit,
        quantity,
        commercialPrice,
        internalCost,
        laborHours,
        laborCost,
        materialCost,
        associatedCost,
        kind: line.kind || 'DIRECT',
      };
    });

  const materialCost = generatedLines.reduce((sum, line) => sum + line.materialCost, 0);
  const laborCost = generatedLines.reduce((sum, line) => sum + line.laborCost, 0);
  const associatedCost = generatedLines.reduce((sum, line) => sum + line.associatedCost, 0);
  const internalCost = Number((materialCost + laborCost + associatedCost).toFixed(2));
  const contingency = Number((internalCost * 0.06 * complexity * access).toFixed(2));
  const structureOverhead = Number((internalCost * 0.08 * site).toFixed(2));
  const marginAmount = Number((internalCost * 0.18).toFixed(2));
  const commercialSubtotal = Number((internalCost + contingency + structureOverhead + marginAmount).toFixed(2));
  const vatAmount = Number((commercialSubtotal * 0.21).toFixed(2));
  const commercialTotal = Number((commercialSubtotal + vatAmount).toFixed(2));
  const chapters = Array.from(new Set(generatedLines.map((line) => line.chapter)));

  if (baseValue > commercialSubtotal * 1.2) {
    notes.push('El presupuesto resultante esta por debajo del valor base estimado de la obra; revisa ratios y alcance.');
  }

  return {
    chapters,
    lines: generatedLines,
    summary: {
      materialCost: Number(materialCost.toFixed(2)),
      laborCost: Number(laborCost.toFixed(2)),
      associatedCost: Number(associatedCost.toFixed(2)),
      internalCost,
      marginAmount,
      commercialSubtotal,
      vatAmount,
      commercialTotal,
    },
    notes,
  };
}

