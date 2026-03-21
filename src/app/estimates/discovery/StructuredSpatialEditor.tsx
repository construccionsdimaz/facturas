"use client";

import { AREA_ACTION_CATALOG, AREA_LABELS, WORK_CODE_LABELS } from '@/lib/discovery/catalogs';
import { createDefaultTemplate } from '@/lib/discovery/defaults';
import {
  createSuggestedStructuredSeed,
  mapActionCodeToWorkCodes,
} from '@/lib/discovery/resolve-spatial-model';
import type {
  AreaActionCode,
  AreaType,
  DiscoveryAreaAction,
  DiscoverySessionData,
  FloorNode,
  SpaceGroup,
  SpaceInstance,
  SystemCode,
  TechnicalAction,
  WorkCode,
} from '@/lib/discovery/types';

type Props = {
  data: DiscoverySessionData;
  onChange: (updater: (current: DiscoverySessionData) => DiscoverySessionData) => void;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'item';
}

function buildAction(actionCode: AreaActionCode): DiscoveryAreaAction {
  return {
    actionCode,
    coverage: 'TOTAL',
    replaceMode: 'SUSTITUIR',
    certainty: 'ESTIMADO',
  };
}

function buildGroup(groupLabel: string, areaType: AreaType, count: number): SpaceGroup {
  return {
    groupId: `${slugify(groupLabel)}-${Date.now()}`,
    label: groupLabel,
    category: areaType === 'HABITACION' ? 'HABITACION' : areaType === 'VIVIENDA' ? 'VIVIENDA' : 'OTRO',
    template: createDefaultTemplate(areaType, groupLabel),
    count,
    floorIds: [],
    features: {},
    measurementDrivers: {},
    technicalScope: {},
    certainty: 'ESTIMADO',
  };
}

function buildInstance(params: {
  label: string;
  areaType: AreaType;
  floorId?: string | null;
  groupId?: string | null;
  parentInstanceId?: string | null;
  templateDerived?: boolean;
}) {
  return {
    instanceId: `${slugify(params.label)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    groupId: params.groupId || null,
    floorId: params.floorId || null,
    parentInstanceId: params.parentInstanceId || null,
    areaType: params.areaType,
    unitKind: params.areaType === 'HABITACION' ? 'HABITACION' : params.areaType === 'VIVIENDA' ? 'VIVIENDA' : null,
    spaceKind: params.parentInstanceId ? 'ESTANCIA' : params.areaType === 'VIVIENDA' ? 'UNIDAD_PRINCIPAL' : 'ESTANCIA',
    subspaceKind: params.areaType === 'BANO' ? 'BANO_ASOCIADO' : params.areaType === 'COCINA' ? 'COCINA_ASOCIADA' : null,
    label: params.label,
    isTemplateDerived: Boolean(params.templateDerived),
    features: {},
    measurementDrivers: {},
    technicalScope: {},
    certainty: 'ESTIMADO',
  } satisfies SpaceInstance;
}

export default function StructuredSpatialEditor({ data, onChange }: Props) {
  const suggestedSeed = createSuggestedStructuredSeed(data.classification.assetType);
  const selectedFloors = data.spatialModel.floors.filter((floor) => floor.selected);

  const addFloor = () => {
    onChange((current) => {
      const nextIndex = current.spatialModel.floors.length + 1;
      const nextFloor: FloorNode = {
        floorId: `floor-${Date.now()}`,
        label: `Planta ${nextIndex}`,
        index: nextIndex,
        type: nextIndex === 1 ? 'BAJA' : 'PLANTA_TIPO',
        selected: true,
        features: {},
        measurementDrivers: {},
        technicalScope: {},
        notes: '',
      };
      return {
        ...current,
        spatialModel: {
          ...current.spatialModel,
          floors: [...current.spatialModel.floors, nextFloor],
        },
      };
    });
  };

  const updateFloor = (floorId: string, patch: Partial<FloorNode>) => {
    onChange((current) => ({
      ...current,
      spatialModel: {
        ...current.spatialModel,
        floors: current.spatialModel.floors.map((floor) =>
          floor.floorId === floorId ? { ...floor, ...patch } : floor
        ),
      },
    }));
  };

  const addGroup = () => {
    onChange((current) => {
      const nextLabel = `${AREA_LABELS[suggestedSeed.baseAreaType]} tipo ${current.spatialModel.groups.length + 1}`;
      const nextGroup = buildGroup(nextLabel, suggestedSeed.baseAreaType, 1);
      nextGroup.floorIds = current.spatialModel.floors.filter((floor) => floor.selected).map((floor) => floor.floorId);
      return {
        ...current,
        certainty: {
          ...current.certainty,
          byBlock: { ...current.certainty.byBlock, spatialModel: 'ESTIMADO' },
        },
        spatialModel: {
          ...current.spatialModel,
          groups: [...current.spatialModel.groups, nextGroup],
        },
      };
    });
  };

  const updateGroup = (groupId: string, updater: (group: SpaceGroup) => SpaceGroup) => {
    onChange((current) => ({
      ...current,
      spatialModel: {
        ...current.spatialModel,
        groups: current.spatialModel.groups.map((group) =>
          group.groupId === groupId ? updater(group) : group
        ),
      },
    }));
  };

  const materializeGroup = (group: SpaceGroup) => {
    onChange((current) => {
      const floorIds = group.floorIds?.length
        ? group.floorIds
        : current.spatialModel.floors.filter((floor) => floor.selected).map((floor) => floor.floorId);
      const nextInstances: SpaceInstance[] = [];
      for (let index = 0; index < Math.max(1, group.count); index += 1) {
        const floorId = floorIds[index % Math.max(1, floorIds.length)] || null;
        nextInstances.push(
          buildInstance({
            label: `${group.label} ${index + 1}`,
            areaType: group.template.areaType,
            floorId,
            groupId: group.groupId,
            templateDerived: true,
          })
        );
      }

      return {
        ...current,
        spatialModel: {
          ...current.spatialModel,
          instances: [
            ...current.spatialModel.instances.filter((instance) => instance.groupId !== group.groupId),
            ...nextInstances,
          ],
        },
      };
    });
  };

  const addSingularInstance = () => {
    onChange((current) => {
      const firstFloorId = current.spatialModel.floors.find((floor) => floor.selected)?.floorId || null;
      return {
        ...current,
        spatialModel: {
          ...current.spatialModel,
          instances: [
            ...current.spatialModel.instances,
            buildInstance({
              label: `Instancia singular ${current.spatialModel.instances.length + 1}`,
              areaType: suggestedSeed.baseAreaType,
              floorId: firstFloorId,
            }),
          ],
        },
      };
    });
  };

  const updateInstance = (instanceId: string, updater: (instance: SpaceInstance) => SpaceInstance) => {
    onChange((current) => ({
      ...current,
      spatialModel: {
        ...current.spatialModel,
        instances: current.spatialModel.instances.map((instance) =>
          instance.instanceId === instanceId ? updater(instance) : instance
        ),
      },
    }));
  };

  const addSubspace = (parent: SpaceInstance, areaType: AreaType) => {
    onChange((current) => ({
      ...current,
      spatialModel: {
        ...current.spatialModel,
        instances: [
          ...current.spatialModel.instances,
          buildInstance({
            label: `${AREA_LABELS[areaType]} ${parent.label}`,
            areaType,
            floorId: parent.floorId,
            parentInstanceId: parent.instanceId,
          }),
        ],
      },
    }));
  };

  const toggleGroupAction = (groupId: string, actionCode: AreaActionCode, checked: boolean) => {
    updateGroup(groupId, (group) => {
      const currentActions = group.template.technicalScope.actions || [];
      const nextSystem: SystemCode =
        mapActionCodeToWorkCodes(actionCode)[0] === 'REDISTRIBUCION_INTERIOR'
          ? 'REDISTRIBUCION'
          : 'ALBANILERIA';
      const nextAction: TechnicalAction = {
        actionCode: actionCode as any,
        system: nextSystem,
        enabled: true,
        interventionMode: 'COMPLETO',
        coverage: 'TOTAL',
        certainty: 'ESTIMADO',
      };
      const nextActions: TechnicalAction[] = checked
        ? currentActions.some((action) => action.actionCode === actionCode)
          ? currentActions
          : [...currentActions, nextAction]
        : currentActions.filter((action) => action.actionCode !== actionCode);

      const nextWorkCodes = new Set<WorkCode>(data.macroScope.workCodes);
      if (checked) {
        for (const workCode of mapActionCodeToWorkCodes(actionCode)) nextWorkCodes.add(workCode);
      }

      return {
        ...group,
        template: {
          ...group.template,
          technicalScope: {
            ...group.template.technicalScope,
            mergeMode: 'REPLACE',
            actions: nextActions,
          },
        },
        technicalScope: {
          ...group.technicalScope,
          mergeMode: 'EXTEND',
          actions: nextActions,
        },
      };
    });

    if (checked) {
      onChange((current) => ({
        ...current,
        macroScope: {
          ...current.macroScope,
          workCodes: Array.from(
            new Set([...current.macroScope.workCodes, ...mapActionCodeToWorkCodes(actionCode)])
          ),
        },
      }));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '16px', background: 'rgba(59,130,246,0.08)' }}>
        <strong>Modo estructurado</strong>
        <div style={{ marginTop: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
          Usa plantas, grupos repetitivos, instancias reales y excepciones solo donde haga falta.
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <h4 style={{ margin: 0 }}>Plantas</h4>
          <button type="button" className="btn-secondary" onClick={addFloor}>+ Añadir planta</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '12px' }}>
          {data.spatialModel.floors.map((floor) => (
            <div key={floor.floorId} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <input type="checkbox" checked={floor.selected} onChange={(e) => updateFloor(floor.floorId, { selected: e.target.checked })} />
                <span>Activa</span>
              </label>
              <input className="input-modern" value={floor.label} onChange={(e) => updateFloor(floor.floorId, { label: e.target.value })} />
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <h4 style={{ margin: 0 }}>Grupos repetitivos</h4>
          <button type="button" className="btn-secondary" onClick={addGroup}>+ Añadir grupo</button>
        </div>
        <div style={{ display: 'grid', gap: '16px', marginTop: '14px' }}>
          {data.spatialModel.groups.map((group) => {
            const availableActions = AREA_ACTION_CATALOG[group.template.areaType] || [];
            const actionCodes = new Set(group.template.technicalScope.actions.map((action) => action.actionCode));
            return (
              <div key={group.groupId} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
                  <input className="input-modern" value={group.label} onChange={(e) => updateGroup(group.groupId, (current) => ({ ...current, label: e.target.value, template: { ...current.template, label: e.target.value } }))} />
                  <select className="input-modern" value={group.template.areaType} onChange={(e) => updateGroup(group.groupId, (current) => ({ ...current, template: createDefaultTemplate(e.target.value as AreaType, current.label) }))}>
                    {Object.entries(AREA_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                  <input className="input-modern" type="number" min={1} value={group.count} onChange={(e) => updateGroup(group.groupId, (current) => ({ ...current, count: Math.max(1, Number(e.target.value) || 1) }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '10px' }}>
                  <input className="input-modern" type="number" placeholder="m2 base" value={group.template.measurementDrivers.areaM2 || ''} onChange={(e) => updateGroup(group.groupId, (current) => ({ ...current, template: { ...current.template, measurementDrivers: { ...current.template.measurementDrivers, areaM2: Number(e.target.value) || null, floorSurfaceM2: Number(e.target.value) || null } } }))} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={Boolean(group.template.features.hasBathroom)} onChange={(e) => updateGroup(group.groupId, (current) => ({ ...current, template: { ...current.template, features: { ...current.template.features, hasBathroom: e.target.checked } } }))} />Baño asociado</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={Boolean(group.template.features.hasKitchenette)} onChange={(e) => updateGroup(group.groupId, (current) => ({ ...current, template: { ...current.template, features: { ...current.template.features, hasKitchenette: e.target.checked } } }))} />Kitchenette</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={Boolean(group.template.features.isAccessible)} onChange={(e) => updateGroup(group.groupId, (current) => ({ ...current, template: { ...current.template, features: { ...current.template.features, isAccessible: e.target.checked } } }))} />Adaptado</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={Boolean(group.template.features.requiresLeveling)} onChange={(e) => updateGroup(group.groupId, (current) => ({ ...current, template: { ...current.template, features: { ...current.template.features, requiresLeveling: e.target.checked } } }))} />Nivelación</label>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Acciones base del grupo</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {availableActions.map((actionCode) => {
                      const checked = actionCodes.has(actionCode);
                      return (
                        <label key={actionCode} style={{ padding: '8px 10px', borderRadius: '999px', border: checked ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)', background: checked ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)' }}>
                          <input type="checkbox" checked={checked} onChange={(e) => toggleGroupAction(group.groupId, actionCode, e.target.checked)} style={{ marginRight: '8px' }} />
                          {actionCode.toLowerCase().replaceAll('_', ' ')}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn-secondary" onClick={() => materializeGroup(group)}>Aplicar template a {group.count} instancias</button>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                    Plantas activas: {(group.floorIds?.length ? group.floorIds : selectedFloors.map((floor) => floor.floorId)).length || 1}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <h4 style={{ margin: 0 }}>Instancias y excepciones</h4>
          <button type="button" className="btn-secondary" onClick={addSingularInstance}>+ Instancia singular</button>
        </div>
        <div style={{ display: 'grid', gap: '12px', marginTop: '14px' }}>
          {data.spatialModel.instances.map((instance) => {
            const children = data.spatialModel.instances.filter((child) => child.parentInstanceId === instance.instanceId);
            return (
              <div key={instance.instanceId} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px' }}>
                  <input className="input-modern" value={instance.label} onChange={(e) => updateInstance(instance.instanceId, (current) => ({ ...current, label: e.target.value }))} />
                  <select className="input-modern" value={instance.floorId || ''} onChange={(e) => updateInstance(instance.instanceId, (current) => ({ ...current, floorId: e.target.value || null }))}>
                    <option value="">Sin planta</option>
                    {data.spatialModel.floors.filter((floor) => floor.selected).map((floor) => <option key={floor.floorId} value={floor.floorId}>{floor.label}</option>)}
                  </select>
                  <input className="input-modern" type="number" placeholder="m2" value={instance.measurementDrivers?.areaM2 || ''} onChange={(e) => updateInstance(instance.instanceId, (current) => ({ ...current, measurementDrivers: { ...current.measurementDrivers, areaM2: Number(e.target.value) || null, floorSurfaceM2: Number(e.target.value) || null } }))} />
                  <select className="input-modern" value={instance.features?.finishLevel || 'MEDIO'} onChange={(e) => updateInstance(instance.instanceId, (current) => ({ ...current, features: { ...current.features, finishLevel: e.target.value as any } }))}>
                    <option value="BASICO">Básico</option>
                    <option value="MEDIO">Medio</option>
                    <option value="MEDIO_ALTO">Medio-alto</option>
                    <option value="ALTO">Alto</option>
                    <option value="PREMIUM">Premium</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={Boolean(instance.features?.hasBathroom)} onChange={(e) => updateInstance(instance.instanceId, (current) => ({ ...current, features: { ...current.features, hasBathroom: e.target.checked } }))} />Baño</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={Boolean(instance.features?.hasKitchenette)} onChange={(e) => updateInstance(instance.instanceId, (current) => ({ ...current, features: { ...current.features, hasKitchenette: e.target.checked } }))} />Kitchenette</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={Boolean(instance.features?.isAccessible)} onChange={(e) => updateInstance(instance.instanceId, (current) => ({ ...current, features: { ...current.features, isAccessible: e.target.checked } }))} />Adaptado</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={Boolean(instance.features?.requiresLeveling)} onChange={(e) => updateInstance(instance.instanceId, (current) => ({ ...current, features: { ...current.features, requiresLeveling: e.target.checked } }))} />Nivelación</label>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn-secondary" onClick={() => addSubspace(instance, 'BANO')}>+ Baño asociado</button>
                  <button type="button" className="btn-secondary" onClick={() => addSubspace(instance, 'COCINA')}>+ Kitchenette/Cocina</button>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                    {instance.groupId ? 'Deriva de grupo' : 'Instancia singular'} · {children.length} subespacios
                  </div>
                </div>
                {children.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                    {children.map((child) => (
                      <div key={child.instanceId} style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
                        {child.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '16px' }}>
        <h4 style={{ marginTop: 0 }}>Familias activas derivadas</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {data.macroScope.workCodes.map((code) => (
            <span key={code} style={{ padding: '8px 10px', borderRadius: '999px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)' }}>
              {WORK_CODE_LABELS[code]}
            </span>
          ))}
          {data.macroScope.workCodes.length === 0 && <span style={{ color: 'var(--text-muted)' }}>Todavía no hay familias activas.</span>}
        </div>
      </div>
    </div>
  );
}
