import { AccessLevel, ScopeType, SiteType, WorkType } from './estimate-generator';

export interface PlanningGenerationInput {
  name: string;
  description?: string | null;
  projectType?: string | null;
  siteType: SiteType;
  scopeType: ScopeType;
  workType: WorkType;
  area: number;
  works: string;
  accessLevel?: AccessLevel;
  bathrooms?: number;
  kitchens?: number;
  rooms?: number;
  units?: number;
  floors?: number;
  structuralWorks?: boolean;
  hasElevator?: boolean;
}

export interface PlanningLocationNode {
  key: string;
  name: string;
  type: string;
  parentKey?: string | null;
  code?: string | null;
  description?: string | null;
}

export interface PlanningWBSNode {
  key: string;
  name: string;
  level: string;
  parentKey?: string | null;
  code?: string | null;
  description?: string | null;
}

export interface PlanningActivityNode {
  key: string;
  name: string;
  code: string;
  wbsKey: string;
  locationKey?: string | null;
  durationDays: number;
  responsible?: string | null;
  notes?: string | null;
}

export interface PlanningDependencyNode {
  predecessorKey: string;
  successorKey: string;
  type?: 'FS' | 'SS' | 'FF' | 'SF';
  lagDays?: number;
}

export interface PlanningBlueprint {
  locationNodes: PlanningLocationNode[];
  wbsNodes: PlanningWBSNode[];
  activityNodes: PlanningActivityNode[];
  dependencyNodes: PlanningDependencyNode[];
  notes: string[];
}

const parseText = (value?: string | null) => (value || '').toLowerCase();

const siteLabel: Record<SiteType, string> = {
  PISO: 'Piso / vivienda',
  LOCAL: 'Local comercial',
  EDIFICIO: 'Edificio',
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

function inferName(context: PlanningGenerationInput) {
  return `${siteLabel[context.siteType]} - ${scopeLabel[context.scopeType]}`;
}

function estimateDuration(base: number, factor: number, floorFactor = 1) {
  return Math.max(1, Math.round(base * factor * floorFactor * 10) / 10);
}

function buildLocations(context: PlanningGenerationInput): PlanningLocationNode[] {
  const locations: PlanningLocationNode[] = [
    {
      key: 'site-root',
      name: inferName(context),
      type: context.siteType,
      code: 'SITE',
    },
  ];

  const unitCount = Math.max(1, context.units || 1);
  const floorCount = Math.max(1, context.floors || 1);

  if (context.siteType === 'PISO' || context.siteType === 'VIVIENDA_UNIFAMILIAR') {
    locations.push({ key: 'living', name: 'Salon / zona dia', type: 'SALON', parentKey: 'site-root', code: 'LIV' });
    locations.push({ key: 'kitchen', name: 'Cocina', type: 'COCINA', parentKey: 'site-root', code: 'KIT' });
    for (let i = 1; i <= Math.max(1, context.bathrooms || 1); i += 1) {
      locations.push({ key: `bath-${i}`, name: `Bano ${i}`, type: 'BANO', parentKey: 'site-root', code: `B${i}` });
    }
    for (let i = 1; i <= Math.max(1, context.rooms || 3); i += 1) {
      locations.push({ key: `room-${i}`, name: `Habitacion ${i}`, type: 'HABITACION', parentKey: 'site-root', code: `R${i}` });
    }
  } else if (context.siteType === 'LOCAL' || context.siteType === 'OFICINA') {
    locations.push({ key: 'main-zone', name: 'Zona principal', type: 'ZONA_COMUN', parentKey: 'site-root', code: 'ZP' });
    locations.push({ key: 'service-zone', name: 'Aseo / servicios', type: 'BANO', parentKey: 'site-root', code: 'SRV' });
    locations.push({ key: 'access-zone', name: 'Accesos y escaparate', type: 'EXTERIOR', parentKey: 'site-root', code: 'ACC' });
  } else if (context.siteType === 'EDIFICIO') {
    for (let i = 1; i <= floorCount; i += 1) {
      locations.push({ key: `floor-${i}`, name: `Planta ${i}`, type: 'PLANTA', parentKey: 'site-root', code: `P${i}` });
    }
    locations.push({ key: 'common-areas', name: 'Zonas comunes', type: 'ZONA_COMUN', parentKey: 'site-root', code: 'COM' });
    for (let i = 1; i <= unitCount; i += 1) {
      locations.push({ key: `unit-${i}`, name: `Vivienda ${i}`, type: 'VIVIENDA', parentKey: 'site-root', code: `V${i}` });
    }
  } else {
    locations.push({ key: 'main-zone', name: 'Zona principal', type: 'ZONA_COMUN', parentKey: 'site-root', code: 'MAIN' });
    locations.push({ key: 'service-zone', name: 'Servicios y auxiliares', type: 'LOCAL_TECNICO', parentKey: 'site-root', code: 'AUX' });
  }

  return locations;
}

function buildWbs(context: PlanningGenerationInput): PlanningWBSNode[] {
  const nodes: PlanningWBSNode[] = [
    { key: 'wbs-01', name: 'Preliminares', level: 'CAPITULO', code: '01' },
    { key: 'wbs-02', name: 'Demoliciones', level: 'CAPITULO', code: '02' },
    { key: 'wbs-03', name: 'Albanileria y estructura', level: 'CAPITULO', code: '03' },
    { key: 'wbs-04', name: 'Instalaciones', level: 'CAPITULO', code: '04' },
    { key: 'wbs-05', name: 'Acabados', level: 'CAPITULO', code: '05' },
    { key: 'wbs-06', name: 'Carpinterias y especiales', level: 'CAPITULO', code: '06' },
    { key: 'wbs-07', name: 'Cierre y entrega', level: 'CAPITULO', code: '07' },
  ];

  if (context.siteType === 'EDIFICIO' || context.scopeType === 'REESTRUCTURACION') {
    nodes.push({ key: 'wbs-08', name: 'Zonas comunes y envolvente', level: 'CAPITULO', code: '08' });
  }

  if (context.scopeType === 'OBRA_NUEVA') {
    nodes.push({ key: 'wbs-09', name: 'Estructura y obra nueva', level: 'CAPITULO', code: '09' });
  }

  return nodes;
}

function buildActivities(context: PlanningGenerationInput): PlanningActivityNode[] {
  const area = Math.max(0, context.area || 0);
  const units = Math.max(1, context.units || 1);
  const floors = Math.max(1, context.floors || 1);
  const access = context.accessLevel === 'MUY_COMPLICADO' ? 1.28 : context.accessLevel === 'COMPLICADO' ? 1.15 : context.accessLevel === 'NORMAL' ? 1.05 : 1;
  const structural = context.structuralWorks ? 1.2 : 1;
  const siteMultiplier = context.siteType === 'EDIFICIO' ? 1.25 : context.siteType === 'OBRA_NUEVA' ? 1.35 : context.siteType === 'LOCAL' ? 0.95 : 1;
  const finishMultiplier = context.workType === 'REHABILITACION_LIGERA' ? 0.82 : context.workType === 'REFORMA_PARCIAL' ? 0.72 : context.workType === 'REFORMA_COCINA_BANO' ? 0.55 : 1;

  const demolition = /demolic|derribo|retirada/.test(parseText(context.works));
  const installs = /electric|fontaner|clima|telecom/.test(parseText(context.works));
  const paint = /pintur|repint/.test(parseText(context.works));
  const floor = /suelo|paviment|tarima|laminad/.test(parseText(context.works));
  const tile = /alicat|azulej|revest/.test(parseText(context.works));
  const pladur = /pladur|tabique|trasdos/.test(parseText(context.works));
  const changeUse = context.siteType === 'CAMBIO_USO' || context.scopeType === 'CAMBIO_USO';

  const activities: PlanningActivityNode[] = [
    { key: 'act-01', name: 'Implantacion y protecciones', code: 'A01', wbsKey: 'wbs-01', locationKey: 'site-root', durationDays: estimateDuration(1.2, siteMultiplier * access), responsible: 'Jefe de obra' },
  ];

  if (demolition || context.scopeType !== 'ADECUACION' || context.siteType === 'OBRA_NUEVA') {
    activities.push({ key: 'act-02', name: 'Demoliciones y retirada', code: 'A02', wbsKey: 'wbs-02', locationKey: 'site-root', durationDays: estimateDuration(area / 28, siteMultiplier * access), responsible: 'Produccion' });
  }

  if (context.structuralWorks || context.scopeType === 'REESTRUCTURACION' || context.siteType === 'EDIFICIO' || context.siteType === 'OBRA_NUEVA') {
    activities.push({ key: 'act-03', name: 'Estructura y redistribucion principal', code: 'A03', wbsKey: context.siteType === 'OBRA_NUEVA' ? 'wbs-09' : 'wbs-03', locationKey: context.siteType === 'EDIFICIO' ? 'site-root' : 'site-root', durationDays: estimateDuration(area / 35, siteMultiplier * structural), responsible: 'Tecnico / Estructuras' });
  } else if (pladur || context.scopeType === 'REFORMA_INTEGRAL') {
    activities.push({ key: 'act-03', name: 'Albanileria, pladur y cerramientos', code: 'A03', wbsKey: 'wbs-03', locationKey: 'site-root', durationDays: estimateDuration(area / 30, siteMultiplier * finishMultiplier), responsible: 'Albanileria' });
  }

  if (installs || context.scopeType === 'OBRA_NUEVA' || changeUse) {
    activities.push({ key: 'act-04', name: 'Instalaciones electricas y fontaneria', code: 'A04', wbsKey: 'wbs-04', locationKey: 'site-root', durationDays: estimateDuration(area / 22 + units * 0.8, siteMultiplier * access), responsible: 'Instalaciones' });
  }

  if (context.siteType === 'EDIFICIO') {
    activities.push({ key: 'act-04b', name: 'Zonas comunes y envolvente', code: 'A04B', wbsKey: 'wbs-08', locationKey: 'common-areas', durationDays: estimateDuration((area * floors) / 45, siteMultiplier * 1.08), responsible: 'Produccion' });
  }

  if (tile || floor || paint || context.scopeType === 'REFORMA_INTEGRAL' || context.scopeType === 'REHABILITACION') {
    activities.push({ key: 'act-05', name: 'Revestimientos y acabados', code: 'A05', wbsKey: 'wbs-05', locationKey: 'site-root', durationDays: estimateDuration(area / 20, siteMultiplier * finishMultiplier), responsible: 'Acabados' });
  }

  if (context.siteType === 'PISO' || context.siteType === 'VIVIENDA_UNIFAMILIAR') {
    activities.push({ key: 'act-05b', name: 'Trabajos por estancias', code: 'A05B', wbsKey: 'wbs-05', locationKey: 'room-1', durationDays: estimateDuration((context.bathrooms || 1) * 1.2 + (context.kitchens || 1) * 1.5, finishMultiplier), responsible: 'Acabados' });
  }

  activities.push({ key: 'act-06', name: 'Carpinterias, equipamiento y remates', code: 'A06', wbsKey: 'wbs-06', locationKey: context.siteType === 'LOCAL' ? 'main-zone' : 'site-root', durationDays: estimateDuration((context.rooms || Math.max(2, Math.round(area / 22))) * 0.9 + (context.bathrooms || 0) * 0.5 + (context.kitchens || 0) * 0.7, finishMultiplier), responsible: 'Carpinteria' });

  if (changeUse || context.siteType === 'LOCAL' || context.siteType === 'OFICINA' || context.siteType === 'NAVE') {
    activities.push({ key: 'act-06b', name: 'Adecuacion funcional y legalizaciones previas', code: 'A06B', wbsKey: 'wbs-06', locationKey: 'site-root', durationDays: estimateDuration(2.5, siteMultiplier * access), responsible: 'Tecnico / Gestion' });
  }

  activities.push({ key: 'act-07', name: 'Limpieza final y entrega', code: 'A07', wbsKey: 'wbs-07', locationKey: 'site-root', durationDays: estimateDuration(1, 1), responsible: 'Jefe de obra' });

  return activities;
}

function buildDependencies(activities: PlanningActivityNode[]): PlanningDependencyNode[] {
  const ordered = activities.map((activity) => activity.key);
  const deps: PlanningDependencyNode[] = [];
  for (let i = 0; i < ordered.length - 1; i += 1) {
    deps.push({ predecessorKey: ordered[i], successorKey: ordered[i + 1], type: 'FS', lagDays: 0 });
  }
  return deps;
}

export function generatePlanningBlueprint(context: PlanningGenerationInput): PlanningBlueprint {
  const locationNodes = buildLocations(context);
  const wbsNodes = buildWbs(context);
  const activityNodes = buildActivities(context);
  const dependencyNodes = buildDependencies(activityNodes);

  return {
    locationNodes,
    wbsNodes,
    activityNodes,
    dependencyNodes,
    notes: [
      `Contexto de planning: ${siteLabel[context.siteType]} / ${scopeLabel[context.scopeType]}`,
      'La secuencia se ha generado de forma automatica y queda lista para ajuste manual.',
    ],
  };
}

