import type {
  AccessLevel,
  FinishLevel,
  ScopeType,
  SiteType,
  WorkType,
} from '@/lib/automation/types';

export type DiscoverySessionStatus =
  | 'DRAFT'
  | 'READY_TO_GENERATE'
  | 'PROPOSAL_GENERATED'
  | 'ARCHIVED';

export type CertaintyLevel =
  | 'CONFIRMADO'
  | 'ESTIMADO'
  | 'SUPUESTO'
  | 'PENDIENTE';

export type BudgetGoal =
  | 'ORIENTATIVO'
  | 'COMERCIAL'
  | 'VIABILIDAD_INTERNA'
  | 'INVERSOR'
  | 'TECNICO_AFINADO';

export type PrecisionMode = 'RAPIDO' | 'MEDIO' | 'AFINADO';

export type InclusionMode =
  | 'INCLUIDO'
  | 'EXCLUIDO'
  | 'CLIENTE'
  | 'TERCERO'
  | 'PENDIENTE';

export type DiscoveryInterventionType =
  | 'OBRA_NUEVA'
  | 'REFORMA'
  | 'REHABILITACION'
  | 'ADECUACION'
  | 'REDISTRIBUCION'
  | 'REPARACION'
  | 'AMPLIACION';

export type DiscoveryAssetType =
  | 'PISO'
  | 'CASA'
  | 'EDIFICIO'
  | 'LOCAL'
  | 'OFICINA'
  | 'NAVE'
  | 'HOTEL'
  | 'COLIVING'
  | 'EXTERIOR';

export type DiscoveryGlobalScope =
  | 'TOTAL'
  | 'PARCIAL'
  | 'ZONAS_CONCRETAS'
  | 'SOLO_INSTALACIONES'
  | 'SOLO_ACABADOS';

export type OccupancyState =
  | 'OCUPADO'
  | 'VACIO'
  | 'PARCIALMENTE_OCUPADO'
  | 'NO_LO_SE';

export type DiscoveryAccessLevel = AccessLevel | 'NO_LO_SE';

export type WorkCode =
  | 'DEMOLICION'
  | 'REDISTRIBUCION_INTERIOR'
  | 'ALBANILERIA'
  | 'PLADUR'
  | 'ELECTRICIDAD'
  | 'FONTANERIA'
  | 'SANEAMIENTO'
  | 'CLIMATIZACION'
  | 'CARPINTERIA_INTERIOR'
  | 'CARPINTERIA_EXTERIOR'
  | 'REVESTIMIENTOS'
  | 'PINTURA'
  | 'COCINA'
  | 'BANOS'
  | 'ESTRUCTURA'
  | 'FACHADA'
  | 'CUBIERTA'
  | 'EXTERIOR_URBANIZACION'
  | 'ILUMINACION'
  | 'FALSO_TECHO'
  | 'VENTILACION'
  | 'IMPERMEABILIZACION'
  | 'AISLAMIENTO'
  | 'LIMPIEZA_FINAL'
  | 'MEDIOS_AUXILIARES';

export type AreaType =
  | 'ENTRADA'
  | 'SALON'
  | 'COMEDOR'
  | 'COCINA'
  | 'BANO'
  | 'HABITACION'
  | 'PASILLO'
  | 'TERRAZA'
  | 'LAVADERO'
  | 'SALA_PRINCIPAL'
  | 'ASEO'
  | 'ALMACEN'
  | 'OFFICE'
  | 'ESCAPARATE'
  | 'TRASTIENDA'
  | 'PORTAL'
  | 'ESCALERA'
  | 'CUBIERTA'
  | 'FACHADA'
  | 'PATIO'
  | 'ZONA_COMUN'
  | 'VIVIENDA'
  | 'EXTERIOR';

export type AreaActionCode =
  | 'DEMOLER'
  | 'RETIRAR_ELEMENTOS'
  | 'TIRAR_TABIQUES'
  | 'LEVANTAR_TABIQUES'
  | 'RENOVAR_INSTALACION_ELECTRICA'
  | 'RENOVAR_INSTALACION_FONTANERIA'
  | 'RENOVAR_INSTALACION_SANEAMIENTO'
  | 'RENOVAR_CLIMATIZACION'
  | 'COLOCAR_SUELO'
  | 'ALICATAR'
  | 'PINTAR'
  | 'CAMBIAR_PUERTAS'
  | 'CAMBIAR_VENTANAS'
  | 'MONTAR_FALSO_TECHO'
  | 'RENOVAR_ILUMINACION'
  | 'MONTAR_COCINA'
  | 'MONTAR_MOBILIARIO'
  | 'RENOVAR_BANO'
  | 'COLOCAR_SANITARIOS'
  | 'CARPINTERIA_A_MEDIDA'
  | 'ACTUAR_FACHADA'
  | 'ACTUAR_CUBIERTA'
  | 'ACTUAR_ESTRUCTURA'
  | 'IMPERMEABILIZAR'
  | 'AISLAR'
  | 'URBANIZAR_EXTERIOR';

export type DiscoverySubtypeCode =
  | 'REFORMA_INTEGRAL'
  | 'REFORMA_PARCIAL'
  | 'REDISTRIBUCION_INTERIOR'
  | 'INTERVENCION_ESTRUCTURAL'
  | 'INSTALACIONES_COMPLETAS'
  | 'INSTALACIONES_PARCIALES'
  | 'COCINA_RENOVACION'
  | 'BANO_RENOVACION'
  | 'CAMBIO_USO'
  | 'FACHADA'
  | 'CUBIERTA'
  | 'ZONAS_COMUNES'
  | 'EXTERIOR'
  | 'MULTIUNIDAD'
  | 'LOCAL_COMERCIAL'
  | 'VIVIENDA_TURISTICA'
  | 'COLIVING'
  | 'OBRA_NUEVA_RESIDENCIAL'
  | 'REHABILITACION_EDIFICIO'
  | 'MEJORA_ACABADOS'
  | 'ACCESIBILIDAD'
  | 'EFICIENCIA_ENERGETICA';

export type InclusionFamily =
  | 'COCINA'
  | 'SANITARIOS'
  | 'CARPINTERIA_INTERIOR'
  | 'VENTANAS'
  | 'CLIMATIZACION'
  | 'ILUMINACION'
  | 'MOBILIARIO'
  | 'ACABADOS_ESPECIALES';

export type QuantityHint = {
  unit: 'M2' | 'ML' | 'UD' | 'LOTE';
  value?: number | null;
  certainty: CertaintyLevel;
};

export type DiscoveryArea = {
  areaId: string;
  areaType: AreaType;
  label: string;
  index?: number | null;
  selected: boolean;
  approxSizeM2?: number | null;
  currentState?: {
    summary?: string | null;
    exists?: boolean | null;
    certainty: CertaintyLevel;
  };
  targetState?: {
    summary?: string | null;
    exists?: boolean | null;
    certainty: CertaintyLevel;
  };
  certainty: CertaintyLevel;
};

export type DiscoveryAreaAction = {
  actionCode: AreaActionCode;
  coverage?: 'PARCIAL' | 'TOTAL' | 'PENDIENTE';
  replaceMode?: 'CONSERVAR' | 'SUSTITUIR' | 'MEZCLA' | 'USA_CRITERIO' | 'PENDIENTE';
  quantityHint?: QuantityHint | null;
  notes?: string | null;
  certainty: CertaintyLevel;
};

export type DiscoveryAreaActions = {
  areaId: string;
  actions: DiscoveryAreaAction[];
};

export type DiscoveryAssumption = {
  code: string;
  scope:
    | 'CLASSIFICATION'
    | 'CONTEXT'
    | 'CURRENT_TARGET'
    | 'AREAS'
    | 'ACTIONS'
    | 'FINISHES'
    | 'CONSTRAINTS'
    | 'INCLUSIONS'
    | 'DERIVED_INPUT';
  message: string;
  certaintyImpact: 'LOW' | 'MEDIUM' | 'HIGH';
};

export type DiscoveryWarning = {
  code: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  relatedTo?:
    | 'CLASSIFICATION'
    | 'CONTEXT'
    | 'CURRENT_TARGET'
    | 'AREAS'
    | 'ACTIONS'
    | 'FINISHES'
    | 'CONSTRAINTS'
    | 'INCLUSIONS'
    | 'DERIVED_INPUT';
};

export type ComplexityProfile = {
  riskLevel: 'BAJA' | 'MEDIA' | 'MEDIA_ALTA' | 'ALTA';
  drivers: string[];
  costSensitivity: 'BAJA' | 'MEDIA' | 'ALTA';
  scheduleSensitivity: 'BAJA' | 'MEDIA' | 'ALTA';
  procurementSensitivity: 'BAJA' | 'MEDIA' | 'ALTA';
};

export type DiscoverySummary = {
  headline: {
    workTypeLabel: string;
    assetLabel: string;
    sizeLabel: string;
  };
  confirmed: string[];
  estimated: string[];
  assumed: string[];
  pending: string[];
  includedByUs: string[];
  excludedOrExternal: string[];
  nextRiskPoints: string[];
};

export type DiscoverySessionData = {
  classification: {
    freeTextBrief?: string;
    interventionType: DiscoveryInterventionType;
    assetType: DiscoveryAssetType;
    globalScope: DiscoveryGlobalScope;
    certainty: CertaintyLevel;
  };
  assetContext: {
    areaM2?: number | null;
    magnitudeLabel?: string | null;
    floors?: number | null;
    floorNumber?: number | null;
    roomsCurrent?: number | null;
    bathroomsCurrent?: number | null;
    kitchensCurrent?: number | null;
    unitsCurrent?: number | null;
    hasElevator?: boolean | null;
    occupancyState?: OccupancyState;
    accessLevel?: DiscoveryAccessLevel;
    certainty: Partial<Record<string, CertaintyLevel>>;
  };
  currentVsTarget: {
    rooms?: { current?: number | null; target?: number | null; certainty: CertaintyLevel };
    bathrooms?: { current?: number | null; target?: number | null; certainty: CertaintyLevel };
    kitchens?: { current?: number | null; target?: number | null; certainty: CertaintyLevel };
    kitchenStateChange?: { current?: string | null; target?: string | null; certainty: CertaintyLevel };
    redistribution?: { value?: boolean | null; certainty: CertaintyLevel };
    structureAffected?: { value?: boolean | null; certainty: CertaintyLevel };
    changeOfUse?: { value?: boolean | null; certainty: CertaintyLevel };
    installationReplacement?: {
      electricity?: 'NINGUNA' | 'PARCIAL' | 'COMPLETA' | 'PENDIENTE';
      plumbing?: 'NINGUNA' | 'PARCIAL' | 'COMPLETA' | 'PENDIENTE';
      hvac?: 'NINGUNA' | 'PARCIAL' | 'COMPLETA' | 'PENDIENTE';
      certainty: CertaintyLevel;
    };
  };
  macroScope: {
    workCodes: WorkCode[];
    certainty: CertaintyLevel;
  };
  areas: DiscoveryArea[];
  actionsByArea: DiscoveryAreaActions[];
  interventionProfile: {
    globalIntensity:
      | 'SUPERFICIAL'
      | 'PARCIAL'
      | 'MEDIA'
      | 'INTEGRAL'
      | 'INTEGRAL_CON_REDISTRIBUCION'
      | 'INTEGRAL_TECNICA';
    certainty: CertaintyLevel;
  };
  finishProfile: {
    globalLevel: FinishLevel;
    tradeOverrides?: Partial<Record<'SUELO' | 'CARPINTERIA' | 'SANITARIOS' | 'COCINA' | 'MECANISMOS' | 'CLIMATIZACION', string>>;
    certainty: CertaintyLevel;
  };
  executionConstraints: {
    occupied?: boolean | null;
    communityRestrictions?: boolean | null;
    timeRestrictions?: boolean | null;
    worksInPhases?: boolean | null;
    urgent?: boolean | null;
    licensePending?: boolean | null;
    logisticsDifficulty?: 'BAJA' | 'MEDIA' | 'ALTA' | 'MUY_ALTA' | 'PENDIENTE';
    specialProtections?: boolean | null;
    partialInstallationsReuse?: boolean | null;
    notes?: string;
    certainty: Partial<Record<string, CertaintyLevel>>;
  };
  inclusions: Record<InclusionFamily, InclusionMode>;
  certainty: {
    byBlock: {
      classification: CertaintyLevel;
      assetContext: CertaintyLevel;
      currentVsTarget: CertaintyLevel;
      macroScope: CertaintyLevel;
      areas: CertaintyLevel;
      actions: CertaintyLevel;
      finishes: CertaintyLevel;
      constraints: CertaintyLevel;
      inclusions: CertaintyLevel;
    };
    unknowns: string[];
    useSystemCriteria: boolean;
  };
  discoveryProfile: {
    workType: WorkType;
    subtypes: DiscoverySubtypeCode[];
    complexityProfile: ComplexityProfile;
  };
};

export type DerivedInput = {
  discoverySchemaVersion: number;
  derivedInputVersion: number;
  summaryVersion: number;
  workType: WorkType;
  siteType: SiteType;
  scopeType: ScopeType;
  finishLevel: FinishLevel;
  accessLevel: AccessLevel;
  conditions: string;
  area: number;
  bathrooms: number;
  kitchens: number;
  rooms: number;
  units: number;
  floors: number;
  hasElevator: boolean | null;
  structuralWorks: boolean;
  works: WorkCode[];
  worksText: string;
  areas: {
    areaId: string;
    areaType: AreaType;
    label: string;
    index?: number | null;
    approxSizeM2?: number | null;
    currentState?: string | null;
    targetState?: string | null;
    certainty: CertaintyLevel;
  }[];
  actionsByArea: DiscoveryAreaActions[];
  discoveryProfile: {
    workType: WorkType;
    subtypes: DiscoverySubtypeCode[];
    complexityProfile: ComplexityProfile;
  };
  precisionMode: PrecisionMode;
  budgetGoal: BudgetGoal;
  inclusions: Record<InclusionFamily, InclusionMode>;
  currentVsTarget: DiscoverySessionData['currentVsTarget'];
  executionConstraints: DiscoverySessionData['executionConstraints'];
  certainty: {
    byBlock: DiscoverySessionData['certainty']['byBlock'];
    confidenceLevel: 'BAJA' | 'MEDIA' | 'ALTA';
  };
  assumptions: DiscoveryAssumption[];
  warnings: DiscoveryWarning[];
};

export type DiscoveryQuestionStep = {
  key:
    | 'clasificacion'
    | 'contexto'
    | 'estado-objetivo'
    | 'alcance-areas'
    | 'acciones-acabados'
    | 'condicionantes-resumen';
  title: string;
  description: string;
};
