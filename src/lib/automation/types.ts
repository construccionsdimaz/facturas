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

export interface AutomationContext {
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
