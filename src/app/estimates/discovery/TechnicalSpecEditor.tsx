"use client";

import { useMemo, useState } from 'react';
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
  WALL_FINISH_SOLUTION_CODES,
} from '@/lib/discovery/technical-spec-types';
import { createEmptyTechnicalSpecPatch, ensureTechnicalSpecModel, ensureTechnicalSpecPatch } from '@/lib/discovery/technical-spec-defaults';
import { deriveInputFromSession } from '@/lib/discovery/derive-input';
import { applyFloorPatchToAllFloors, applyGroupPatchToAllGroups, applyInstancePatchToSimilarInstances, resetFloorPatchInheritance, resetGroupPatchInheritance, resetInstancePatchInheritance } from '@/lib/discovery/technical-spec-bulk';
import { buildScopeIssues, buildTechnicalSystemCards, describePatchState } from '@/lib/discovery/technical-spec-ui';
import type { DiscoverySessionData, SpaceGroup, SpaceInstance } from '@/lib/discovery/types';

type Props = { data: DiscoverySessionData; onChange: (updater: (current: DiscoverySessionData) => DiscoverySessionData) => void };
type EditorSection = 'overview' | 'systems' | 'groups' | 'floors' | 'instances';

function computeTechnicalSpecStatus(data: DiscoverySessionData) {
  const derived = deriveInputFromSession(data, 'TECNICO_AFINADO', 'AFINADO', [], [], 'MEDIA');
  const completeness = derived.executionContext.resolvedSpecs.completeness.specifiedScopePercent || 0;
  const blocked = derived.measurementResult?.lines.some((line) => line.status === 'BLOCKED') || false;
  return completeness >= 80 && !blocked ? 'READY_FOR_MEASUREMENT' : 'INCOMPLETE';
}

function sectionTitle(title: string, subtitle: string) {
  return <div style={{ marginBottom: '10px' }}><div style={{ fontWeight: 700 }}>{title}</div><div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{subtitle}</div></div>;
}

function solutionOptions(codes: string[], label: string) {
  return <><option value="">{label}</option>{codes.map((code) => <option key={code} value={code}>{SOLUTION_LABELS[code as keyof typeof SOLUTION_LABELS]}</option>)}</>;
}

function StatusPill({ value }: { value: string }) {
  const color = value === 'READY' || value === 'READY_FOR_MEASUREMENT' ? '#86efac' : value === 'PARTIAL' || value === 'INHERITED' ? '#fcd34d' : value === 'OVERRIDDEN' ? '#93c5fd' : '#fca5a5';
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color, fontSize: '12px', fontWeight: 700 }}>{value}</span>;
}

function FieldSelect({ label, value, onChange, options, placeholder = 'Sin definir' }: { label: string; value?: string | null; onChange: (value: string) => void; options: string[]; placeholder?: string }) {
  return <div className="formGroup"><label>{label}</label><select className="input-modern" value={value || ''} onChange={(e) => onChange(e.target.value)}>{solutionOptions(options, placeholder)}</select></div>;
}

function FieldNumber({ label, value, onChange }: { label: string; value?: number | null; onChange: (value: number | null) => void }) {
  return <div className="formGroup"><label>{label}</label><input className="input-modern" type="number" value={value || ''} onChange={(e) => onChange(Number(e.target.value) || null)} /></div>;
}

function SmallButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" className="btn-secondary" onClick={onClick} style={{ fontSize: '12px', padding: '6px 10px' }}>{children}</button>;
}

function TechnicalScopeCard({ title, subtitle, status, actions, children }: { title: string; subtitle: string; status: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}><div><div style={{ fontWeight: 700 }}>{title}</div><div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{subtitle}</div></div><StatusPill value={status} /></div>{actions ? <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>{actions}</div> : null}{children}</div>;
}

function ScopeTabs({ value, onChange }: { value: EditorSection; onChange: (next: EditorSection) => void }) {
  const tabs: Array<{ key: EditorSection; label: string }> = [{ key: 'overview', label: 'Cobertura' }, { key: 'systems', label: 'Sistemas' }, { key: 'groups', label: 'Grupos' }, { key: 'floors', label: 'Plantas' }, { key: 'instances', label: 'Instancias' }];
  return <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>{tabs.map((tab) => <button key={tab.key} type="button" onClick={() => onChange(tab.key)} style={{ border: value === tab.key ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)', background: value === tab.key ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)', borderRadius: '999px', color: 'white', padding: '8px 14px', cursor: 'pointer' }}>{tab.label}</button>)}</div>;
}

export default function TechnicalSpecEditor({ data, onChange }: Props) {
  const [activeSection, setActiveSection] = useState<EditorSection>('overview');
  const model = ensureTechnicalSpecModel(data.technicalSpecModel);
  const projectPatch = ensureTechnicalSpecPatch(model.projectSpecs);
  const derived = useMemo(() => deriveInputFromSession(data, 'TECNICO_AFINADO', 'AFINADO', [], [], 'MEDIA'), [data]);
  const resolvedSummary = derived.executionContext.resolvedSpecs;
  const systemCards = useMemo(() => buildTechnicalSystemCards({ executionContext: derived.executionContext, resolvedSummary, measurementResult: derived.measurementResult, pricingResult: derived.pricingResult }), [derived.executionContext, resolvedSummary, derived.measurementResult, derived.pricingResult]);
  const selectedFloors = data.spatialModel.floors.filter((floor) => floor.selected);
  const orderedInstances = useMemo(() => { const roots = data.spatialModel.instances.filter((instance) => !instance.parentInstanceId); const all: SpaceInstance[] = []; for (const root of roots) { all.push(root); all.push(...data.spatialModel.instances.filter((instance) => instance.parentInstanceId === root.instanceId)); } return all; }, [data.spatialModel.instances]);

  const updateModel = (updater: (current: ReturnType<typeof ensureTechnicalSpecModel>) => ReturnType<typeof ensureTechnicalSpecModel>) => onChange((current) => { const nextModel = updater(ensureTechnicalSpecModel(current.technicalSpecModel)); nextModel.status = computeTechnicalSpecStatus({ ...current, technicalSpecModel: nextModel }); return { ...current, technicalSpecModel: nextModel }; });
  const updateProjectPatch = (patchUpdater: (patch: ReturnType<typeof ensureTechnicalSpecPatch>) => ReturnType<typeof ensureTechnicalSpecPatch>) => updateModel((current) => ({ ...current, strategy: 'SPECIFIED', projectSpecs: patchUpdater(ensureTechnicalSpecPatch(current.projectSpecs || createEmptyTechnicalSpecPatch())) }));
  const updateGroupPatch = (group: SpaceGroup, patchUpdater: (patch: ReturnType<typeof ensureTechnicalSpecPatch>) => ReturnType<typeof ensureTechnicalSpecPatch>) => updateModel((current) => ({ ...current, strategy: 'SPECIFIED', groupSpecs: { ...current.groupSpecs, [group.groupId]: patchUpdater(ensureTechnicalSpecPatch(current.groupSpecs[group.groupId] || createEmptyTechnicalSpecPatch())) } }));
  const updateFloorPatch = (floorId: string, patchUpdater: (patch: ReturnType<typeof ensureTechnicalSpecPatch>) => ReturnType<typeof ensureTechnicalSpecPatch>) => updateModel((current) => ({ ...current, strategy: 'SPECIFIED', floorSpecs: { ...current.floorSpecs, [floorId]: patchUpdater(ensureTechnicalSpecPatch(current.floorSpecs[floorId] || createEmptyTechnicalSpecPatch())) } }));
  const updateInstancePatch = (instance: SpaceInstance, patchUpdater: (patch: ReturnType<typeof ensureTechnicalSpecPatch>) => ReturnType<typeof ensureTechnicalSpecPatch>) => updateModel((current) => ({ ...current, strategy: 'SPECIFIED', instanceSpecs: { ...current.instanceSpecs, [instance.instanceId]: patchUpdater(ensureTechnicalSpecPatch(current.instanceSpecs[instance.instanceId] || createEmptyTechnicalSpecPatch())) } }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div><div style={{ fontWeight: 700 }}>Technical Spec profesional</div><div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Captura por sistemas, herencia visible y bulk apply útil alineado con el motor real.</div></div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}><StatusPill value={model.status} /><div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Scope {resolvedSummary.completeness.specifiedScopePercent}% · Measurement {derived.measurementResult?.status || 'BLOCKED'} · Pricing {derived.pricingResult?.estimateMode || 'PARAMETRIC_PRELIMINARY'}</div></div>
        </div>
        <div style={{ marginTop: '14px' }}><ScopeTabs value={activeSection} onChange={setActiveSection} /></div>
      </div>

      {activeSection === 'overview' && <div className="glass-panel" style={{ padding: '16px' }}>
        {sectionTitle('Cobertura / completitud', 'READY, PARTIAL y BLOCKED salen del motor; no de un wizard opaco.')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          {systemCards.map((card) => <div key={card.key} style={{ padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}><div><div style={{ fontWeight: 700 }}>{card.label}</div><div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{card.description}</div></div><StatusPill value={card.status} /></div><div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{card.satisfiedCount}/{card.applicableCount} scopes · {card.blockedMeasurementCount} bloqueos measurement · {card.pendingPricingCount} pricing pendientes</div>{card.missingScopes.length > 0 ? <div style={{ marginTop: '10px', color: 'var(--text-secondary)', fontSize: '12px' }}>{card.missingScopes.slice(0, 3).map((issue) => <div key={issue}>• {issue}</div>)}</div> : null}</div>)}
        </div>
      </div>}

      {activeSection === 'systems' && <div className="glass-panel" style={{ padding: '16px' }}>
        {sectionTitle('Sistemas activos', 'Defaults de proyecto por familias reales del motor.')}
        <div style={{ display: 'grid', gap: '14px' }}>
          <TechnicalScopeCard title="Revestimientos verticales / húmedos" subtitle="Wall finishes, pintura e impermeabilización ligera" status={systemCards.find((item) => item.key === 'wallFinishes')?.status || 'BLOCKED'}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <FieldSelect label="Alicatado / revestimiento vertical" value={projectPatch.selections.wallTileSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, wallTileSolution: (value || undefined) as any } }))} options={WALL_FINISH_SOLUTION_CODES.filter((code) => code.startsWith('WALL_TILE_'))} />
              <FieldNumber label="m2 revestimiento vertical" value={projectPatch.dimensions?.wallTileAreaM2} onChange={(value) => updateProjectPatch((current) => ({ ...current, dimensions: { ...(current.dimensions || {}), wallTileAreaM2: value } }))} />
              <FieldSelect label="Pintura paredes" value={projectPatch.selections.wallPaintSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, wallPaintSolution: (value || undefined) as any } }))} options={WALL_FINISH_SOLUTION_CODES.filter((code) => code.startsWith('PAINT_WALL_'))} />
              <FieldNumber label="m2 pintura paredes" value={projectPatch.dimensions?.paintWallAreaM2} onChange={(value) => updateProjectPatch((current) => ({ ...current, dimensions: { ...(current.dimensions || {}), paintWallAreaM2: value } }))} />
              <FieldSelect label="Pintura techos" value={projectPatch.selections.ceilingPaintSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, ceilingPaintSolution: (value || undefined) as any } }))} options={WALL_FINISH_SOLUTION_CODES.filter((code) => code === 'PAINT_CEILING_STD')} />
              <FieldSelect label="Impermeabilización ligera" value={projectPatch.selections.waterproofingSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, waterproofingSolution: (value || undefined) as any } }))} options={WALL_FINISH_SOLUTION_CODES.filter((code) => code === 'WET_AREA_WATERPROOFING_STD')} />
            </div>
          </TechnicalScopeCard>

          <TechnicalScopeCard title="Sistemas constructivos" subtitle="Partitions, ceilings, flooring y carpintería" status={systemCards.find((item) => item.key === 'partitions')?.status || 'BLOCKED'}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <FieldSelect label="Tabiquería" value={projectPatch.selections.partitionSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, partitionSolution: (value || undefined) as any } }))} options={PARTITION_SOLUTION_CODES.filter((code) => code !== 'PARTITION_LINING_STD')} />
              <FieldSelect label="Trasdosado / lining" value={projectPatch.selections.liningSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, liningSolution: (value || undefined) as any } }))} options={PARTITION_SOLUTION_CODES.filter((code) => code === 'PARTITION_LINING_STD')} />
              <FieldSelect label="Falso techo" value={projectPatch.selections.ceilingSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, ceilingSolution: (value || undefined) as any } }))} options={CEILING_SOLUTION_CODES} />
              <FieldSelect label="Pavimento" value={projectPatch.selections.flooringSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, flooringSolution: (value || undefined) as any } }))} options={FLOORING_SOLUTION_CODES.filter((code) => code !== 'SKIRTING_STD')} />
              <FieldSelect label="Rodapié" value={projectPatch.selections.skirtingSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, skirtingSolution: (value || undefined) as any } }))} options={['SKIRTING_STD']} />
              <FieldSelect label="Puerta interior" value={projectPatch.selections.doorSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, doorSolution: (value || undefined) as any } }))} options={CARPENTRY_SOLUTION_CODES.filter((code) => code.startsWith('DOOR_'))} />
              <FieldSelect label="Ventana" value={projectPatch.selections.windowSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, windowSolution: (value || undefined) as any } }))} options={CARPENTRY_SOLUTION_CODES.filter((code) => code.startsWith('WINDOW_'))} />
              <FieldSelect label="Persiana" value={projectPatch.selections.shutterSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, shutterSolution: (value || undefined) as any } }))} options={CARPENTRY_SOLUTION_CODES.filter((code) => code.startsWith('SHUTTER_'))} />
            </div>
          </TechnicalScopeCard>

          <TechnicalScopeCard title="Instalaciones básicas" subtitle="MEP mínimo con más granularidad" status={systemCards.find((item) => item.key === 'mep')?.status || 'BLOCKED'}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <FieldSelect label="Electricidad" value={projectPatch.selections.electricalSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, electricalSolution: (value || undefined) as any } }))} options={BASIC_MEP_SOLUTION_CODES.filter((code) => code === 'ELECTRICAL_ROOM_STD')} />
              <FieldSelect label="Mecanismos eléctricos" value={projectPatch.selections.electricalMechanismsSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, electricalMechanismsSolution: (value || undefined) as any } }))} options={BASIC_MEP_SOLUTION_CODES.filter((code) => code === 'ELECTRICAL_MECHANISMS_STD')} />
              <FieldSelect label="Cuadro eléctrico" value={projectPatch.selections.electricalPanelSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, electricalPanelSolution: (value || undefined) as any } }))} options={BASIC_MEP_SOLUTION_CODES.filter((code) => code === 'ELECTRICAL_PANEL_BASIC')} />
              <FieldSelect label="Iluminación" value={projectPatch.selections.lightingSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, lightingSolution: (value || undefined) as any } }))} options={BASIC_MEP_SOLUTION_CODES.filter((code) => code === 'LIGHTING_BASIC')} />
              <FieldSelect label="Fontanería" value={projectPatch.selections.plumbingSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, plumbingSolution: (value || undefined) as any } }))} options={BASIC_MEP_SOLUTION_CODES.filter((code) => code === 'PLUMBING_POINT_STD')} />
              <FieldSelect label="Fontanería húmeda" value={projectPatch.selections.plumbingWetSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, plumbingWetSolution: (value || undefined) as any } }))} options={BASIC_MEP_SOLUTION_CODES.filter((code) => code === 'PLUMBING_WET_ROOM_STD')} />
              <FieldSelect label="Saneamiento" value={projectPatch.selections.drainageSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, drainageSolution: (value || undefined) as any } }))} options={BASIC_MEP_SOLUTION_CODES.filter((code) => code === 'DRAINAGE_POINT_STD')} />
              <FieldSelect label="Saneamiento húmedo" value={projectPatch.selections.drainageWetSolution} onChange={(value) => updateProjectPatch((current) => ({ ...current, selections: { ...current.selections, drainageWetSolution: (value || undefined) as any } }))} options={BASIC_MEP_SOLUTION_CODES.filter((code) => code === 'DRAINAGE_WET_ROOM_STD')} />
            </div>
          </TechnicalScopeCard>
        </div>
      </div>}

      {activeSection === 'groups' && <div className="glass-panel" style={{ padding: '16px' }}>
        {sectionTitle('Edición por grupos', 'Aplica por grupos repetitivos y copia a similares.')}
        <div style={{ display: 'grid', gap: '14px' }}>
          {data.spatialModel.groups.map((group) => { const patch = ensureTechnicalSpecPatch(model.groupSpecs[group.groupId]); const sampleInstance = data.spatialModel.instances.find((instance) => instance.groupId === group.groupId); const resolvedSpec = sampleInstance ? resolvedSummary.bySpaceId[sampleInstance.instanceId] : null; return <TechnicalScopeCard key={group.groupId} title={group.label} subtitle={`${group.category} · ${group.count} unidades`} status={describePatchState({ patch, resolvedSpec, expectedLevel: 'GROUP' })} actions={<><SmallButton onClick={() => updateModel((current) => applyGroupPatchToAllGroups(current, group.groupId, data.spatialModel.groups.map((item) => item.groupId)))}>Aplicar a todos los grupos</SmallButton><SmallButton onClick={() => updateModel((current) => resetGroupPatchInheritance(current, group.groupId))}>Reset a herencia</SmallButton></>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <FieldSelect label="Solución habitación" value={patch.selections.roomSolution} onChange={(value) => updateGroupPatch(group, (current) => ({ ...current, selections: { ...current.selections, roomSolution: (value || undefined) as any } }))} options={ROOM_SOLUTION_CODES} placeholder="Hereda del proyecto" />
              <FieldSelect label="Solución baño" value={patch.selections.bathSolution} onChange={(value) => updateGroupPatch(group, (current) => ({ ...current, selections: { ...current.selections, bathSolution: (value || undefined) as any } }))} options={BATH_SOLUTION_CODES} placeholder="Hereda del proyecto" />
              <FieldSelect label="Solución kitchenette" value={patch.selections.kitchenetteSolution} onChange={(value) => updateGroupPatch(group, (current) => ({ ...current, selections: { ...current.selections, kitchenetteSolution: (value || undefined) as any } }))} options={KITCHENETTE_SOLUTION_CODES} placeholder="Hereda del proyecto" />
               <FieldNumber label="m2 habitación" value={patch.dimensions?.roomAreaM2} onChange={(value) => updateGroupPatch(group, (current) => ({ ...current, dimensions: { ...(current.dimensions || {}), roomAreaM2: value } }))} />
               <FieldNumber label="m2 baño" value={patch.dimensions?.bathAreaM2} onChange={(value) => updateGroupPatch(group, (current) => ({ ...current, dimensions: { ...(current.dimensions || {}), bathAreaM2: value } }))} />
               <FieldNumber label="ml kitchenette" value={patch.dimensions?.kitchenetteLinearMeters} onChange={(value) => updateGroupPatch(group, (current) => ({ ...current, dimensions: { ...(current.dimensions || {}), kitchenetteLinearMeters: value } }))} />
            </div>
          </TechnicalScopeCard>})}
        </div>
      </div>}

      {activeSection === 'floors' && <div className="glass-panel" style={{ padding: '16px' }}>
        {sectionTitle('Edición por plantas', 'Overrides por planta para nivelación y drivers de superficie.')}
        <div style={{ display: 'grid', gap: '12px' }}>
          {selectedFloors.map((floor) => { const patch = ensureTechnicalSpecPatch(model.floorSpecs[floor.floorId]); const sampleInstance = data.spatialModel.instances.find((instance) => instance.floorId === floor.floorId); const resolvedSpec = sampleInstance ? resolvedSummary.bySpaceId[sampleInstance.instanceId] : null; return <TechnicalScopeCard key={floor.floorId} title={floor.label} subtitle="Scope de planta" status={describePatchState({ patch, resolvedSpec, expectedLevel: 'FLOOR' })} actions={<><SmallButton onClick={() => updateModel((current) => applyFloorPatchToAllFloors(current, floor.floorId, selectedFloors.map((item) => item.floorId)))}>Aplicar a todas las plantas</SmallButton><SmallButton onClick={() => updateModel((current) => resetFloorPatchInheritance(current, floor.floorId))}>Reset a herencia</SmallButton></>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <FieldSelect label="Solución nivelación" value={patch.selections.levelingSolution} onChange={(value) => updateFloorPatch(floor.floorId, (current) => ({ ...current, selections: { ...current.selections, levelingSolution: (value || undefined) as any } }))} options={LEVELING_SOLUTION_CODES} placeholder="Hereda del proyecto" />
               <FieldNumber label="m2 nivelación" value={patch.dimensions?.levelingAreaM2} onChange={(value) => updateFloorPatch(floor.floorId, (current) => ({ ...current, dimensions: { ...(current.dimensions || {}), levelingAreaM2: value } }))} />
            </div>
          </TechnicalScopeCard>})}
        </div>
      </div>}

      {activeSection === 'instances' && <div className="glass-panel" style={{ padding: '16px' }}>
        {sectionTitle('Edición por instancias y subespacios', 'Override fino para excepciones reales.')}
        <div style={{ display: 'grid', gap: '12px' }}>
          {orderedInstances.map((instance) => { const patch = ensureTechnicalSpecPatch(model.instanceSpecs[instance.instanceId]); const resolvedSpec = resolvedSummary.bySpaceId[instance.instanceId]; const space = derived.executionContext.resolvedSpaces.find((item) => item.spaceId === instance.instanceId); const issues = space ? buildScopeIssues({ space, resolvedSpec, measurementResult: derived.measurementResult, pricingResult: derived.pricingResult }) : []; const isCommonArea = ['ZONA_COMUN', 'PASILLO', 'PORTAL', 'ESCALERA'].includes(instance.areaType); const isBath = instance.areaType === 'BANO' || instance.subspaceKind === 'BANO_ASOCIADO'; const isKitchen = instance.areaType === 'COCINA' || instance.subspaceKind === 'KITCHENETTE'; const isRootRoom = !instance.parentInstanceId && instance.areaType === 'HABITACION'; return <div key={instance.instanceId} style={{ marginLeft: instance.parentInstanceId ? '24px' : 0 }}><TechnicalScopeCard title={instance.label} subtitle={`${instance.areaType}${instance.parentInstanceId ? ' · subespacio' : ' · instancia principal'}`} status={describePatchState({ patch, resolvedSpec, expectedLevel: 'INSTANCE' })} actions={<><SmallButton onClick={() => updateModel((current) => applyInstancePatchToSimilarInstances(current, instance.instanceId, data.spatialModel.instances))}>Aplicar a similares</SmallButton><SmallButton onClick={() => updateModel((current) => resetInstancePatchInheritance(current, instance.instanceId))}>Reset a herencia</SmallButton></>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
               {isRootRoom ? <><FieldSelect label="Override habitación" value={patch.selections.roomSolution} onChange={(value) => updateInstancePatch(instance, (current) => ({ ...current, selections: { ...current.selections, roomSolution: (value || undefined) as any } }))} options={ROOM_SOLUTION_CODES} placeholder="Hereda del grupo" /><FieldNumber label="m2 habitación" value={patch.dimensions?.roomAreaM2} onChange={(value) => updateInstancePatch(instance, (current) => ({ ...current, dimensions: { ...(current.dimensions || {}), roomAreaM2: value } }))} /></> : null}
               {isCommonArea ? <><FieldSelect label="Solución zona común" value={patch.selections.commonAreaSolution} onChange={(value) => updateInstancePatch(instance, (current) => ({ ...current, selections: { ...current.selections, commonAreaSolution: (value || undefined) as any } }))} options={COMMON_AREA_SOLUTION_CODES} placeholder="Hereda del proyecto" /><FieldNumber label="m2 zona común" value={patch.dimensions?.commonAreaM2} onChange={(value) => updateInstancePatch(instance, (current) => ({ ...current, dimensions: { ...(current.dimensions || {}), commonAreaM2: value } }))} /></> : null}
              {isBath ? <><FieldSelect label="Solución baño" value={patch.selections.bathSolution} onChange={(value) => updateInstancePatch(instance, (current) => ({ ...current, selections: { ...current.selections, bathSolution: (value || undefined) as any } }))} options={BATH_SOLUTION_CODES} placeholder="Hereda del grupo" /><FieldSelect label="Alicatado baño" value={patch.selections.wallTileSolution} onChange={(value) => updateInstancePatch(instance, (current) => ({ ...current, selections: { ...current.selections, wallTileSolution: (value || undefined) as any } }))} options={WALL_FINISH_SOLUTION_CODES.filter((code) => code.startsWith('WALL_TILE_BATH_'))} placeholder="Hereda del proyecto" /><FieldSelect label="Impermeabilización" value={patch.selections.waterproofingSolution} onChange={(value) => updateInstancePatch(instance, (current) => ({ ...current, selections: { ...current.selections, waterproofingSolution: (value || undefined) as any } }))} options={WALL_FINISH_SOLUTION_CODES.filter((code) => code === 'WET_AREA_WATERPROOFING_STD')} placeholder="Hereda del proyecto" /></> : null}
              {isKitchen ? <><FieldSelect label="Solución kitchenette" value={patch.selections.kitchenetteSolution} onChange={(value) => updateInstancePatch(instance, (current) => ({ ...current, selections: { ...current.selections, kitchenetteSolution: (value || undefined) as any } }))} options={KITCHENETTE_SOLUTION_CODES} placeholder="Hereda del grupo" /><FieldSelect label="Frontal cocina" value={patch.selections.wallTileSolution} onChange={(value) => updateInstancePatch(instance, (current) => ({ ...current, selections: { ...current.selections, wallTileSolution: (value || undefined) as any } }))} options={WALL_FINISH_SOLUTION_CODES.filter((code) => code === 'WALL_TILE_KITCHEN_SPLASHBACK')} placeholder="Hereda del proyecto" /></> : null}
            </div>
            {issues.length > 0 ? <div style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '12px' }}>{issues.slice(0, 4).map((issue) => <div key={issue}>• {issue}</div>)}</div> : null}
          </TechnicalScopeCard></div>})}
        </div>
      </div>}
    </div>
  );
}
