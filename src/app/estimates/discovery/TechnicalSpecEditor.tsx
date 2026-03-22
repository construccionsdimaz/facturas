"use client";

import {
  BASIC_MEP_SOLUTION_CODES,
  BATH_SOLUTION_CODES,
  CARPENTRY_SOLUTION_CODES,
  CEILING_SOLUTION_CODES,
  COMMON_AREA_SOLUTION_CODES,
  FLOORING_SOLUTION_CODES,
  KITCHENETTE_SOLUTION_CODES,
  LEVELING_SOLUTION_CODES,
  PARTITION_SOLUTION_CODES,
  ROOM_SOLUTION_CODES,
  SOLUTION_LABELS,
} from '@/lib/discovery/technical-spec-types';
import {
  createEmptyTechnicalSpecPatch,
  ensureTechnicalSpecModel,
  ensureTechnicalSpecPatch,
} from '@/lib/discovery/technical-spec-defaults';
import type { DiscoverySessionData, SpaceGroup, SpaceInstance } from '@/lib/discovery/types';

type Props = {
  data: DiscoverySessionData;
  onChange: (updater: (current: DiscoverySessionData) => DiscoverySessionData) => void;
};

function computeTechnicalSpecStatus(data: DiscoverySessionData) {
  const model = ensureTechnicalSpecModel(data.technicalSpecModel);
  const projectPatch = ensureTechnicalSpecPatch(model.projectSpecs);
  const rootInstances = data.spatialModel.instances.filter((instance) => !instance.parentInstanceId);
  const roomTargets = data.spatialModel.groups.filter((group) => group.template.areaType === 'HABITACION');
  const bathTargets = [
    ...data.spatialModel.groups.filter(
      (group) => group.template.features.hasBathroom || group.template.areaType === 'BANO'
    ),
    ...rootInstances.filter((instance) => instance.features?.hasBathroom),
  ];
  const kitchenetteTargets = [
    ...data.spatialModel.groups.filter(
      (group) => group.template.features.hasKitchenette || group.template.areaType === 'COCINA'
    ),
    ...rootInstances.filter((instance) => instance.features?.hasKitchenette),
  ];
  const levelingTargets = [
    ...data.spatialModel.floors.filter(
      (floor) =>
        floor.selected &&
        (floor.features?.requiresLeveling ||
          data.spatialModel.instances.some(
            (instance) =>
              instance.floorId === floor.floorId &&
              instance.features?.requiresLeveling
          ))
    ),
  ];
  const commonAreaTargets = data.spatialModel.instances.filter(
    (instance) => instance.areaType === 'ZONA_COMUN' || instance.areaType === 'PASILLO' || instance.areaType === 'PORTAL' || instance.areaType === 'ESCALERA'
  );

  const roomReady =
    roomTargets.length === 0 ||
    roomTargets.every((group) => Boolean(model.groupSpecs[group.groupId]?.selections.roomSolution));
  const bathReady =
    bathTargets.length === 0 ||
    bathTargets.every((target) => {
      const isGroup = 'groupId' in target;
      const id = isGroup ? target.groupId : target.instanceId;
      if (!id) return false;
      const patch = isGroup ? model.groupSpecs[id] : model.instanceSpecs[id];
      return Boolean(patch?.selections.bathSolution);
    });
  const kitchenetteReady =
    kitchenetteTargets.length === 0 ||
    kitchenetteTargets.every((target) => {
      const isGroup = 'groupId' in target;
      const id = isGroup ? target.groupId : target.instanceId;
      if (!id) return false;
      const patch = isGroup ? model.groupSpecs[id] : model.instanceSpecs[id];
      return Boolean(patch?.selections.kitchenetteSolution);
    });
  const levelingReady =
    levelingTargets.length === 0 ||
    levelingTargets.every((floor) => Boolean(model.floorSpecs[floor.floorId]?.selections.levelingSolution));
  const commonAreasReady =
    commonAreaTargets.length === 0 ||
    commonAreaTargets.every((instance) => Boolean(model.instanceSpecs[instance.instanceId]?.selections.commonAreaSolution));

  const workCodes = new Set(data.macroScope.workCodes);
  const partitionsRequired = workCodes.has('PLADUR') || workCodes.has('ALBANILERIA');
  const ceilingsRequired = workCodes.has('FALSO_TECHO');
  const flooringRequired = workCodes.has('REVESTIMIENTOS');
  const carpentryRequired =
    workCodes.has('CARPINTERIA_INTERIOR') || workCodes.has('CARPINTERIA_EXTERIOR');
  const mepRequired =
    workCodes.has('ELECTRICIDAD') ||
    workCodes.has('ILUMINACION') ||
    workCodes.has('FONTANERIA') ||
    workCodes.has('SANEAMIENTO');

  const partitionsReady = !partitionsRequired || Boolean(projectPatch.selections.partitionSolution);
  const ceilingsReady = !ceilingsRequired || Boolean(projectPatch.selections.ceilingSolution);
  const flooringReady =
    !flooringRequired ||
    Boolean(projectPatch.selections.flooringSolution || projectPatch.selections.skirtingSolution);
  const carpentryReady =
    !carpentryRequired ||
    Boolean(projectPatch.selections.doorSolution || projectPatch.selections.windowSolution);
  const mepReady =
    !mepRequired ||
    Boolean(
      projectPatch.selections.electricalSolution ||
        projectPatch.selections.lightingSolution ||
        projectPatch.selections.plumbingSolution ||
        projectPatch.selections.drainageSolution,
    );

  return roomReady &&
    bathReady &&
    kitchenetteReady &&
    levelingReady &&
    commonAreasReady &&
    partitionsReady &&
    ceilingsReady &&
    flooringReady &&
    carpentryReady &&
    mepReady
    ? 'READY_FOR_MEASUREMENT'
    : 'INCOMPLETE';
}

function sectionTitle(title: string, subtitle: string) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{subtitle}</div>
    </div>
  );
}

function solutionOptions(codes: string[], label: string) {
  return (
    <>
      <option value="">{label}</option>
      {codes.map((code) => (
        <option key={code} value={code}>
          {SOLUTION_LABELS[code as keyof typeof SOLUTION_LABELS]}
        </option>
      ))}
    </>
  );
}

export default function TechnicalSpecEditor({ data, onChange }: Props) {
  const model = ensureTechnicalSpecModel(data.technicalSpecModel);
  const rootInstances = data.spatialModel.instances.filter((instance) => !instance.parentInstanceId);
  const commonAreaInstances = data.spatialModel.instances.filter(
    (instance) =>
      ['ZONA_COMUN', 'PASILLO', 'PORTAL', 'ESCALERA'].includes(instance.areaType)
  );

  const updateModel = (
    updater: (current: ReturnType<typeof ensureTechnicalSpecModel>) => ReturnType<typeof ensureTechnicalSpecModel>
  ) => {
    onChange((current) => {
      const nextModel = updater(ensureTechnicalSpecModel(current.technicalSpecModel));
      nextModel.status = computeTechnicalSpecStatus({
        ...current,
        technicalSpecModel: nextModel,
      });
      return {
        ...current,
        technicalSpecModel: nextModel,
      };
    });
  };

  const updateGroupPatch = (group: SpaceGroup, patchUpdater: (patch: ReturnType<typeof ensureTechnicalSpecPatch>) => ReturnType<typeof ensureTechnicalSpecPatch>) => {
    updateModel((current) => ({
      ...current,
      strategy: 'SPECIFIED',
      groupSpecs: {
        ...current.groupSpecs,
        [group.groupId]: patchUpdater(ensureTechnicalSpecPatch(current.groupSpecs[group.groupId] || createEmptyTechnicalSpecPatch())),
      },
    }));
  };

  const updateProjectPatch = (
    patchUpdater: (patch: ReturnType<typeof ensureTechnicalSpecPatch>) => ReturnType<typeof ensureTechnicalSpecPatch>
  ) => {
    updateModel((current) => ({
      ...current,
      strategy: 'SPECIFIED',
      projectSpecs: patchUpdater(ensureTechnicalSpecPatch(current.projectSpecs || createEmptyTechnicalSpecPatch())),
    }));
  };

  const projectPatch = ensureTechnicalSpecPatch(model.projectSpecs);

  const updateFloorPatch = (floorId: string, patchUpdater: (patch: ReturnType<typeof ensureTechnicalSpecPatch>) => ReturnType<typeof ensureTechnicalSpecPatch>) => {
    updateModel((current) => ({
      ...current,
      strategy: 'SPECIFIED',
      floorSpecs: {
        ...current.floorSpecs,
        [floorId]: patchUpdater(ensureTechnicalSpecPatch(current.floorSpecs[floorId] || createEmptyTechnicalSpecPatch())),
      },
    }));
  };

  const updateInstancePatch = (
    instance: SpaceInstance,
    patchUpdater: (patch: ReturnType<typeof ensureTechnicalSpecPatch>) => ReturnType<typeof ensureTechnicalSpecPatch>
  ) => {
    updateModel((current) => ({
      ...current,
      strategy: 'SPECIFIED',
      instanceSpecs: {
        ...current.instanceSpecs,
        [instance.instanceId]: patchUpdater(ensureTechnicalSpecPatch(current.instanceSpecs[instance.instanceId] || createEmptyTechnicalSpecPatch())),
      },
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700 }}>Especificacion tecnica MVP</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Vertical cerrado para coliving/multiunidad: habitaciones, banos, kitchenettes, nivelacion y zonas comunes.
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Estado</div>
            <div style={{ fontWeight: 700, color: model.status === 'READY_FOR_MEASUREMENT' ? '#86efac' : '#fcd34d' }}>
              {model.status}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <label><input type="checkbox" checked={model.coverage.rooms} onChange={(e) => updateModel((current) => ({ ...current, coverage: { ...current.coverage, rooms: e.target.checked } }))} style={{ marginRight: '8px' }} />Rooms checklist</label>
          <label><input type="checkbox" checked={model.coverage.bathrooms} onChange={(e) => updateModel((current) => ({ ...current, coverage: { ...current.coverage, bathrooms: e.target.checked } }))} style={{ marginRight: '8px' }} />Bathrooms checklist</label>
          <label><input type="checkbox" checked={model.coverage.kitchenettes} onChange={(e) => updateModel((current) => ({ ...current, coverage: { ...current.coverage, kitchenettes: e.target.checked } }))} style={{ marginRight: '8px' }} />Kitchenettes checklist</label>
          <label><input type="checkbox" checked={model.coverage.leveling} onChange={(e) => updateModel((current) => ({ ...current, coverage: { ...current.coverage, leveling: e.target.checked } }))} style={{ marginRight: '8px' }} />Leveling checklist</label>
          <label><input type="checkbox" checked={model.coverage.commonAreas} onChange={(e) => updateModel((current) => ({ ...current, coverage: { ...current.coverage, commonAreas: e.target.checked } }))} style={{ marginRight: '8px' }} />Common areas checklist</label>
          <label><input type="checkbox" checked={model.coverage.partitions} onChange={(e) => updateModel((current) => ({ ...current, coverage: { ...current.coverage, partitions: e.target.checked } }))} style={{ marginRight: '8px' }} />Partitions checklist</label>
          <label><input type="checkbox" checked={model.coverage.ceilings} onChange={(e) => updateModel((current) => ({ ...current, coverage: { ...current.coverage, ceilings: e.target.checked } }))} style={{ marginRight: '8px' }} />Ceilings checklist</label>
          <label><input type="checkbox" checked={model.coverage.flooring} onChange={(e) => updateModel((current) => ({ ...current, coverage: { ...current.coverage, flooring: e.target.checked } }))} style={{ marginRight: '8px' }} />Flooring checklist</label>
          <label><input type="checkbox" checked={model.coverage.carpentry} onChange={(e) => updateModel((current) => ({ ...current, coverage: { ...current.coverage, carpentry: e.target.checked } }))} style={{ marginRight: '8px' }} />Carpentry checklist</label>
          <label><input type="checkbox" checked={model.coverage.mep} onChange={(e) => updateModel((current) => ({ ...current, coverage: { ...current.coverage, mep: e.target.checked } }))} style={{ marginRight: '8px' }} />Basic MEP checklist</label>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '16px' }}>
        {sectionTitle('Sistemas adicionales Phase 1', 'Selecciona defaults prudentes a nivel proyecto para tabiqueria, techos, pavimentos, carpinteria e instalaciones basicas.')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          <div className="formGroup">
            <label>Tabiqueria</label>
            <select className="input-modern" value={projectPatch.selections.partitionSolution || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, partitionSolution: (e.target.value || undefined) as any } }))}>
              {solutionOptions(PARTITION_SOLUTION_CODES, 'Sin definir')}
            </select>
          </div>
          <div className="formGroup">
            <label>m2 tabiqueria</label>
            <input className="input-modern" type="number" value={projectPatch.dimensions?.partitionWallAreaM2 || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, dimensions: { ...current.dimensions, partitionWallAreaM2: Number(e.target.value) || null } }))} />
          </div>
          <div className="formGroup">
            <label>Falso techo</label>
            <select className="input-modern" value={projectPatch.selections.ceilingSolution || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, ceilingSolution: (e.target.value || undefined) as any } }))}>
              {solutionOptions(CEILING_SOLUTION_CODES, 'Sin definir')}
            </select>
          </div>
          <div className="formGroup">
            <label>m2 falso techo</label>
            <input className="input-modern" type="number" value={projectPatch.dimensions?.ceilingAreaM2 || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, dimensions: { ...current.dimensions, ceilingAreaM2: Number(e.target.value) || null } }))} />
          </div>
          <div className="formGroup">
            <label>Pavimento</label>
            <select className="input-modern" value={projectPatch.selections.flooringSolution || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, flooringSolution: (e.target.value || undefined) as any } }))}>
              {solutionOptions(FLOORING_SOLUTION_CODES.filter((code) => code !== 'SKIRTING_STD'), 'Sin definir')}
            </select>
          </div>
          <div className="formGroup">
            <label>Rodapie</label>
            <select className="input-modern" value={projectPatch.selections.skirtingSolution || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, skirtingSolution: (e.target.value || undefined) as any } }))}>
              {solutionOptions(['SKIRTING_STD'], 'Sin definir')}
            </select>
          </div>
          <div className="formGroup">
            <label>m2 pavimento</label>
            <input className="input-modern" type="number" value={projectPatch.dimensions?.flooringAreaM2 || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, dimensions: { ...current.dimensions, flooringAreaM2: Number(e.target.value) || null } }))} />
          </div>
          <div className="formGroup">
            <label>ml rodapie</label>
            <input className="input-modern" type="number" value={projectPatch.dimensions?.skirtingLengthMl || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, dimensions: { ...current.dimensions, skirtingLengthMl: Number(e.target.value) || null } }))} />
          </div>
          <div className="formGroup">
            <label>Puerta interior</label>
            <select className="input-modern" value={projectPatch.selections.doorSolution || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, doorSolution: (e.target.value || undefined) as any } }))}>
              {solutionOptions(CARPENTRY_SOLUTION_CODES.filter((code) => code.startsWith('DOOR_')), 'Sin definir')}
            </select>
          </div>
          <div className="formGroup">
            <label>Ventana</label>
            <select className="input-modern" value={projectPatch.selections.windowSolution || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, windowSolution: (e.target.value || undefined) as any } }))}>
              {solutionOptions(CARPENTRY_SOLUTION_CODES.filter((code) => code.startsWith('WINDOW_')), 'Sin definir')}
            </select>
          </div>
          <div className="formGroup">
            <label>Persiana</label>
            <select className="input-modern" value={projectPatch.selections.shutterSolution || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, shutterSolution: (e.target.value || undefined) as any } }))}>
              {solutionOptions(CARPENTRY_SOLUTION_CODES.filter((code) => code.startsWith('SHUTTER_')), 'Sin definir')}
            </select>
          </div>
          <div className="formGroup">
            <label>Puntos puerta</label>
            <input className="input-modern" type="number" value={projectPatch.counts?.doorCount || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, counts: { ...current.counts, doorCount: Number(e.target.value) || null } }))} />
          </div>
          <div className="formGroup">
            <label>Puntos ventana</label>
            <input className="input-modern" type="number" value={projectPatch.counts?.windowCount || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, counts: { ...current.counts, windowCount: Number(e.target.value) || null } }))} />
          </div>
          <div className="formGroup">
            <label>Electricidad</label>
            <select className="input-modern" value={projectPatch.selections.electricalSolution || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, electricalSolution: (e.target.value || undefined) as any } }))}>
              {solutionOptions(BASIC_MEP_SOLUTION_CODES.filter((code) => code === 'ELECTRICAL_ROOM_STD'), 'Sin definir')}
            </select>
          </div>
          <div className="formGroup">
            <label>Iluminacion</label>
            <select className="input-modern" value={projectPatch.selections.lightingSolution || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, lightingSolution: (e.target.value || undefined) as any } }))}>
              {solutionOptions(BASIC_MEP_SOLUTION_CODES.filter((code) => code === 'LIGHTING_BASIC'), 'Sin definir')}
            </select>
          </div>
          <div className="formGroup">
            <label>Fontaneria</label>
            <select className="input-modern" value={projectPatch.selections.plumbingSolution || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, plumbingSolution: (e.target.value || undefined) as any } }))}>
              {solutionOptions(BASIC_MEP_SOLUTION_CODES.filter((code) => code === 'PLUMBING_POINT_STD'), 'Sin definir')}
            </select>
          </div>
          <div className="formGroup">
            <label>Saneamiento</label>
            <select className="input-modern" value={projectPatch.selections.drainageSolution || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, drainageSolution: (e.target.value || undefined) as any } }))}>
              {solutionOptions(BASIC_MEP_SOLUTION_CODES.filter((code) => code === 'DRAINAGE_POINT_STD'), 'Sin definir')}
            </select>
          </div>
          <div className="formGroup">
            <label>Puntos electricos</label>
            <input className="input-modern" type="number" value={projectPatch.counts?.electricalPointsCount || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, counts: { ...current.counts, electricalPointsCount: Number(e.target.value) || null } }))} />
          </div>
          <div className="formGroup">
            <label>Puntos luz</label>
            <input className="input-modern" type="number" value={projectPatch.counts?.lightingPointsCount || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, counts: { ...current.counts, lightingPointsCount: Number(e.target.value) || null } }))} />
          </div>
          <div className="formGroup">
            <label>Puntos fontaneria</label>
            <input className="input-modern" type="number" value={projectPatch.counts?.plumbingPointsCount || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, counts: { ...current.counts, plumbingPointsCount: Number(e.target.value) || null } }))} />
          </div>
          <div className="formGroup">
            <label>Puntos saneamiento</label>
            <input className="input-modern" type="number" value={projectPatch.counts?.drainagePointsCount || ''} onChange={(e) => updateProjectPatch((current) => ({ ...current, counts: { ...current.counts, drainagePointsCount: Number(e.target.value) || null } }))} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          <label><input type="checkbox" checked={Boolean(projectPatch.options?.partitionInsulated)} onChange={(e) => updateProjectPatch((current) => ({ ...current, options: { ...current.options, partitionInsulated: e.target.checked } }))} style={{ marginRight: '8px' }} />Aislamiento en tabiqueria</label>
          <label><input type="checkbox" checked={Boolean(projectPatch.options?.acousticRequirementBasic)} onChange={(e) => updateProjectPatch((current) => ({ ...current, options: { ...current.options, acousticRequirementBasic: e.target.checked } }))} style={{ marginRight: '8px' }} />Requisito acustico basico</label>
          <label><input type="checkbox" checked={Boolean(projectPatch.options?.includeSkirting)} onChange={(e) => updateProjectPatch((current) => ({ ...current, options: { ...current.options, includeSkirting: e.target.checked } }))} style={{ marginRight: '8px' }} />Incluir rodapie</label>
          <label><input type="checkbox" checked={Boolean(projectPatch.options?.includeShutter)} onChange={(e) => updateProjectPatch((current) => ({ ...current, options: { ...current.options, includeShutter: e.target.checked } }))} style={{ marginRight: '8px' }} />Incluir persiana</label>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '16px' }}>
        {sectionTitle('Grupos de habitaciones', 'Selecciona la solucion base por grupo. Estas selecciones son la fuente tecnica del vertical MVP.')}
        <div style={{ display: 'grid', gap: '14px' }}>
          {data.spatialModel.groups.map((group) => {
            const patch = ensureTechnicalSpecPatch(model.groupSpecs[group.groupId]);
            return (
              <div key={group.groupId} style={{ padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontWeight: 700, marginBottom: '10px' }}>{group.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                  <div className="formGroup">
                    <label>Solucion habitacion</label>
                    <select
                      className="input-modern"
                      value={patch.selections.roomSolution || ''}
                      onChange={(e) =>
                        updateGroupPatch(group, (current) => ({
                          ...current,
                          selections: { ...current.selections, roomSolution: (e.target.value || undefined) as any },
                        }))
                      }
                    >
                      {solutionOptions(ROOM_SOLUTION_CODES, 'Sin definir')}
                    </select>
                  </div>
                  <div className="formGroup">
                    <label>m2 habitacion</label>
                    <input
                      className="input-modern"
                      type="number"
                      value={patch.dimensions?.roomAreaM2 || ''}
                      onChange={(e) =>
                        updateGroupPatch(group, (current) => ({
                          ...current,
                          dimensions: { ...current.dimensions, roomAreaM2: Number(e.target.value) || null },
                        }))
                      }
                    />
                  </div>
                  <div className="formGroup">
                    <label>Solucion bano</label>
                    <select
                      className="input-modern"
                      value={patch.selections.bathSolution || ''}
                      onChange={(e) =>
                        updateGroupPatch(group, (current) => ({
                          ...current,
                          selections: { ...current.selections, bathSolution: (e.target.value || undefined) as any },
                        }))
                      }
                    >
                      {solutionOptions(BATH_SOLUTION_CODES, 'Sin definir')}
                    </select>
                  </div>
                  <div className="formGroup">
                    <label>m2 bano</label>
                    <input
                      className="input-modern"
                      type="number"
                      value={patch.dimensions?.bathAreaM2 || ''}
                      onChange={(e) =>
                        updateGroupPatch(group, (current) => ({
                          ...current,
                          dimensions: { ...current.dimensions, bathAreaM2: Number(e.target.value) || null },
                        }))
                      }
                    />
                  </div>
                  <div className="formGroup">
                    <label>Solucion kitchenette</label>
                    <select
                      className="input-modern"
                      value={patch.selections.kitchenetteSolution || ''}
                      onChange={(e) =>
                        updateGroupPatch(group, (current) => ({
                          ...current,
                          selections: { ...current.selections, kitchenetteSolution: (e.target.value || undefined) as any },
                        }))
                      }
                    >
                      {solutionOptions(KITCHENETTE_SOLUTION_CODES, 'Sin definir')}
                    </select>
                  </div>
                  <div className="formGroup">
                    <label>ml kitchenette</label>
                    <input
                      className="input-modern"
                      type="number"
                      value={patch.dimensions?.kitchenetteLinearMeters || ''}
                      onChange={(e) =>
                        updateGroupPatch(group, (current) => ({
                          ...current,
                          dimensions: {
                            ...current.dimensions,
                            kitchenetteLinearMeters: Number(e.target.value) || null,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <label><input type="checkbox" checked={Boolean(patch.options?.hasBathroom)} onChange={(e) => updateGroupPatch(group, (current) => ({ ...current, options: { ...current.options, hasBathroom: e.target.checked } }))} style={{ marginRight: '8px' }} />Incluye bano</label>
                  <label><input type="checkbox" checked={Boolean(patch.options?.hasKitchenette)} onChange={(e) => updateGroupPatch(group, (current) => ({ ...current, options: { ...current.options, hasKitchenette: e.target.checked } }))} style={{ marginRight: '8px' }} />Incluye kitchenette</label>
                  <label><input type="checkbox" checked={Boolean(patch.options?.isAccessibleBath)} onChange={(e) => updateGroupPatch(group, (current) => ({ ...current, options: { ...current.options, isAccessibleBath: e.target.checked } }))} style={{ marginRight: '8px' }} />Bano adaptado</label>
                </div>
              </div>
            );
          })}
          {data.spatialModel.groups.length === 0 && (
            <div style={{ color: 'var(--text-secondary)' }}>No hay grupos creados todavia.</div>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '16px' }}>
        {sectionTitle('Plantas y nivelacion', 'Define excepciones por planta para nivelacion puntual del vertical MVP.')}
        <div style={{ display: 'grid', gap: '12px' }}>
          {data.spatialModel.floors.filter((floor) => floor.selected).map((floor) => {
            const patch = ensureTechnicalSpecPatch(model.floorSpecs[floor.floorId]);
            return (
              <div key={floor.floorId} style={{ padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontWeight: 700, marginBottom: '10px' }}>{floor.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                  <div className="formGroup">
                    <label>Solucion nivelacion</label>
                    <select
                      className="input-modern"
                      value={patch.selections.levelingSolution || ''}
                      onChange={(e) =>
                        updateFloorPatch(floor.floorId, (current) => ({
                          ...current,
                          selections: { ...current.selections, levelingSolution: (e.target.value || undefined) as any },
                        }))
                      }
                    >
                      {solutionOptions(LEVELING_SOLUTION_CODES, 'Sin definir')}
                    </select>
                  </div>
                  <div className="formGroup">
                    <label>m2 nivelacion</label>
                    <input
                      className="input-modern"
                      type="number"
                      value={patch.dimensions?.levelingAreaM2 || ''}
                      onChange={(e) =>
                        updateFloorPatch(floor.floorId, (current) => ({
                          ...current,
                          dimensions: { ...current.dimensions, levelingAreaM2: Number(e.target.value) || null },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '16px' }}>
        {sectionTitle('Instancias y zonas comunes', 'Solo baja al nivel instancia o zona comun cuando haya excepciones reales frente al grupo.')}
        <div style={{ display: 'grid', gap: '12px' }}>
          {rootInstances.map((instance) => {
            const patch = ensureTechnicalSpecPatch(model.instanceSpecs[instance.instanceId]);
            const isCommonArea = commonAreaInstances.some((target) => target.instanceId === instance.instanceId);
            return (
              <div key={instance.instanceId} style={{ padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontWeight: 700, marginBottom: '10px' }}>{instance.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                  {isCommonArea ? (
                    <div className="formGroup">
                      <label>Solucion zona comun</label>
                      <select
                        className="input-modern"
                        value={patch.selections.commonAreaSolution || ''}
                        onChange={(e) =>
                          updateInstancePatch(instance, (current) => ({
                            ...current,
                            selections: { ...current.selections, commonAreaSolution: (e.target.value || undefined) as any },
                          }))
                        }
                      >
                        {solutionOptions(COMMON_AREA_SOLUTION_CODES, 'Sin definir')}
                      </select>
                    </div>
                  ) : null}
                  {isCommonArea ? (
                    <div className="formGroup">
                      <label>m2 zona comun</label>
                      <input
                        className="input-modern"
                        type="number"
                        value={patch.dimensions?.commonAreaM2 || ''}
                        onChange={(e) =>
                          updateInstancePatch(instance, (current) => ({
                            ...current,
                            dimensions: { ...current.dimensions, commonAreaM2: Number(e.target.value) || null },
                          }))
                        }
                      />
                    </div>
                  ) : null}
                  {!isCommonArea && (
                    <div className="formGroup">
                      <label>Override solucion habitacion</label>
                      <select
                        className="input-modern"
                        value={patch.selections.roomSolution || ''}
                        onChange={(e) =>
                          updateInstancePatch(instance, (current) => ({
                            ...current,
                            selections: { ...current.selections, roomSolution: (e.target.value || undefined) as any },
                          }))
                        }
                      >
                        {solutionOptions(ROOM_SOLUTION_CODES, 'Hereda del grupo')}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
