import type {
  AccessLevel,
  FinishLevel,
  ScopeType,
  SiteType,
  WorkType,
} from '@/lib/automation/types';
import type { TechnicalSpecModel } from './technical-spec-types';
import type { ResolvedTechnicalSpecSummary } from './technical-spec-types';
import type { MeasurementResult } from '@/lib/estimate/measurement-types';

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

export type ModelingStrategy = 'SIMPLE_AREA_BASED' | 'STRUCTURED_REPETITIVE';

export type QuantityHint = {
  unit: 'M2' | 'ML' | 'UD' | 'LOTE';
  value?: number | null;
  certainty: CertaintyLevel;
};

export type FloorType =
  | 'SOTANO'
  | 'SEMISOTANO'
  | 'BAJA'
  | 'ENTREPLANTA'
  | 'PLANTA_TIPO'
  | 'ATICO'
  | 'CUBIERTA'
  | 'TECNICA'
  | 'EXTERIOR'
  | 'OTRA';

export type UnitKind =
  | 'VIVIENDA'
  | 'HABITACION'
  | 'ESTUDIO'
  | 'APARTAMENTO'
  | 'SUITE'
  | 'LOCAL'
  | 'OFICINA'
  | 'NAVE'
  | 'ZONA_COMUN'
  | 'MODULO_OTRO';

export type SpaceKind =
  | 'UNIDAD_PRINCIPAL'
  | 'ESTANCIA'
  | 'ESPACIO_COMUN'
  | 'NUCLEO_VERTICAL'
  | 'ENVOLVENTE'
  | 'EXTERIOR';

export type SubspaceKind =
  | 'BANO_ASOCIADO'
  | 'ASEO_ASOCIADO'
  | 'KITCHENETTE'
  | 'COCINA_ASOCIADA'
  | 'VESTIDOR'
  | 'LAVADERO'
  | 'BALCON'
  | 'TERRAZA'
  | 'INSTALACION_TECNICA'
  | 'ALMACEN_ASOCIADO';

export type InterventionMode =
  | 'NUEVO'
  | 'SUSTITUCION'
  | 'CONSERVACION'
  | 'PARCIAL'
  | 'COMPLETO';

export type ScopeMergeMode = 'INHERIT' | 'REPLACE' | 'EXTEND';

export type SystemCode =
  | 'DEMOLICION'
  | 'REDISTRIBUCION'
  | 'ALBANILERIA'
  | 'PLADUR'
  | 'ELECTRICIDAD'
  | 'FONTANERIA'
  | 'SANEAMIENTO'
  | 'CLIMATIZACION'
  | 'VENTILACION'
  | 'ILUMINACION'
  | 'CARPINTERIA_INTERIOR'
  | 'CARPINTERIA_EXTERIOR'
  | 'REVESTIMIENTOS'
  | 'PINTURA'
  | 'FALSO_TECHO'
  | 'COCINA'
  | 'BANOS'
  | 'ESTRUCTURA'
  | 'FACHADA'
  | 'CUBIERTA'
  | 'IMPERMEABILIZACION'
  | 'AISLAMIENTO'
  | 'EXTERIOR_URBANIZACION';

export type TechnicalActionCode =
  | 'DEMOLER'
  | 'RETIRAR_ELEMENTOS'
  | 'TIRAR_TABIQUES'
  | 'LEVANTAR_TABIQUES'
  | 'RENOVAR_INSTALACION_ELECTRICA'
  | 'RENOVAR_INSTALACION_FONTANERIA'
  | 'RENOVAR_INSTALACION_SANEAMIENTO'
  | 'RENOVAR_CLIMATIZACION'
  | 'RENOVAR_VENTILACION'
  | 'RENOVAR_ILUMINACION'
  | 'COLOCAR_SUELO'
  | 'ALICATAR'
  | 'PINTAR'
  | 'CAMBIAR_PUERTAS'
  | 'CAMBIAR_VENTANAS'
  | 'MONTAR_FALSO_TECHO'
  | 'MONTAR_COCINA'
  | 'MONTAR_MOBILIARIO'
  | 'RENOVAR_BANO'
  | 'COLOCAR_SANITARIOS'
  | 'CARPINTERIA_A_MEDIDA'
  | 'ACTUAR_ESTRUCTURA'
  | 'ACTUAR_FACHADA'
  | 'ACTUAR_CUBIERTA'
  | 'IMPERMEABILIZAR'
  | 'AISLAR'
  | 'URBANIZAR_EXTERIOR';

export type SpaceCountingFlags = {
  countAsArea?: boolean;
  areaIncludedInParent?: boolean;
  countAsRoom?: boolean;
  countAsBathroom?: boolean;
  countAsKitchen?: boolean;
  countAsUnit?: boolean;
};

export type MeasurementDrivers = {
  areaM2?: number | null;
  perimeterMl?: number | null;
  heightM?: number | null;
  doorsCount?: number | null;
  windowsCount?: number | null;
  sanitaryFixturesCount?: number | null;
  waterPointsCount?: number | null;
  electricalPointsCount?: number | null;
  lightingPointsCount?: number | null;
  hvacUnitsCount?: number | null;
  wallSurfaceM2?: number | null;
  ceilingSurfaceM2?: number | null;
  floorSurfaceM2?: number | null;
  tilingSurfaceM2?: number | null;
  linearMeters?: number | null;
};

export type SpaceFeatures = SpaceCountingFlags & {
  hasBathroom?: boolean;
  hasKitchenette?: boolean;
  bathroomType?: 'NINGUNO' | 'ESTANDAR' | 'ADAPTADO' | 'PREMIUM';
  kitchenType?: 'NINGUNA' | 'KITCHENETTE' | 'COCINA_COMPLETA';
  isAccessible?: boolean;
  requiresLeveling?: boolean;
  hasExteriorOpenings?: boolean;
  occupancySensitive?: boolean;
  finishLevel?: 'BASICO' | 'MEDIO' | 'MEDIO_ALTO' | 'ALTO' | 'PREMIUM';
};

export type SystemScope = {
  system: SystemCode;
  enabled: boolean;
  interventionMode: InterventionMode;
  coverage?: 'PARCIAL' | 'TOTAL';
  notes?: string | null;
  certainty: CertaintyLevel;
};

export type TechnicalAction = {
  actionCode: TechnicalActionCode;
  system: SystemCode;
  enabled: boolean;
  interventionMode: InterventionMode;
  coverage?: 'PARCIAL' | 'TOTAL';
  quantityHint?: QuantityHint | null;
  notes?: string | null;
  certainty: CertaintyLevel;
};

export type FinishOverrideKey =
  | 'GLOBAL'
  | 'SUELO'
  | 'REVESTIMIENTOS'
  | 'PINTURA'
  | 'CARPINTERIA_INTERIOR'
  | 'CARPINTERIA_EXTERIOR'
  | 'BANOS'
  | 'COCINA'
  | 'ILUMINACION'
  | 'CLIMATIZACION';

export type FinishOverrides = Partial<Record<FinishOverrideKey, 'BASICO' | 'MEDIO' | 'MEDIO_ALTO' | 'ALTO' | 'PREMIUM'>>;

export type SpaceTechnicalScope = {
  mergeMode: ScopeMergeMode;
  activeSystems: SystemScope[];
  actions: TechnicalAction[];
  finishes?: FinishOverrides;
  inclusions?: Partial<Record<InclusionFamily, InclusionMode>>;
  notes?: string | null;
};

export type FloorNode = {
  floorId: string;
  label: string;
  index?: number | null;
  type?: FloorType;
  selected: boolean;
  features?: SpaceFeatures;
  measurementDrivers?: Partial<MeasurementDrivers>;
  technicalScope?: Partial<SpaceTechnicalScope>;
  notes?: string | null;
};

export type SpaceTemplate = {
  templateId: string;
  areaType: AreaType;
  unitKind?: UnitKind | null;
  spaceKind: SpaceKind;
  subspaceKind?: SubspaceKind | null;
  label: string;
  features: SpaceFeatures;
  measurementDrivers: MeasurementDrivers;
  technicalScope: SpaceTechnicalScope;
  subspaces?: SpaceTemplate[];
};

export type SpaceGroup = {
  groupId: string;
  label: string;
  category: UnitKind | 'OTRO';
  template: SpaceTemplate;
  count: number;
  floorIds?: string[];
  features?: SpaceFeatures;
  measurementDrivers?: Partial<MeasurementDrivers>;
  technicalScope?: Partial<SpaceTechnicalScope>;
  certainty: CertaintyLevel;
};

export type SpaceInstance = {
  instanceId: string;
  groupId?: string | null;
  floorId?: string | null;
  parentInstanceId?: string | null;
  areaType: AreaType;
  unitKind?: UnitKind | null;
  spaceKind: SpaceKind;
  subspaceKind?: SubspaceKind | null;
  label: string;
  isTemplateDerived: boolean;
  features?: SpaceFeatures;
  measurementDrivers?: Partial<MeasurementDrivers>;
  technicalScope?: Partial<SpaceTechnicalScope>;
  certainty: CertaintyLevel;
};

export type OverridePatch = {
  features?: Partial<SpaceFeatures>;
  measurementDrivers?: Partial<MeasurementDrivers>;
  technicalScope?: Partial<SpaceTechnicalScope>;
  notes?: string | null;
};

export type DiscoveryOverrides = {
  project?: OverridePatch;
  floors?: Record<string, OverridePatch>;
  groups?: Record<string, OverridePatch>;
  instances?: Record<string, OverridePatch>;
};

export type SpatialModel = {
  mode: ModelingStrategy;
  floors: FloorNode[];
  groups: SpaceGroup[];
  instances: SpaceInstance[];
  overrides: DiscoveryOverrides;
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
    | 'SPATIAL_MODEL'
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
    | 'SPATIAL_MODEL'
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

export type ResolvedSpace = {
  spaceId: string;
  floorId?: string | null;
  parentSpaceId?: string | null;
  sourceTemplateId?: string | null;
  sourceGroupId?: string | null;
  areaType: AreaType;
  unitKind?: UnitKind | null;
  spaceKind: SpaceKind;
  subspaceKind?: SubspaceKind | null;
  label: string;
  features: SpaceFeatures;
  measurementDrivers: MeasurementDrivers;
  technicalScope: SpaceTechnicalScope;
  derivedWorkCodes: WorkCode[];
  quantityHints: Record<string, number | null>;
  certainty: CertaintyLevel;
  overrideTrace: string[];
};

export type ExecutionContext = {
  mode: ModelingStrategy;
  project: {
    workType: WorkType;
    siteType: SiteType;
    scopeType: ScopeType;
    finishLevel: FinishLevel;
    accessLevel: AccessLevel;
    conditions: string;
    structuralWorks: boolean;
    complexityProfile?: ComplexityProfile;
  };
  totals: {
    areaM2: number;
    bathrooms: number;
    kitchens: number;
    rooms: number;
    units: number;
    floors: number;
  };
  workCodes: WorkCode[];
  subtypes: DiscoverySubtypeCode[];
  resolvedSpaces: ResolvedSpace[];
  resolvedSpecs: ResolvedTechnicalSpecSummary;
  inclusions: Record<InclusionFamily, InclusionMode>;
  currentVsTarget?: Record<string, unknown>;
  executionConstraints?: Record<string, unknown>;
  certainty?: {
    confidenceLevel: 'BAJA' | 'MEDIA' | 'ALTA';
    byBlock: Record<string, string>;
  };
  warnings: string[];
  assumptions: string[];
};

export type DiscoverySessionData = {
  classification: {
    freeTextBrief?: string;
    interventionType: DiscoveryInterventionType;
    assetType: DiscoveryAssetType;
    globalScope: DiscoveryGlobalScope;
    certainty: CertaintyLevel;
  };
  budgetGoal?: BudgetGoal;
  precisionMode?: PrecisionMode;
  modelingStrategy?: ModelingStrategy;
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
  spatialModel: SpatialModel;
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
      spatialModel: CertaintyLevel;
    };
    unknowns: string[];
    useSystemCriteria: boolean;
  };
  discoveryProfile: {
    workType: WorkType;
    subtypes: DiscoverySubtypeCode[];
    complexityProfile: ComplexityProfile;
  };
  technicalSpecModel: TechnicalSpecModel;
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
  modelingStrategy: ModelingStrategy;
  inclusions: Record<InclusionFamily, InclusionMode>;
  currentVsTarget: DiscoverySessionData['currentVsTarget'];
  executionConstraints: DiscoverySessionData['executionConstraints'];
  executionContext: ExecutionContext;
  measurementResult?: MeasurementResult;
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
