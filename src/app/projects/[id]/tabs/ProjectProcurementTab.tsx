"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react';
import styles from '@/app/invoices/page.module.css';
import {
  SOURCING_FAMILIES,
  SOURCING_STRATEGIES,
  type ProjectSourcingPolicy,
  type SourcingFamily,
  type SourcingStrategy,
} from '@/lib/procurement/sourcing-policy';

interface MaterialOption {
  id: string;
  code?: string | null;
  name: string;
  category: string;
  baseUnit: string;
  isCriticalForSchedule: boolean;
  offers: Array<{
    id: string;
    unitCost: number;
    unit: string;
    leadTimeDays: number;
    isPreferred: boolean;
    supplier: { id: string; name: string };
  }>;
}

interface Supply {
  id: string;
  description: string;
  category: string;
  originSource?: string;
  requiredOnSiteDate: string;
  leadTimeDays: number;
  orderDate: string;
  receivedDate?: string;
  priority: 'CRITICA' | 'ALTA' | 'NORMAL' | 'APOYO';
  status: string;
  responsible: string;
  quantity?: number;
  unit?: string;
  suggestedUnitCost?: number;
  expectedUnitCost?: number;
  expectedTotalCost?: number;
  actualUnitCost?: number;
  actualTotalCost?: number;
  scheduleRisk?: string;
  suggestedSupplierReason?: string;
  material?: { id: string; code?: string; name: string; category: string; baseUnit: string };
  supplier?: { id: string; name: string; email?: string; phone?: string };
  suggestedSupplier?: { id: string; name: string; email?: string; phone?: string };
  supplierOffer?: {
    id: string;
    unitCost: number;
    leadTimeDays: number;
    unit: string;
    supplier?: { id: string; name: string };
  };
  suggestedSupplierOffer?: {
    id: string;
    unitCost: number;
    leadTimeDays: number;
    unit: string;
    supplier?: { id: string; name: string };
  };
  estimateInternalLine?: { id: string; code?: string; description: string; chapter: string };
  projectActivity?: { id: string; name: string; code: string; plannedStartDate: string };
  location?: { id: string; name: string };
  wbs?: { id: string; name: string; code: string };
  observations?: string;
}

type SourcingPolicyResponse = {
  policy: ProjectSourcingPolicy & { updatedAt?: string | null };
  defaultPolicy: ProjectSourcingPolicy;
  hasProjectOverride: boolean;
  source: 'PROJECT_OVERRIDE' | 'DEFAULT';
};

function emptyPolicy(): ProjectSourcingPolicy {
  return {
    strategy: 'BALANCED',
    allowedSupplierIds: [],
    allowedSupplierNames: [],
    preferredSuppliersByFamily: {},
    useOnlyPreferredSuppliers: false,
    useOnlyPreferredByFamily: {},
    zoneHint: '',
    maxLeadTimeDays: null,
  };
}

function parseCsv(text: string) {
  return Array.from(
    new Set(
      text
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export default function ProjectProcurementTab({ projectId }: { projectId: string }) {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplyId, setEditingSupplyId] = useState<string | null>(null);
  const [autoSource, setAutoSource] = useState<'estimate' | 'activities' | 'hybrid'>('hybrid');

  const [activities, setActivities] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [wbsItems, setWbsItems] = useState<any[]>([]);
  const [policyState, setPolicyState] = useState<SourcingPolicyResponse | null>(null);
  const [policyForm, setPolicyForm] = useState<ProjectSourcingPolicy>(emptyPolicy());
  const [policyMessage, setPolicyMessage] = useState<string | null>(null);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  const [formData, setFormData] = useState<any>({
    description: '',
    category: 'ACABADOS',
    priority: 'NORMAL',
    status: 'IDENTIFICADA',
    materialId: '',
    supplierOfferId: '',
    supplierId: '',
    responsible: '',
    requiredOnSiteDate: '',
    receivedDate: '',
    leadTimeDays: 0,
    projectActivityId: '',
    locationId: '',
    wbsId: '',
    quantity: '',
    unit: '',
    suggestedUnitCost: '',
    actualUnitCost: '',
    observations: ''
  });

  const resetForm = () => {
    setEditingSupplyId(null);
    setFormData({
      description: '',
      category: 'ACABADOS',
      priority: 'NORMAL',
      status: 'IDENTIFICADA',
      materialId: '',
      supplierOfferId: '',
      supplierId: '',
      responsible: '',
      requiredOnSiteDate: '',
      receivedDate: '',
      leadTimeDays: 0,
      projectActivityId: '',
      locationId: '',
      wbsId: '',
      quantity: '',
      unit: '',
      suggestedUnitCost: '',
      actualUnitCost: '',
      observations: ''
    });
  };

  useEffect(() => {
    fetchData();
    fetchHelpers();
    fetchPolicy();
  }, [projectId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/supplies`);
      if (res.ok) setSupplies(await res.json());
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const fetchHelpers = async () => {
    try {
      const [actRes, locRes, wbsRes, matRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/activities`),
        fetch(`/api/projects/${projectId}/locations`),
        fetch(`/api/projects/${projectId}/wbs`),
        fetch('/api/materials'),
      ]);
      if (actRes.ok) setActivities(await actRes.json());
      if (locRes.ok) setLocations(await locRes.json());
      if (wbsRes.ok) setWbsItems(await wbsRes.json());
      if (matRes.ok) setMaterials(await matRes.json());
    } catch (e) { console.error(e); }
  };

  const fetchPolicy = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/sourcing-policy`);
      if (!res.ok) return;
      const data = (await res.json()) as SourcingPolicyResponse;
      setPolicyState(data);
      setPolicyForm({
        strategy: data.policy.strategy,
        allowedSupplierIds: data.policy.allowedSupplierIds || [],
        allowedSupplierNames: data.policy.allowedSupplierNames || [],
        preferredSuppliersByFamily: data.policy.preferredSuppliersByFamily || {},
        useOnlyPreferredSuppliers: Boolean(data.policy.useOnlyPreferredSuppliers),
        useOnlyPreferredByFamily: data.policy.useOnlyPreferredByFamily || {},
        zoneHint: data.policy.zoneHint || '',
        maxLeadTimeDays: data.policy.maxLeadTimeDays ?? null,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const savePolicy = async () => {
    setIsSavingPolicy(true);
    setPolicyMessage(null);
    try {
      const payload: ProjectSourcingPolicy = {
        strategy: policyForm.strategy,
        allowedSupplierIds: policyForm.allowedSupplierIds?.length ? policyForm.allowedSupplierIds : undefined,
        allowedSupplierNames: policyForm.allowedSupplierNames?.length ? policyForm.allowedSupplierNames : undefined,
        preferredSuppliersByFamily: policyForm.preferredSuppliersByFamily,
        useOnlyPreferredSuppliers: Boolean(policyForm.useOnlyPreferredSuppliers),
        useOnlyPreferredByFamily: policyForm.useOnlyPreferredByFamily,
        zoneHint: policyForm.zoneHint || null,
        maxLeadTimeDays:
          typeof policyForm.maxLeadTimeDays === 'number' && Number.isFinite(policyForm.maxLeadTimeDays)
            ? policyForm.maxLeadTimeDays
            : null,
      };

      const res = await fetch(`/api/projects/${projectId}/sourcing-policy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy: payload }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo guardar la politica de sourcing');
      }

      const data = (await res.json()) as SourcingPolicyResponse;
      setPolicyState(data);
      setPolicyMessage('Politica de sourcing guardada y activa para esta obra.');
    } catch (error: any) {
      setPolicyMessage(error.message || 'Error guardando politica de sourcing');
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleAutoGenerateSupplies = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/supplies/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replaceExisting: false,
          onlyCritical: false,
          mode: autoSource,
          strategy: policyForm.strategy,
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudieron generar los suministros');
      }

      const data = await res.json();
      await fetchData();
      alert(`Suministros automaticos generados: ${data.created} | Fuente: ${data.source}${data.issues?.length ? ` | Avisos: ${data.issues.length}` : ''}`);
    } catch (error: any) {
      alert(error.message || 'Error generando suministros');
    }
  };

  const selectedMaterial = materials.find((material) => material.id === formData.materialId);

  const handleMaterialSelected = (materialId: string) => {
    const material = materials.find((item) => item.id === materialId);
    if (!material) {
      setFormData({ ...formData, materialId: '', supplierOfferId: '', supplierId: '', description: '', unit: '', category: 'OTROS', suggestedUnitCost: '', actualUnitCost: '' });
      return;
    }

    const preferredOffer = material.offers.find((offer) => offer.isPreferred) || material.offers[0];
    setFormData({
      ...formData,
      materialId,
      supplierOfferId: preferredOffer?.id || '',
      supplierId: preferredOffer?.supplier.id || '',
      description: material.name,
      category: material.category,
      unit: preferredOffer?.unit || material.baseUnit,
      leadTimeDays: preferredOffer?.leadTimeDays || 0,
      suggestedUnitCost: preferredOffer?.unitCost?.toString() || '',
      actualUnitCost: preferredOffer?.unitCost?.toString() || '',
      priority: material.isCriticalForSchedule ? 'CRITICA' : formData.priority,
    });
  };

  const openEditModal = (supply: Supply) => {
    setEditingSupplyId(supply.id);
    setFormData({
      description: supply.description || '',
      category: supply.category || 'ACABADOS',
      priority: supply.priority || 'NORMAL',
      status: supply.status || 'IDENTIFICADA',
      materialId: supply.material?.id || '',
      supplierOfferId: supply.supplierOffer?.id || '',
      supplierId: supply.supplier?.id || '',
      responsible: supply.responsible || '',
      requiredOnSiteDate: supply.requiredOnSiteDate ? new Date(supply.requiredOnSiteDate).toISOString().split('T')[0] : '',
      receivedDate: supply.receivedDate ? new Date(supply.receivedDate).toISOString().split('T')[0] : '',
      leadTimeDays: supply.leadTimeDays || 0,
      projectActivityId: supply.projectActivity?.id || '',
      locationId: supply.location?.id || '',
      wbsId: supply.wbs?.id || '',
      quantity: supply.quantity?.toString() || '',
      unit: supply.unit || '',
      suggestedUnitCost: supply.suggestedUnitCost?.toString() || '',
      actualUnitCost: supply.actualUnitCost?.toString() || '',
      observations: supply.observations || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(editingSupplyId ? `/api/projects/${projectId}/supplies/${editingSupplyId}` : `/api/projects/${projectId}/supplies`, {
        method: editingSupplyId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchData();
      }
    } catch (err) { alert("Error al guardar suministro"); }
  };

  const deleteSupply = async (id: string) => {
    if (!confirm("¿Eliminar este suministro ligado?")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/supplies/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/supplies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Sincronizando cadena de suministro...</div>;

  const total = supplies.length;
  const critical = supplies.filter(s => s.priority === 'CRITICA' && s.status !== 'RECIBIDA').length;
  const delayed = supplies.filter(s => s.scheduleRisk === 'RETRASO' || s.scheduleRisk === 'SIN_OFERTA').length;
  const received = supplies.filter(s => s.status === 'RECIBIDA').length;
  const supplierNames = Array.from(
    new Set(
      materials.flatMap((material) => material.offers.map((offer) => offer.supplier.name)).filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0 }}>Politica de sourcing activa</h3>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              {policyState?.source === 'PROJECT_OVERRIDE'
                ? 'Override de obra activo. Pricing y procurement lo usan de forma prioritaria.'
                : 'La obra esta usando defaults del motor hasta que definas un override propio.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="status-badge" style={{ background: 'rgba(59,130,246,0.18)', color: '#93c5fd' }}>
              {policyForm.strategy}
            </span>
            <span className="status-badge" style={{ background: policyState?.source === 'PROJECT_OVERRIDE' ? 'rgba(16,185,129,0.18)' : 'rgba(245,158,11,0.18)', color: policyState?.source === 'PROJECT_OVERRIDE' ? '#86efac' : '#fcd34d' }}>
              {policyState?.source === 'PROJECT_OVERRIDE' ? 'PROJECT OVERRIDE' : 'DEFAULT'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
          <div className="formGroup">
            <label>Estrategia de seleccion</label>
            <select
              className="input-modern"
              value={policyForm.strategy}
              onChange={(e) => setPolicyForm({ ...policyForm, strategy: e.target.value as SourcingStrategy })}
            >
              {SOURCING_STRATEGIES.map((strategy) => (
                <option key={strategy} value={strategy}>{strategy}</option>
              ))}
            </select>
          </div>

          <div className="formGroup">
            <label>Zone hint / zona logistica</label>
            <input
              className="input-modern"
              value={policyForm.zoneHint || ''}
              onChange={(e) => setPolicyForm({ ...policyForm, zoneHint: e.target.value })}
              placeholder="Barcelona, Baix Llobregat, Madrid norte..."
            />
          </div>

          <div className="formGroup">
            <label>Proveedores permitidos (coma separada)</label>
            <input
              className="input-modern"
              value={(policyForm.allowedSupplierNames || []).join(', ')}
              onChange={(e) => setPolicyForm({ ...policyForm, allowedSupplierNames: parseCsv(e.target.value) })}
              list={`supplier-options-${projectId}`}
              placeholder="Acabats Mediterrani, Electro BCN..."
            />
            <datalist id={`supplier-options-${projectId}`}>
              {supplierNames.map((name) => <option key={name} value={name} />)}
            </datalist>
          </div>

          <div className="formGroup">
            <label>Lead time maximo (dias)</label>
            <input
              type="number"
              className="input-modern"
              value={policyForm.maxLeadTimeDays ?? ''}
              onChange={(e) => setPolicyForm({ ...policyForm, maxLeadTimeDays: e.target.value ? Number(e.target.value) : null })}
              placeholder="Sin limite"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={Boolean(policyForm.useOnlyPreferredSuppliers)}
              onChange={(e) => setPolicyForm({ ...policyForm, useOnlyPreferredSuppliers: e.target.checked })}
            />
            Usar solo proveedores preferidos cuando exista preferencia definida
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
          {SOURCING_FAMILIES.map((family) => (
            <div key={family} style={{ padding: '14px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <strong style={{ fontSize: '13px' }}>{family}</strong>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(policyForm.useOnlyPreferredByFamily?.[family])}
                    onChange={(e) =>
                      setPolicyForm({
                        ...policyForm,
                        useOnlyPreferredByFamily: {
                          ...(policyForm.useOnlyPreferredByFamily || {}),
                          [family]: e.target.checked,
                        },
                      })
                    }
                  />
                  Solo preferidos
                </label>
              </div>
              <input
                className="input-modern"
                value={(policyForm.preferredSuppliersByFamily?.[family] || []).join(', ')}
                onChange={(e) =>
                  setPolicyForm({
                    ...policyForm,
                    preferredSuppliersByFamily: {
                      ...(policyForm.preferredSuppliersByFamily || {}),
                      [family]: parseCsv(e.target.value),
                    },
                  })
                }
                list={`supplier-options-${projectId}`}
                placeholder="Proveedor preferido por familia"
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Default motor: {(policyState?.defaultPolicy.preferredSuppliersByFamily?.[family] || []).join(', ') || 'sin preferencia'}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {policyState?.policy.updatedAt
              ? `Actualizada: ${new Date(policyState.policy.updatedAt).toLocaleString()}`
              : 'Aun sin persistencia explicita en la obra; se aplican defaults.'}
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {policyMessage && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{policyMessage}</span>}
            <button className="btn-primary" onClick={savePolicy} disabled={isSavingPolicy}>
              {isSavingPolicy ? 'Guardando...' : 'Guardar politica'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{total}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Suministros ligados</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', borderColor: critical > 0 ? '#ef4444' : 'transparent' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: critical > 0 ? '#ef4444' : 'var(--accent-primary)' }}>{critical}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Críticos pendientes</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', borderColor: delayed > 0 ? '#f59e0b' : 'transparent' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: delayed > 0 ? '#f59e0b' : 'inherit' }}>{delayed}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Riesgo plazo</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{received}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Recibidos / listos</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
        <select className="input-modern" value={autoSource} onChange={(e) => setAutoSource(e.target.value as any)} style={{ minWidth: '220px' }}>
          <option value="estimate">Desde presupuesto interno</option>
          <option value="activities">Desde cronograma</option>
          <option value="hybrid">Presupuesto + cronograma</option>
        </select>
        <button className="btn-secondary" onClick={handleAutoGenerateSupplies}>Generar compras automáticas</button>
        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>+ Nueva necesidad</button>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 20px 0' }}>Control de abastecimiento con material, oferta y plazo</h3>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Material / necesidad</th>
                <th>Origen obra</th>
                <th>Proveedor / decision</th>
                <th>Meta en obra</th>
                <th>Estado logístico</th>
                <th>Coste / riesgo</th>
                <th style={{ textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {supplies.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No hay suministros ligados al plazo registrados.</td></tr>
              ) : supplies.map((s) => {
                const isDelayed = s.scheduleRisk === 'RETRASO' || s.scheduleRisk === 'SIN_OFERTA';
                return (
                  <tr key={s.id} style={{ opacity: s.status === 'RECIBIDA' ? 0.7 : 1 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontWeight: 600, color: s.priority === 'CRITICA' ? '#ef4444' : 'inherit' }}>{s.description}</div>
                        {isDelayed && <span style={{ cursor: 'help' }} title="Necesidad con riesgo de plazo">⚠️</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {s.material?.code ? `${s.material.code} | ` : ''}{s.category} | {s.quantity}{s.unit} | {s.originSource || 'MANUAL'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '11px' }}>
                        {s.projectActivity && <div style={{ color: 'var(--accent-primary)' }}>⚡ {s.projectActivity.name}</div>}
                        {s.location && <div style={{ color: 'var(--text-secondary)' }}>📍 {s.location.name}</div>}
                        {s.wbs && <div style={{ color: 'var(--text-muted)' }}>📂 {s.wbs.name}</div>}
                        {s.estimateInternalLine && <div style={{ color: 'var(--text-muted)' }}>💰 {s.estimateInternalLine.chapter} | {s.estimateInternalLine.description}</div>}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>{s.supplier?.name || s.supplierOffer?.supplier?.name || 'Sin proveedor asignado'}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {s.leadTimeDays || 0} días{typeof s.expectedUnitCost === 'number' ? ` | ${s.expectedUnitCost.toFixed(2)} €/` : ''}{s.unit || ''}
                      </div>
                      {(s.suggestedSupplier?.name || s.suggestedSupplierOffer?.supplier?.name) && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Sugerido: {s.suggestedSupplier?.name || s.suggestedSupplierOffer?.supplier?.name}
                        </div>
                      )}
                      {s.suggestedSupplierReason && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.suggestedSupplierReason}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: isDelayed ? '#ef4444' : 'inherit' }}>
                        {s.requiredOnSiteDate ? new Date(s.requiredOnSiteDate).toLocaleDateString() : 'Sin fecha'}
                      </div>
                      {s.projectActivity?.plannedStartDate && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Inicio act: {new Date(s.projectActivity.plannedStartDate).toLocaleDateString()}</div>
                      )}
                      {s.receivedDate && (
                        <div style={{ fontSize: '10px', color: '#10b981' }}>Recibido: {new Date(s.receivedDate).toLocaleDateString()}</div>
                      )}
                    </td>
                    <td>
                      <select
                        style={{ fontSize: '11px', padding: '4px', background: 'rgba(0,0,0,0.2)', color: '#fff', border: 'none', borderRadius: '4px' }}
                        value={s.status}
                        onChange={(e) => updateStatus(s.id, e.target.value)}
                      >
                        <option value="IDENTIFICADA">IDENTIFICADA</option>
                        <option value="PENDIENTE">PENDIENTE</option>
                        <option value="PEDIDA">PEDIDA</option>
                        <option value="CONFIRMADA">CONFIRMADA</option>
                        <option value="EN_TRANSITO">EN TRANSITO</option>
                        <option value="RECIBIDA">RECIBIDA</option>
                        <option value="RETRASADA">RETRASADA</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {typeof s.expectedTotalCost === 'number' ? `${s.expectedTotalCost.toFixed(2)} €` : 'Sin coste'}
                      </div>
                      <div style={{ fontSize: '11px', color: isDelayed ? '#ef4444' : s.scheduleRisk === 'JUSTO' ? '#f59e0b' : '#10b981' }}>
                        {s.scheduleRisk || 'PENDIENTE'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', marginRight: '8px' }} onClick={() => openEditModal(s)}>Editar</button>
                      <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', color: '#ef4444' }} onClick={() => deleteSupply(s.id)}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" style={{ zIndex: 120 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '720px' }}>
            <h2 style={{ marginBottom: '20px' }}>{editingSupplyId ? 'Actualizar compra / suministro real' : 'Vincular necesidad de compra'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="formGroup" style={{ gridColumn: 'span 2' }}>
                <label>Material maestro</label>
                <select className="input-modern" value={formData.materialId} onChange={e => handleMaterialSelected(e.target.value)}>
                  <option value="">-- Seleccionar material --</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.code ? `[${material.code}] ` : ''}{material.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="formGroup" style={{ gridColumn: 'span 2' }}>
                <label>Descripción del material / elemento</label>
                <input className="input-modern" required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <div className="formGroup">
                <label>Categoría</label>
                <input className="input-modern" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
              </div>

              <div className="formGroup">
                <label>Oferta / proveedor sugerido</label>
                <select
                  className="input-modern"
                  value={formData.supplierOfferId}
                  onChange={e => {
                    const offer = selectedMaterial?.offers.find((item) => item.id === e.target.value);
                    setFormData({
                      ...formData,
                      supplierOfferId: e.target.value,
                      supplierId: offer?.supplier.id || '',
                      leadTimeDays: offer?.leadTimeDays || formData.leadTimeDays,
                      actualUnitCost: offer?.unitCost?.toString() || formData.actualUnitCost,
                    });
                  }}
                  disabled={!selectedMaterial}
                >
                  <option value="">-- Sin oferta --</option>
                  {selectedMaterial?.offers.map((offer) => (
                    <option key={offer.id} value={offer.id}>
                      {offer.supplier.name} | {offer.unitCost.toFixed(2)} €/ {offer.unit} | {offer.leadTimeDays} d
                    </option>
                  ))}
                </select>
              </div>

              <div className="formGroup">
                <label>Vincular a actividad</label>
                <select className="input-modern" value={formData.projectActivityId} onChange={e => setFormData({ ...formData, projectActivityId: e.target.value })}>
                  <option value="">Cualquier actividad</option>
                  {activities.map((a) => <option key={a.id} value={a.id}>[{a.code || 'S/N'}] {a.name}</option>)}
                </select>
              </div>

              <div className="formGroup">
                <label>Vincular a ubicación</label>
                <select className="input-modern" value={formData.locationId} onChange={e => setFormData({ ...formData, locationId: e.target.value })}>
                  <option value="">Cualquier zona</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div className="formGroup">
                <label>Partida / WBS</label>
                <select className="input-modern" value={formData.wbsId} onChange={e => setFormData({ ...formData, wbsId: e.target.value })}>
                  <option value="">Sin WBS</option>
                  {wbsItems.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>

              <div className="formGroup">
                <label>Fecha necesaria en obra</label>
                <input type="date" className="input-modern" required value={formData.requiredOnSiteDate} onChange={e => setFormData({ ...formData, requiredOnSiteDate: e.target.value })} />
              </div>

              <div className="formGroup">
                <label>Plazo suministro (días)</label>
                <input type="number" className="input-modern" value={formData.leadTimeDays} onChange={e => setFormData({ ...formData, leadTimeDays: e.target.value })} />
              </div>

              <div className="formGroup">
                <label>Fecha real de recepcion</label>
                <input type="date" className="input-modern" value={formData.receivedDate} onChange={e => setFormData({ ...formData, receivedDate: e.target.value })} />
              </div>

              <div className="formGroup">
                <label>Cantidad estimada</label>
                <input type="number" className="input-modern" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
              </div>

              <div className="formGroup">
                <label>Unidad</label>
                <input className="input-modern" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} />
              </div>

              <div className="formGroup">
                <label>Prioridad logística</label>
                <select className="input-modern" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                  <option value="CRITICA">CRITICA</option>
                  <option value="ALTA">ALTA</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="APOYO">APOYO</option>
                </select>
              </div>

              <div className="formGroup">
                <label>Responsable</label>
                <input className="input-modern" value={formData.responsible} onChange={e => setFormData({ ...formData, responsible: e.target.value })} />
              </div>

              <div className="formGroup">
                <label>Coste sugerido (€/ud)</label>
                <input type="number" className="input-modern" value={formData.suggestedUnitCost} onChange={e => setFormData({ ...formData, suggestedUnitCost: e.target.value })} />
              </div>

              <div className="formGroup">
                <label>Coste real usado (€/ud)</label>
                <input type="number" className="input-modern" value={formData.actualUnitCost} onChange={e => setFormData({ ...formData, actualUnitCost: e.target.value })} />
              </div>

              <div className="formGroup" style={{ gridColumn: 'span 2' }}>
                <label>Observaciones logísticas</label>
                <textarea className="input-modern" rows={2} value={formData.observations} onChange={e => setFormData({ ...formData, observations: e.target.value })} />
              </div>

              {selectedMaterial && (
                <div style={{ gridColumn: 'span 2', fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                  {selectedMaterial.offers.length > 0
                    ? selectedMaterial.offers.map((offer) => `${offer.supplier.name}: ${offer.unitCost.toFixed(2)} €/ ${offer.unit} | ${offer.leadTimeDays} d${offer.isPreferred ? ' | preferido' : ''}`).join(' || ')
                    : 'Este material no tiene ofertas activas cargadas.'}
                </div>
              )}

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancelar</button>
                <button type="submit" className="btn-primary">{editingSupplyId ? 'Guardar cambios' : 'Registrar necesidad'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
