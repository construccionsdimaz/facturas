"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import StructuredSpatialEditor from './StructuredSpatialEditor';
import TechnicalSpecEditor from './TechnicalSpecEditor';
import { AREA_ACTION_CATALOG, DISCOVERY_STEPS, INCLUSION_FAMILIES, WORK_CODE_LABELS } from '@/lib/discovery/catalogs';
import { createEmptyDiscoverySessionData } from '@/lib/discovery/defaults';
import { ensureTechnicalSpecModel } from '@/lib/discovery/technical-spec-defaults';
import { deriveInputFromSession } from '@/lib/discovery/derive-input';
import { evaluateDiscoveryForGenerate } from '@/lib/discovery/guard';
import { shouldSuggestStructuredMode } from '@/lib/discovery/resolve-spatial-model';
import { buildDiscoverySummary } from '@/lib/discovery/summary';
import type {
  AreaActionCode,
  BudgetGoal,
  CertaintyLevel,
  DiscoveryArea,
  DiscoveryAreaAction,
  DiscoveryAssetType,
  DiscoverySessionData,
  InclusionFamily,
  ModelingStrategy,
  PrecisionMode,
  WorkCode,
} from '@/lib/discovery/types';

type Client = { id: string; name: string };

function parseBooleanSelect(value: string): boolean | null {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function prettyEnum(value: string) {
  return value.toLowerCase().replaceAll('_', ' ');
}

function hydrateSessionData(input: DiscoverySessionData): DiscoverySessionData {
  return {
    ...input,
    technicalSpecModel: ensureTechnicalSpecModel((input as any).technicalSpecModel),
  };
}

function SummaryPanel({
  summaryPreview,
  evaluation,
  modelingStrategy,
}: {
  summaryPreview: ReturnType<typeof buildDiscoverySummary>;
  evaluation: ReturnType<typeof evaluateDiscoveryForGenerate>;
  modelingStrategy?: ModelingStrategy;
}) {
  return (
    <div className="glass-panel" style={{ padding: '18px', background: 'rgba(255,255,255,0.02)' }}>
      <h4 style={{ marginTop: 0 }}>Resumen previo a generar</h4>
      <div style={{ color: 'var(--text-secondary)', display: 'grid', gap: '6px', fontSize: '14px' }}>
        <div><strong style={{ color: 'white' }}>Tipo:</strong> {summaryPreview.headline.workTypeLabel}</div>
        <div><strong style={{ color: 'white' }}>Activo:</strong> {summaryPreview.headline.assetLabel}</div>
        <div><strong style={{ color: 'white' }}>Magnitud:</strong> {summaryPreview.headline.sizeLabel}</div>
        <div><strong style={{ color: 'white' }}>Modo:</strong> {modelingStrategy === 'STRUCTURED_REPETITIVE' ? 'Estructurado' : 'Simple'}</div>
        <div><strong style={{ color: 'white' }}>Confirmado:</strong> {summaryPreview.confirmed.length}</div>
        <div><strong style={{ color: 'white' }}>Estimado:</strong> {summaryPreview.estimated.length}</div>
        <div><strong style={{ color: 'white' }}>Supuesto:</strong> {summaryPreview.assumed.length}</div>
        <div><strong style={{ color: 'white' }}>Pendiente:</strong> {summaryPreview.pending.length}</div>
      </div>
      {evaluation.blockers.length > 0 && <div style={{ marginTop: '12px', color: '#fca5a5' }}><strong>Bloquea generar:</strong><ul>{evaluation.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div>}
      {evaluation.warnings.length > 0 && <div style={{ marginTop: '12px', color: '#fcd34d' }}><strong>Avisos:</strong><ul>{evaluation.warnings.map((warning) => <li key={warning.code}>{warning.message}</li>)}</ul></div>}
      {evaluation.assumptions.length > 0 && <div style={{ marginTop: '12px', color: '#93c5fd' }}><strong>Supuestos del sistema:</strong><ul>{evaluation.assumptions.map((assumption) => <li key={assumption.code}>{assumption.message}</li>)}</ul></div>}
    </div>
  );
}

export default function DiscoveryWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const clientIdFromQuery = searchParams.get('clientId');
  const existingSessionId = searchParams.get('sessionId') || searchParams.get('discoverySessionId');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projectName, setProjectName] = useState('');
  const [clientId, setClientId] = useState<string>(clientIdFromQuery || '');
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showQuickCreateClient, setShowQuickCreateClient] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [budgetGoal, setBudgetGoal] = useState<BudgetGoal>('COMERCIAL');
  const [precisionMode, setPrecisionMode] = useState<PrecisionMode>('MEDIO');
  const [completionStep, setCompletionStep] = useState(1);
  const [sessionData, setSessionData] = useState<DiscoverySessionData>(createEmptyDiscoverySessionData('PISO'));
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const currentStepIndex = Math.max(0, Math.min(DISCOVERY_STEPS.length - 1, completionStep - 1));

  useEffect(() => {
    fetch('/api/clients').then((res) => res.json()).then((data) => setClients(data || [])).catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (!clientId) return;
    const selectedClient = clients.find((client) => client.id === clientId);
    if (selectedClient) setClientSearch(selectedClient.name);
  }, [clientId, clients]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        if (existingSessionId) {
          const existingRes = await fetch(`/api/discovery/sessions/${existingSessionId}`);
          const existingData = await existingRes.json();
          if (!existingRes.ok) throw new Error(existingData.error || 'No se pudo cargar la sesion discovery');
          if (!mounted) return;
          setSessionId(existingData.id);
          setClientId(existingData.clientId || '');
          if (existingData.client?.name) setClientSearch(existingData.client.name);
          setProjectName(existingData.project?.name || '');
          setBudgetGoal(existingData.budgetGoal);
          setPrecisionMode(existingData.precisionMode);
          setCompletionStep(existingData.completionStep || 1);
          setSessionData(hydrateSessionData(existingData.sessionData as DiscoverySessionData));
          return;
        }

        let resolvedClientId = clientIdFromQuery || '';
        let resolvedProjectName = '';
        if (projectId) {
          const projectRes = await fetch(`/api/projects/${projectId}`);
          const project = await projectRes.json();
          resolvedClientId = project.clientId || resolvedClientId;
          resolvedProjectName = project.name || '';
        }
        const res = await fetch('/api/discovery/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            clientId: resolvedClientId || undefined,
            title: resolvedProjectName ? `Discovery ${resolvedProjectName}` : 'Nuevo discovery de presupuesto',
            assetType: 'PISO',
            budgetGoal: 'COMERCIAL',
            precisionMode: 'MEDIO',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo iniciar discovery');
        if (!mounted) return;
        setSessionId(data.id);
        setClientId(data.clientId || resolvedClientId || '');
        if (data.client?.name) setClientSearch(data.client.name);
        setProjectName(resolvedProjectName);
        setBudgetGoal(data.budgetGoal);
        setPrecisionMode(data.precisionMode);
        setCompletionStep(data.completionStep || 1);
        setSessionData(hydrateSessionData(data.sessionData as DiscoverySessionData));
      } catch (error: any) {
        alert(error.message || 'Error iniciando discovery');
      } finally {
        if (mounted) setIsInitializing(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [clientIdFromQuery, existingSessionId, projectId]);

  useEffect(() => {
    if (!sessionId || isInitializing) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await fetch(`/api/discovery/sessions/${sessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: clientId || undefined,
            projectId: projectId || undefined,
            budgetGoal,
            precisionMode,
            completionStep,
            completionPercent: Math.round((completionStep / DISCOVERY_STEPS.length) * 100),
            confidenceScore: 0,
            confidenceLevel: 'MEDIA',
            lastStepKey: DISCOVERY_STEPS[currentStepIndex].key,
            sessionData: { ...sessionData, budgetGoal, precisionMode },
          }),
        });
        setLastSavedAt(new Date().toLocaleTimeString());
      } finally {
        setIsSaving(false);
      }
    }, 500);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [budgetGoal, clientId, completionStep, currentStepIndex, isInitializing, precisionMode, projectId, sessionData, sessionId]);

  const updateSession = (updater: (current: DiscoverySessionData) => DiscoverySessionData) => setSessionData((current) => updater(current));
  const evaluation = useMemo(() => evaluateDiscoveryForGenerate(sessionData), [sessionData]);
  const derivedPreview = useMemo(() => deriveInputFromSession(sessionData, budgetGoal, precisionMode, evaluation.warnings, evaluation.assumptions, evaluation.confidenceLevel), [budgetGoal, evaluation.assumptions, evaluation.confidenceLevel, evaluation.warnings, precisionMode, sessionData]);
  const summaryPreview = useMemo(() => buildDiscoverySummary(sessionData, evaluation.assumptions, evaluation.warnings, derivedPreview.workType), [derivedPreview.workType, evaluation.assumptions, evaluation.warnings, sessionData]);
  const selectedAreas = sessionData.areas.filter((area) => area.selected);
  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients.slice(0, 8);
    return clients.filter((client) => client.name.toLowerCase().includes(query)).slice(0, 8);
  }, [clientSearch, clients]);

  const setAssetType = (assetType: DiscoveryAssetType) => {
    const nextDefaults = createEmptyDiscoverySessionData(assetType);
    updateSession((current) => ({
      ...current,
      classification: { ...current.classification, assetType, certainty: 'CONFIRMADO' },
      areas: nextDefaults.areas,
      actionsByArea: [],
      spatialModel: nextDefaults.spatialModel,
    }));
  };

  const updateArea = (areaId: string, patch: Partial<DiscoveryArea>) => {
    updateSession((current) => ({ ...current, areas: current.areas.map((area) => area.areaId === areaId ? { ...area, ...patch } : area) }));
  };

  const toggleArea = (areaId: string, checked: boolean) => {
    updateSession((current) => ({
      ...current,
      areas: current.areas.map((area) => area.areaId === areaId ? { ...area, selected: checked } : area),
      actionsByArea: checked ? (current.actionsByArea.some((item) => item.areaId === areaId) ? current.actionsByArea : [...current.actionsByArea, { areaId, actions: [] }]) : current.actionsByArea.filter((item) => item.areaId !== areaId),
    }));
  };

  const toggleWorkCode = (workCode: WorkCode, checked: boolean) => {
    updateSession((current) => ({
      ...current,
      macroScope: {
        ...current.macroScope,
        workCodes: checked ? Array.from(new Set([...current.macroScope.workCodes, workCode])) : current.macroScope.workCodes.filter((code) => code !== workCode),
        certainty: 'CONFIRMADO',
      },
    }));
  };

  const toggleAction = (areaId: string, actionCode: AreaActionCode, checked: boolean) => {
    updateSession((current) => ({
      ...current,
      actionsByArea: current.actionsByArea.map((item) => {
        if (item.areaId !== areaId) return item;
        const exists = item.actions.find((action) => action.actionCode === actionCode);
        if (checked && !exists) return { ...item, actions: [...item.actions, { actionCode, coverage: 'TOTAL', replaceMode: 'SUSTITUIR', certainty: 'ESTIMADO' }] };
        if (!checked) return { ...item, actions: item.actions.filter((action) => action.actionCode !== actionCode) };
        return item;
      }),
    }));
  };

  const updateAction = (areaId: string, actionCode: AreaActionCode, patch: Partial<DiscoveryAreaAction>) => {
    updateSession((current) => ({
      ...current,
      actionsByArea: current.actionsByArea.map((item) => item.areaId !== areaId ? item : { ...item, actions: item.actions.map((action) => action.actionCode === actionCode ? { ...action, ...patch } : action) }),
    }));
  };

  const goStep = (nextStep: number) => setCompletionStep(Math.max(1, Math.min(DISCOVERY_STEPS.length, nextStep)));

  const handleQuickCreateClient = async () => {
    const name = quickClientName.trim();
    if (!name) return alert('Indica el nombre del cliente.');
    setIsCreatingClient(true);
    try {
      const res = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, category: 'CLIENTE' }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el cliente');
      setClients((current) => [data, ...current]);
      setClientId(data.id);
      setClientSearch(data.name);
      setQuickClientName('');
      setShowQuickCreateClient(false);
      setShowClientDropdown(false);
    } catch (error: any) {
      alert(error.message || 'Error creando cliente');
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleGenerate = async () => {
    if (!sessionId) return;
    if (!evaluation.canGenerate) return alert(`No se puede generar todavia:\n- ${evaluation.blockers.join('\n- ')}`);
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/discovery/sessions/${sessionId}/generate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo generar la propuesta');
        if (typeof window !== 'undefined') window.sessionStorage.setItem(`discovery-proposal:${sessionId}`, JSON.stringify(data.proposal));
        router.push(data.editorUrl);
    } catch (error: any) {
      alert(error.message || 'Error generando propuesta');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isInitializing) return <div style={{ padding: '24px' }}>Preparando discovery...</div>;

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h1 className="text-gradient" style={{ marginTop: 0 }}>Discovery de presupuesto</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Entrevista guiada para descubrir la obra y aterrizarla en el motor actual.</p>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{projectName ? `Obra: ${projectName} | ` : ''}{isSaving ? 'Guardando...' : lastSavedAt ? `Guardado ${lastSavedAt}` : 'Sin cambios pendientes'}</div>
      </div>

      <div className="glass-panel" style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
        {DISCOVERY_STEPS.map((step, index) => (
          <button key={step.key} type="button" onClick={() => goStep(index + 1)} style={{ border: completionStep === index + 1 ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)', background: completionStep === index + 1 ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)', borderRadius: '10px', color: 'white', padding: '12px', textAlign: 'left', cursor: 'pointer' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Paso {index + 1}</div>
            <div style={{ fontWeight: 600 }}>{step.title}</div>
          </button>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginTop: 0 }}>{DISCOVERY_STEPS[currentStepIndex].title}</h3>
        <p style={{ color: 'var(--text-secondary)' }}>{DISCOVERY_STEPS[currentStepIndex].description}</p>

        {completionStep === 1 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {!projectId && <div className="formGroup" style={{ position: 'relative' }}>
            <label>Cliente</label>
            <input type="text" className="input-modern" placeholder="Buscar cliente..." value={clientSearch} onChange={(e) => { setClientSearch(e.target.value); setClientId(''); setShowClientDropdown(true); }} onFocus={() => setShowClientDropdown(true)} onBlur={() => setTimeout(() => setShowClientDropdown(false), 180)} />
            {showClientDropdown && <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, marginTop: '6px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: '#161b2e', maxHeight: '260px', overflowY: 'auto', boxShadow: '0 18px 40px rgba(0,0,0,0.35)' }}>
              {filteredClients.length > 0 ? filteredClients.map((client) => <button key={client.id} type="button" onMouseDown={() => { setClientId(client.id); setClientSearch(client.name); setShowClientDropdown(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', color: 'white', border: 'none', padding: '10px 12px', cursor: 'pointer' }}>{client.name}</button>) : <div style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>No hay coincidencias.</div>}
              <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}><button type="button" className="btn-secondary" onMouseDown={() => { setQuickClientName(clientSearch.trim()); setShowQuickCreateClient(true); setShowClientDropdown(false); }} style={{ width: '100%' }}>+ Crear cliente nuevo</button></div>
            </div>}
          </div>}
          <div className="formGroup" style={{ gridColumn: '1 / -1' }}><label>Qué quieres hacer</label><textarea className="input-modern" rows={3} value={sessionData.classification.freeTextBrief || ''} onChange={(e) => updateSession((current) => ({ ...current, classification: { ...current.classification, freeTextBrief: e.target.value, certainty: 'ESTIMADO' } }))} /></div>
          <div className="formGroup"><label>Tipo de intervención</label><select className="input-modern" value={sessionData.classification.interventionType} onChange={(e) => updateSession((current) => ({ ...current, classification: { ...current.classification, interventionType: e.target.value as any, certainty: 'CONFIRMADO' } }))}><option value="OBRA_NUEVA">Obra nueva</option><option value="REFORMA">Reforma</option><option value="REHABILITACION">Rehabilitación</option><option value="ADECUACION">Adecuación</option><option value="REDISTRIBUCION">Redistribución</option><option value="REPARACION">Reparación</option><option value="AMPLIACION">Ampliación</option></select></div>
          <div className="formGroup"><label>Tipo de inmueble</label><select className="input-modern" value={sessionData.classification.assetType} onChange={(e) => setAssetType(e.target.value as DiscoveryAssetType)}><option value="PISO">Piso</option><option value="CASA">Casa</option><option value="EDIFICIO">Edificio</option><option value="LOCAL">Local</option><option value="OFICINA">Oficina</option><option value="NAVE">Nave</option><option value="HOTEL">Hotel</option><option value="COLIVING">Coliving</option><option value="EXTERIOR">Exterior</option></select></div>
          <div className="formGroup"><label>Alcance global</label><select className="input-modern" value={sessionData.classification.globalScope} onChange={(e) => updateSession((current) => ({ ...current, classification: { ...current.classification, globalScope: e.target.value as any, certainty: 'CONFIRMADO' } }))}><option value="TOTAL">Todo</option><option value="PARCIAL">Parcial</option><option value="ZONAS_CONCRETAS">Zonas concretas</option><option value="SOLO_INSTALACIONES">Solo instalaciones</option><option value="SOLO_ACABADOS">Solo acabados</option></select></div>
          <div className="formGroup"><label>Objetivo</label><select className="input-modern" value={budgetGoal} onChange={(e) => setBudgetGoal(e.target.value as BudgetGoal)}><option value="ORIENTATIVO">Orientativo</option><option value="COMERCIAL">Comercial</option><option value="VIABILIDAD_INTERNA">Viabilidad interna</option><option value="INVERSOR">Inversor</option><option value="TECNICO_AFINADO">Técnico afinado</option></select></div>
          <div className="formGroup"><label>Precisión</label><select className="input-modern" value={precisionMode} onChange={(e) => setPrecisionMode(e.target.value as PrecisionMode)}><option value="RAPIDO">Rápido</option><option value="MEDIO">Medio</option><option value="AFINADO">Afinado</option></select></div>
          <div className="formGroup"><label>Modelado</label><select className="input-modern" value={sessionData.modelingStrategy || 'SIMPLE_AREA_BASED'} onChange={(e) => updateSession((current) => ({ ...current, modelingStrategy: e.target.value as ModelingStrategy, spatialModel: { ...current.spatialModel, mode: e.target.value as ModelingStrategy } }))}><option value="SIMPLE_AREA_BASED">Simple por áreas</option><option value="STRUCTURED_REPETITIVE">Estructurado repetitivo</option></select></div>
          {shouldSuggestStructuredMode(sessionData) && sessionData.modelingStrategy !== 'STRUCTURED_REPETITIVE' && <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '16px', background: 'rgba(245,158,11,0.08)' }}>Por tipo de activo o repetición detectada conviene usar modo estructurado para no asumir que todas las unidades son iguales.</div>}
        </div>}

        {completionStep === 2 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div className="formGroup"><label>Superficie m2</label><input className="input-modern" type="number" value={sessionData.assetContext.areaM2 || ''} onChange={(e) => updateSession((current) => ({ ...current, assetContext: { ...current.assetContext, areaM2: Number(e.target.value) || null } }))} /></div>
          <div className="formGroup"><label>Magnitud base alternativa</label><input className="input-modern" value={sessionData.assetContext.magnitudeLabel || ''} onChange={(e) => updateSession((current) => ({ ...current, assetContext: { ...current.assetContext, magnitudeLabel: e.target.value } }))} /></div>
          <div className="formGroup"><label>Plantas</label><input className="input-modern" type="number" value={sessionData.assetContext.floors || ''} onChange={(e) => updateSession((current) => ({ ...current, assetContext: { ...current.assetContext, floors: Number(e.target.value) || null } }))} /></div>
          <div className="formGroup"><label>Planta</label><input className="input-modern" type="number" value={sessionData.assetContext.floorNumber || ''} onChange={(e) => updateSession((current) => ({ ...current, assetContext: { ...current.assetContext, floorNumber: Number(e.target.value) || null } }))} /></div>
          <div className="formGroup"><label>Habitaciones actuales</label><input className="input-modern" type="number" value={sessionData.assetContext.roomsCurrent || ''} onChange={(e) => updateSession((current) => ({ ...current, assetContext: { ...current.assetContext, roomsCurrent: Number(e.target.value) || null } }))} /></div>
          <div className="formGroup"><label>Baños actuales</label><input className="input-modern" type="number" value={sessionData.assetContext.bathroomsCurrent || ''} onChange={(e) => updateSession((current) => ({ ...current, assetContext: { ...current.assetContext, bathroomsCurrent: Number(e.target.value) || null } }))} /></div>
          <div className="formGroup"><label>Cocinas actuales</label><input className="input-modern" type="number" value={sessionData.assetContext.kitchensCurrent || ''} onChange={(e) => updateSession((current) => ({ ...current, assetContext: { ...current.assetContext, kitchensCurrent: Number(e.target.value) || null } }))} /></div>
          <div className="formGroup"><label>Unidades actuales</label><input className="input-modern" type="number" value={sessionData.assetContext.unitsCurrent || ''} onChange={(e) => updateSession((current) => ({ ...current, assetContext: { ...current.assetContext, unitsCurrent: Number(e.target.value) || null } }))} /></div>
          <div className="formGroup"><label>Ascensor</label><select className="input-modern" value={String(sessionData.assetContext.hasElevator)} onChange={(e) => updateSession((current) => ({ ...current, assetContext: { ...current.assetContext, hasElevator: parseBooleanSelect(e.target.value) } }))}><option value="null">No lo sé</option><option value="true">Sí</option><option value="false">No</option></select></div>
          <div className="formGroup"><label>Ocupación</label><select className="input-modern" value={sessionData.assetContext.occupancyState || 'NO_LO_SE'} onChange={(e) => updateSession((current) => ({ ...current, assetContext: { ...current.assetContext, occupancyState: e.target.value as any } }))}><option value="NO_LO_SE">No lo sé</option><option value="VACIO">Vacío</option><option value="OCUPADO">Ocupado</option><option value="PARCIALMENTE_OCUPADO">Parcialmente ocupado</option></select></div>
          <div className="formGroup"><label>Acceso</label><select className="input-modern" value={sessionData.assetContext.accessLevel || 'NO_LO_SE'} onChange={(e) => updateSession((current) => ({ ...current, assetContext: { ...current.assetContext, accessLevel: e.target.value as any } }))}><option value="NO_LO_SE">No lo sé</option><option value="FACIL">Fácil</option><option value="NORMAL">Normal</option><option value="COMPLICADO">Complicado</option><option value="MUY_COMPLICADO">Muy complicado</option></select></div>
        </div>}

        {completionStep === 3 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="formGroup"><label>Habitaciones futuras</label><input className="input-modern" type="number" value={sessionData.currentVsTarget.rooms?.target || ''} onChange={(e) => updateSession((current) => ({ ...current, currentVsTarget: { ...current.currentVsTarget, rooms: { current: current.assetContext.roomsCurrent || null, target: Number(e.target.value) || null, certainty: 'ESTIMADO' } } }))} /></div>
          <div className="formGroup"><label>Baños futuros</label><input className="input-modern" type="number" value={sessionData.currentVsTarget.bathrooms?.target || ''} onChange={(e) => updateSession((current) => ({ ...current, currentVsTarget: { ...current.currentVsTarget, bathrooms: { current: current.assetContext.bathroomsCurrent || null, target: Number(e.target.value) || null, certainty: 'ESTIMADO' } } }))} /></div>
          <div className="formGroup"><label>Cocinas futuras</label><input className="input-modern" type="number" value={sessionData.currentVsTarget.kitchens?.target || ''} onChange={(e) => updateSession((current) => ({ ...current, currentVsTarget: { ...current.currentVsTarget, kitchens: { current: current.assetContext.kitchensCurrent || null, target: Number(e.target.value) || null, certainty: 'ESTIMADO' } } }))} /></div>
          <div className="formGroup"><label>Redistribución</label><select className="input-modern" value={String(sessionData.currentVsTarget.redistribution?.value)} onChange={(e) => updateSession((current) => ({ ...current, currentVsTarget: { ...current.currentVsTarget, redistribution: { value: parseBooleanSelect(e.target.value), certainty: 'CONFIRMADO' } } }))}><option value="null">No lo sé</option><option value="true">Sí</option><option value="false">No</option></select></div>
          <div className="formGroup"><label>Estructura afectada</label><select className="input-modern" value={String(sessionData.currentVsTarget.structureAffected?.value)} onChange={(e) => updateSession((current) => ({ ...current, currentVsTarget: { ...current.currentVsTarget, structureAffected: { value: parseBooleanSelect(e.target.value), certainty: 'CONFIRMADO' } } }))}><option value="null">No lo sé</option><option value="true">Sí</option><option value="false">No</option></select></div>
          <div className="formGroup"><label>Cambio de uso</label><select className="input-modern" value={String(sessionData.currentVsTarget.changeOfUse?.value)} onChange={(e) => updateSession((current) => ({ ...current, currentVsTarget: { ...current.currentVsTarget, changeOfUse: { value: parseBooleanSelect(e.target.value), certainty: 'CONFIRMADO' } } }))}><option value="null">No lo sé</option><option value="true">Sí</option><option value="false">No</option></select></div>
          <div className="formGroup"><label>Electricidad</label><select className="input-modern" value={sessionData.currentVsTarget.installationReplacement?.electricity || 'PENDIENTE'} onChange={(e) => updateSession((current) => ({ ...current, currentVsTarget: { ...current.currentVsTarget, installationReplacement: { ...current.currentVsTarget.installationReplacement, electricity: e.target.value as any, certainty: 'ESTIMADO' } } }))}><option value="PENDIENTE">Pendiente</option><option value="NINGUNA">No se toca</option><option value="PARCIAL">Parcial</option><option value="COMPLETA">Completa</option></select></div>
          <div className="formGroup"><label>Fontanería</label><select className="input-modern" value={sessionData.currentVsTarget.installationReplacement?.plumbing || 'PENDIENTE'} onChange={(e) => updateSession((current) => ({ ...current, currentVsTarget: { ...current.currentVsTarget, installationReplacement: { ...current.currentVsTarget.installationReplacement, plumbing: e.target.value as any, certainty: 'ESTIMADO' } } }))}><option value="PENDIENTE">Pendiente</option><option value="NINGUNA">No se toca</option><option value="PARCIAL">Parcial</option><option value="COMPLETA">Completa</option></select></div>
        </div>}

        {completionStep === 4 && (sessionData.modelingStrategy === 'STRUCTURED_REPETITIVE' ? <StructuredSpatialEditor data={sessionData} onChange={updateSession} /> : <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div><h4>Familias activas</h4><div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>{Object.entries(WORK_CODE_LABELS).map(([code, label]) => { const checked = sessionData.macroScope.workCodes.includes(code as WorkCode); return <label key={code} style={{ padding: '8px 10px', borderRadius: '999px', border: checked ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)', background: checked ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)' }}><input type="checkbox" checked={checked} onChange={(e) => toggleWorkCode(code as WorkCode, e.target.checked)} style={{ marginRight: '8px' }} />{label}</label>; })}</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>{sessionData.areas.map((area) => <div key={area.areaId} style={{ padding: '14px', borderRadius: '10px', border: area.selected ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)', background: area.selected ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)' }}><label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 600 }}><input type="checkbox" checked={area.selected} onChange={(e) => toggleArea(area.areaId, e.target.checked)} />{area.label}</label>{area.selected && <div style={{ marginTop: '10px', display: 'grid', gap: '10px' }}><input className="input-modern" type="number" placeholder="m2 aprox." value={area.approxSizeM2 || ''} onChange={(e) => updateArea(area.areaId, { approxSizeM2: Number(e.target.value) || null, certainty: 'ESTIMADO' })} /><input className="input-modern" type="text" placeholder="Estado actual" value={area.currentState?.summary || ''} onChange={(e) => updateArea(area.areaId, { currentState: { summary: e.target.value, exists: null, certainty: e.target.value ? 'ESTIMADO' : 'PENDIENTE' } })} /><input className="input-modern" type="text" placeholder="Estado futuro" value={area.targetState?.summary || ''} onChange={(e) => updateArea(area.areaId, { targetState: { summary: e.target.value, exists: null, certainty: e.target.value ? 'ESTIMADO' : 'PENDIENTE' } })} /></div>}</div>)}</div>
        </div>)}

        {completionStep === 5 && (
          sessionData.modelingStrategy === 'STRUCTURED_REPETITIVE' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className="formGroup">
                  <label>Intensidad global</label>
                  <select className="input-modern" value={sessionData.interventionProfile.globalIntensity} onChange={(e) => updateSession((current) => ({ ...current, interventionProfile: { globalIntensity: e.target.value as any, certainty: 'CONFIRMADO' } }))}>
                    <option value="SUPERFICIAL">Superficial</option>
                    <option value="PARCIAL">Parcial</option>
                    <option value="MEDIA">Media</option>
                    <option value="INTEGRAL">Integral</option>
                    <option value="INTEGRAL_CON_REDISTRIBUCION">Integral con redistribución</option>
                    <option value="INTEGRAL_TECNICA">Integral técnica</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label>Acabado global</label>
                  <select className="input-modern" value={sessionData.finishProfile.globalLevel} onChange={(e) => updateSession((current) => ({ ...current, finishProfile: { ...current.finishProfile, globalLevel: e.target.value as any, certainty: 'CONFIRMADO' } }))}>
                    <option value="BASICO">Básico</option>
                    <option value="MEDIO">Medio</option>
                    <option value="MEDIO_ALTO">Medio-alto</option>
                    <option value="ALTO">Alto</option>
                    <option value="PREMIUM">Premium</option>
                  </select>
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                Instancias modeladas: {sessionData.spatialModel.instances.length}. Las diferencias entre grupo e instancia se resuelven antes de entrar en estimate, planning y procurement.
              </div>
              <TechnicalSpecEditor data={sessionData} onChange={updateSession} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className="formGroup"><label>Intensidad global</label><select className="input-modern" value={sessionData.interventionProfile.globalIntensity} onChange={(e) => updateSession((current) => ({ ...current, interventionProfile: { globalIntensity: e.target.value as any, certainty: 'CONFIRMADO' } }))}><option value="SUPERFICIAL">Superficial</option><option value="PARCIAL">Parcial</option><option value="MEDIA">Media</option><option value="INTEGRAL">Integral</option><option value="INTEGRAL_CON_REDISTRIBUCION">Integral con redistribución</option><option value="INTEGRAL_TECNICA">Integral técnica</option></select></div>
                <div className="formGroup"><label>Acabado global</label><select className="input-modern" value={sessionData.finishProfile.globalLevel} onChange={(e) => updateSession((current) => ({ ...current, finishProfile: { ...current.finishProfile, globalLevel: e.target.value as any, certainty: 'CONFIRMADO' } }))}><option value="BASICO">Básico</option><option value="MEDIO">Medio</option><option value="MEDIO_ALTO">Medio-alto</option><option value="ALTO">Alto</option><option value="PREMIUM">Premium</option></select></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>{selectedAreas.map((area) => { const areaActions = sessionData.actionsByArea.find((item) => item.areaId === area.areaId)?.actions || []; const availableActions = AREA_ACTION_CATALOG[area.areaType] || []; return <div key={area.areaId} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}><h4 style={{ marginTop: 0 }}>{area.label}</h4><div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>{availableActions.map((actionCode) => { const selected = areaActions.some((action) => action.actionCode === actionCode); return <label key={actionCode} style={{ padding: '8px 10px', borderRadius: '999px', border: selected ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)', background: selected ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)' }}><input type="checkbox" checked={selected} onChange={(e) => toggleAction(area.areaId, actionCode, e.target.checked)} style={{ marginRight: '8px' }} />{prettyEnum(actionCode)}</label>; })}</div>{areaActions.length > 0 && <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>{areaActions.map((action) => <div key={action.actionCode} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}><div style={{ fontWeight: 600, gridColumn: '1 / -1' }}>{prettyEnum(action.actionCode)}</div><select className="input-modern" value={action.coverage || 'TOTAL'} onChange={(e) => updateAction(area.areaId, action.actionCode, { coverage: e.target.value as any })}><option value="TOTAL">Total</option><option value="PARCIAL">Parcial</option><option value="PENDIENTE">Pendiente</option></select><select className="input-modern" value={action.replaceMode || 'SUSTITUIR'} onChange={(e) => updateAction(area.areaId, action.actionCode, { replaceMode: e.target.value as any })}><option value="SUSTITUIR">Sustituir</option><option value="CONSERVAR">Conservar</option><option value="MEZCLA">Mezcla</option><option value="USA_CRITERIO">Usa criterio</option><option value="PENDIENTE">Pendiente</option></select><input className="input-modern" type="number" placeholder="Cantidad aprox." value={action.quantityHint?.value || ''} onChange={(e) => updateAction(area.areaId, action.actionCode, { quantityHint: { unit: action.quantityHint?.unit || 'UD', value: Number(e.target.value) || null, certainty: action.quantityHint?.certainty || 'ESTIMADO' } })} /><select className="input-modern" value={action.quantityHint?.unit || 'UD'} onChange={(e) => updateAction(area.areaId, action.actionCode, { quantityHint: { unit: e.target.value as any, value: action.quantityHint?.value || null, certainty: action.quantityHint?.certainty || 'ESTIMADO' } })}><option value="UD">Ud</option><option value="M2">m2</option><option value="ML">ml</option><option value="LOTE">Lote</option></select><select className="input-modern" value={action.certainty} onChange={(e) => updateAction(area.areaId, action.actionCode, { certainty: e.target.value as CertaintyLevel })}><option value="CONFIRMADO">Confirmado</option><option value="ESTIMADO">Estimado</option><option value="SUPUESTO">Supuesto</option><option value="PENDIENTE">Pendiente</option></select></div>)}</div>}</div>; })}</div>
            </div>
          )
        )}

        {completionStep === 6 && <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}><div className="formGroup"><label>Restricciones comunidad</label><select className="input-modern" value={String(sessionData.executionConstraints.communityRestrictions)} onChange={(e) => updateSession((current) => ({ ...current, executionConstraints: { ...current.executionConstraints, communityRestrictions: parseBooleanSelect(e.target.value) } }))}><option value="null">No lo sé</option><option value="true">Sí</option><option value="false">No</option></select></div><div className="formGroup"><label>Restricciones horarias</label><select className="input-modern" value={String(sessionData.executionConstraints.timeRestrictions)} onChange={(e) => updateSession((current) => ({ ...current, executionConstraints: { ...current.executionConstraints, timeRestrictions: parseBooleanSelect(e.target.value) } }))}><option value="null">No lo sé</option><option value="true">Sí</option><option value="false">No</option></select></div><div className="formGroup"><label>Obra por fases</label><select className="input-modern" value={String(sessionData.executionConstraints.worksInPhases)} onChange={(e) => updateSession((current) => ({ ...current, executionConstraints: { ...current.executionConstraints, worksInPhases: parseBooleanSelect(e.target.value) } }))}><option value="null">No lo sé</option><option value="true">Sí</option><option value="false">No</option></select></div><div className="formGroup"><label>Urgencia</label><select className="input-modern" value={String(sessionData.executionConstraints.urgent)} onChange={(e) => updateSession((current) => ({ ...current, executionConstraints: { ...current.executionConstraints, urgent: parseBooleanSelect(e.target.value) } }))}><option value="null">No lo sé</option><option value="true">Sí</option><option value="false">No</option></select></div><div className="formGroup"><label>Licencia pendiente</label><select className="input-modern" value={String(sessionData.executionConstraints.licensePending)} onChange={(e) => updateSession((current) => ({ ...current, executionConstraints: { ...current.executionConstraints, licensePending: parseBooleanSelect(e.target.value) } }))}><option value="null">No lo sé</option><option value="true">Sí</option><option value="false">No</option></select></div><div className="formGroup"><label>Dificultad logística</label><select className="input-modern" value={sessionData.executionConstraints.logisticsDifficulty || 'PENDIENTE'} onChange={(e) => updateSession((current) => ({ ...current, executionConstraints: { ...current.executionConstraints, logisticsDifficulty: e.target.value as any } }))}><option value="PENDIENTE">Pendiente</option><option value="BAJA">Baja</option><option value="MEDIA">Media</option><option value="ALTA">Alta</option><option value="MUY_ALTA">Muy alta</option></select></div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>{INCLUSION_FAMILIES.map((family) => <div className="formGroup" key={family}><label>{prettyEnum(family)}</label><select className="input-modern" value={sessionData.inclusions[family as InclusionFamily]} onChange={(e) => updateSession((current) => ({ ...current, inclusions: { ...current.inclusions, [family]: e.target.value as any } }))}><option value="INCLUIDO">Incluido</option><option value="EXCLUIDO">Excluido</option><option value="CLIENTE">Cliente</option><option value="TERCERO">Tercero</option><option value="PENDIENTE">Pendiente</option></select></div>)}</div>
          <SummaryPanel summaryPreview={summaryPreview} evaluation={evaluation} modelingStrategy={sessionData.modelingStrategy} />
        </div>}

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn-secondary" type="button" onClick={() => goStep(completionStep - 1)} disabled={completionStep === 1}>Anterior</button>
          {completionStep < DISCOVERY_STEPS.length ? <button className="btn-primary" type="button" onClick={() => goStep(completionStep + 1)}>Siguiente</button> : <button className="btn-primary" type="button" onClick={handleGenerate} disabled={isGenerating || (!clientId && !projectId)}>{isGenerating ? 'Generando...' : 'Generar propuesta y abrir editor'}</button>}
        </div>
      </div>

      {showQuickCreateClient && <div className="modal-backdrop" style={{ zIndex: 2000 }}><div className="modal-content glass-panel" style={{ maxWidth: '420px' }}><h3>Crear cliente rápido</h3><p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '18px' }}>Regístralo ahora y continúa el discovery sin salir del presupuesto.</p><div className="formGroup"><label>Nombre del cliente</label><input type="text" className="input-modern" value={quickClientName} onChange={(e) => setQuickClientName(e.target.value)} autoFocus /></div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '18px' }}><button type="button" className="btn-secondary" onClick={() => setShowQuickCreateClient(false)}>Cancelar</button><button type="button" className="btn-primary" onClick={handleQuickCreateClient} disabled={isCreatingClient}>{isCreatingClient ? 'Creando...' : 'Crear cliente'}</button></div></div></div>}
    </div>
  );
}
