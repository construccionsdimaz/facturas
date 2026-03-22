"use client";

import { useEffect, useMemo, useState } from 'react';
import styles from '../page.module.css';

type Supplier = {
  id: string;
  name: string;
};

type Material = {
  id: string;
  code?: string | null;
  name: string;
  category: string;
  baseUnit: string;
};

type Offer = {
  id: string;
  supplierProductName?: string | null;
  supplierProductRef?: string | null;
  procurementMaterialCode?: string | null;
  warehouseLabel?: string | null;
  unit: string;
  unitCost: number;
  leadTimeDays: number;
  status: string;
  isPreferred: boolean;
  mappingStatus: string;
  mappingReason?: string | null;
  intakeSource: string;
  validUntil?: string | null;
  isActive?: boolean;
  supplier?: { id: string; name: string } | null;
  material?: { id: string; code?: string | null; name: string } | null;
};

type OfferCandidate = {
  materialId: string;
  materialCode?: string | null;
  materialName: string;
  category: string;
  confidence: 'HIGH' | 'MEDIUM';
  score: number;
  reason: string;
};

type DuplicateCandidate = {
  offerId: string;
  materialCode?: string | null;
  materialName?: string | null;
  supplierProductName?: string | null;
  supplierProductRef?: string | null;
  unitCost: number;
  leadTimeDays: number;
  score: number;
  reason: string;
  isActive: boolean;
};

type ReviewRow = {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierProductName?: string | null;
  supplierProductRef?: string | null;
  procurementMaterialCode?: string | null;
  warehouseLabel?: string | null;
  material?: {
    id: string;
    code?: string | null;
    name: string;
    category: string;
    baseUnit: string;
  } | null;
  mappingStatus: string;
  mappingReason?: string | null;
  intakeSource: string;
  status: string;
  isActive: boolean;
  isPreferred: boolean;
  unit: string;
  unitCost: number;
  leadTimeDays: number;
  validUntil?: string | null;
  family: string;
  candidates: OfferCandidate[];
  duplicateCandidates: DuplicateCandidate[];
};

type OfferMetrics = {
  totalOffers: number;
  activeOffers: number;
  mappedOffers: number;
  reviewQueueCount: number;
  needsReviewCount: number;
  candidateCount: number;
  duplicateCount: number;
  inactiveCount: number;
  familyBreakdown: Array<{
    family: string;
    totalOffers: number;
    activeMappedOffers: number;
    reviewQueueOffers: number;
    duplicateOffers: number;
  }>;
};

type ImportPreview = {
  totalRows: number;
  readyToCreate: number;
  needsReview: number;
  duplicateCount: number;
  invalidCount: number;
  rows: Array<{
    rowNumber: number;
    supplierName?: string | null;
    procurementMaterialCode?: string | null;
    supplierProductName?: string | null;
    status: string;
    mappingStatus: string;
    mappingReason: string;
    duplicateOfferId?: string | null;
    candidates: OfferCandidate[];
  }>;
};

const emptyForm = {
  supplierId: '',
  materialId: '',
  procurementMaterialCode: '',
  supplierProductName: '',
  supplierProductRef: '',
  warehouseLabel: '',
  unit: 'ud',
  unitCost: '',
  leadTimeDays: '',
  status: 'ACTIVA',
  isPreferred: false,
  validUntil: '',
};

function fmtMoney(value: number) {
  return `${value.toFixed(2)} EUR`;
}

export default function SupplierOffersSettingsPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewRow[]>([]);
  const [metrics, setMetrics] = useState<OfferMetrics | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([]);
  const [selectedCandidateMaterialIds, setSelectedCandidateMaterialIds] = useState<Record<string, string>>({});
  const [bulkMaterialId, setBulkMaterialId] = useState('');
  const [duplicateKeepOfferIds, setDuplicateKeepOfferIds] = useState<Record<string, string>>({});

  async function loadData() {
    setIsLoading(true);
    try {
      const [offersRes, materialsRes, suppliersRes, reviewRes] = await Promise.all([
        fetch(`/api/material-offers?includeInactive=true${needsReviewOnly ? '&needsReview=true' : ''}`),
        fetch('/api/materials'),
        fetch('/api/suppliers'),
        fetch('/api/material-offers/review'),
      ]);
      if (offersRes.ok) setOffers(await offersRes.json());
      if (materialsRes.ok) setMaterials(await materialsRes.json());
      if (suppliersRes.ok) setSuppliers(await suppliersRes.json());
      if (reviewRes.ok) {
        const reviewData = await reviewRes.json();
        setReviewQueue(reviewData.queue || []);
        setMetrics(reviewData.metrics || null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [needsReviewOnly]);

  useEffect(() => {
    setSelectedOfferIds((current) => current.filter((offerId) => reviewQueue.some((row) => row.id === offerId)));
    setSelectedCandidateMaterialIds((current) => {
      const next: Record<string, string> = {};
      for (const row of reviewQueue) {
        next[row.id] = current[row.id] || row.material?.id || row.candidates[0]?.materialId || '';
      }
      return next;
    });
    setDuplicateKeepOfferIds((current) => {
      const next: Record<string, string> = {};
      for (const row of reviewQueue) {
        next[row.id] = current[row.id] || row.id;
      }
      return next;
    });
  }, [reviewQueue]);

  const selectedReviewRows = useMemo(
    () => reviewQueue.filter((row) => selectedOfferIds.includes(row.id)),
    [reviewQueue, selectedOfferIds],
  );

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch(editingOfferId ? `/api/material-offers/${editingOfferId}` : '/api/material-offers', {
      method: editingOfferId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: form.supplierId || null,
        materialId: form.materialId || null,
        procurementMaterialCode: form.procurementMaterialCode || null,
        supplierProductName: form.supplierProductName || null,
        supplierProductRef: form.supplierProductRef || null,
        warehouseLabel: form.warehouseLabel || null,
        unit: form.unit,
        unitCost: Number(form.unitCost),
        leadTimeDays: Number(form.leadTimeDays),
        status: form.status,
        isPreferred: form.isPreferred,
        validUntil: form.validUntil || null,
        updateExisting: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || 'No se pudo guardar la oferta');
      return;
    }
    setMessage(`Oferta ${data.status || 'procesada'} | ${data.mappingStatus} | ${data.mappingReason}`);
    setForm(emptyForm);
    setEditingOfferId(null);
    await loadData();
  }

  async function previewCsv() {
    setMessage(null);
    const res = await fetch('/api/material-offers/import/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvText }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || 'No se pudo previsualizar el CSV');
      return;
    }
    setPreview(data);
    setMessage(`Preview lista | claras: ${data.readyToCreate} | review: ${data.needsReview} | duplicadas: ${data.duplicateCount} | invalidas: ${data.invalidCount}`);
  }

  async function importCsv() {
    setMessage(null);
    const res = await fetch('/api/material-offers/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvText, updateExisting: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || 'No se pudo importar el CSV');
      return;
    }
    setMessage(`CSV importado | creadas: ${data.created} | actualizadas: ${data.updated} | duplicadas: ${data.duplicates} | review: ${data.needsReview}`);
    setPreview(null);
    await loadData();
  }

  function toggleSelected(offerId: string) {
    setSelectedOfferIds((current) =>
      current.includes(offerId) ? current.filter((id) => id !== offerId) : [...current, offerId],
    );
  }

  async function runBulkAction(payload: Record<string, unknown>) {
    const res = await fetch('/api/material-offers/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || 'No se pudo ejecutar la accion masiva');
      return false;
    }
    setMessage(data.message || 'Accion masiva ejecutada');
    setSelectedOfferIds([]);
    await loadData();
    return true;
  }

  async function confirmSingleCandidate(row: ReviewRow) {
    const materialId = selectedCandidateMaterialIds[row.id];
    if (!materialId) {
      setMessage('Selecciona un material candidato antes de confirmar.');
      return;
    }
    await runBulkAction({
      action: 'CONFIRM_CANDIDATE',
      offerIds: [row.id],
      materialId,
    });
  }

  async function markSingleNoMatch(row: ReviewRow) {
    await runBulkAction({
      action: 'MARK_NO_MATCH',
      offerIds: [row.id],
    });
  }

  async function dedupeRow(row: ReviewRow) {
    const relatedIds = [row.id, ...row.duplicateCandidates.map((candidate) => candidate.offerId)];
    await runBulkAction({
      action: 'DEDUPLICATE_KEEP',
      offerIds: relatedIds,
      keepOfferId: duplicateKeepOfferIds[row.id] || row.id,
    });
  }

  return (
    <div className={styles.settingsPage}>
      <div className={styles.header}>
        <div>
          <h1 className="text-gradient">Catalogo y Ofertas</h1>
          <p className={styles.subtitle}>Review queue, normalizacion prudente y mantenimiento operativo del catalogo de ofertas reales.</p>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.sidebarSection}>
          <ul className={styles.settingsNav}>
            <li><a href="/settings" style={{ color: 'inherit', textDecoration: 'none' }}>Perfil de Empresa</a></li>
            <li className={styles.active}>Catalogo y Ofertas</li>
          </ul>
        </div>

        <div className={styles.mainSection} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className={`glass-panel ${styles.panel}`}>
            <h2 className={styles.panelTitle}>Metricas operativas reales</h2>
            <p className={styles.panelDesc}>Estas metricas reflejan el estado real del catalogo cargado, no una promesa de cobertura futura.</p>
            {metrics ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                {[
                  ['Total', metrics.totalOffers],
                  ['Activas', metrics.activeOffers],
                  ['Mapeadas', metrics.mappedOffers],
                  ['En queue', metrics.reviewQueueCount],
                  ['Needs review', metrics.needsReviewCount],
                  ['Candidatas', metrics.candidateCount],
                  ['Duplicadas', metrics.duplicateCount],
                  ['Inactivas', metrics.inactiveCount],
                ].map(([label, value]) => (
                  <div key={String(label)} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.panelDesc}>Cargando metricas...</p>
            )}
            {metrics?.familyBreakdown?.length ? (
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {metrics.familyBreakdown.slice(0, 8).map((family) => (
                  <div key={family.family} style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(4, 1fr)', gap: '8px', fontSize: '12px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                    <strong>{family.family}</strong>
                    <span>Total: {family.totalOffers}</span>
                    <span>Mapeadas: {family.activeMappedOffers}</span>
                    <span>Queue: {family.reviewQueueOffers}</span>
                    <span>Dups: {family.duplicateOffers}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className={`glass-panel ${styles.panel}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <h2 className={styles.panelTitle} style={{ marginBottom: 0 }}>Review queue + bulk normalization</h2>
                <p className={styles.panelDesc}>La cola mezcla NEEDS_REVIEW, matches prudentes por nombre y duplicados revisables.</p>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {selectedReviewRows.length > 0 ? `${selectedReviewRows.length} filas seleccionadas` : 'Selecciona filas para acciones masivas prudentes.'}
              </span>
            </div>
            {selectedReviewRows.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) repeat(5, auto)', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
                <select className="input-modern" value={bulkMaterialId} onChange={(e) => setBulkMaterialId(e.target.value)}>
                  <option value="">Material para accion masiva</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.code ? `[${material.code}] ` : ''}{material.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn-secondary" onClick={() => runBulkAction({ action: 'ASSIGN_MATERIAL', offerIds: selectedOfferIds, materialId: bulkMaterialId, activate: true })}>Asignar material</button>
                <button type="button" className="btn-secondary" onClick={() => runBulkAction({ action: 'SET_ACTIVE', offerIds: selectedOfferIds, isActive: true })}>Reactivar</button>
                <button type="button" className="btn-secondary" onClick={() => runBulkAction({ action: 'SET_ACTIVE', offerIds: selectedOfferIds, isActive: false })}>Desactivar</button>
                <button type="button" className="btn-secondary" onClick={() => runBulkAction({ action: 'MARK_NEEDS_REVIEW', offerIds: selectedOfferIds })}>Volver a review</button>
                <button type="button" className="btn-secondary" onClick={() => runBulkAction({ action: 'MARK_NO_MATCH', offerIds: selectedOfferIds })}>Sin match valido</button>
              </div>
            ) : null}
            {message ? <p className={styles.panelDesc}>{message}</p> : null}
            {isLoading ? (
              <p className={styles.panelDesc}>Cargando review queue...</p>
            ) : reviewQueue.length === 0 ? (
              <p className={styles.panelDesc}>No hay ofertas pendientes o dudosas en este momento.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {reviewQueue.map((row) => (
                  <div key={row.id} style={{ padding: '14px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
                        <input type="checkbox" checked={selectedOfferIds.includes(row.id)} onChange={() => toggleSelected(row.id)} />
                        {row.supplierName} | {row.supplierProductName || row.procurementMaterialCode || row.material?.name || row.id}
                      </label>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {fmtMoney(row.unitCost)}/{row.unit} | {row.leadTimeDays} d | {row.mappingStatus} | {row.family}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>{row.mappingReason || 'Sin razon de mapping.'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Material actual: {row.material?.code ? `[${row.material.code}] ` : ''}{row.material?.name || row.procurementMaterialCode || 'pendiente'}
                      {row.supplierProductRef ? ` | Ref: ${row.supplierProductRef}` : ''}
                      {row.warehouseLabel ? ` | Warehouse: ${row.warehouseLabel}` : ''}
                      {row.intakeSource ? ` | Fuente: ${row.intakeSource}` : ''}
                      {row.isActive ? ' | Activa' : ' | Inactiva'}
                    </div>

                    {row.candidates.length > 0 ? (
                      <>
                        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) auto auto', gap: '10px', alignItems: 'center' }}>
                          <select
                            className="input-modern"
                            value={selectedCandidateMaterialIds[row.id] || ''}
                            onChange={(e) => setSelectedCandidateMaterialIds((current) => ({ ...current, [row.id]: e.target.value }))}
                          >
                            <option value="">Seleccionar candidato</option>
                            {row.candidates.map((candidate) => (
                              <option key={candidate.materialId} value={candidate.materialId}>
                                {candidate.materialCode ? `[${candidate.materialCode}] ` : ''}{candidate.materialName} | {candidate.confidence} | {candidate.score}
                              </option>
                            ))}
                          </select>
                          <button type="button" className="btn-secondary" onClick={() => confirmSingleCandidate(row)}>Confirmar candidato</button>
                          <button type="button" className="btn-secondary" onClick={() => markSingleNoMatch(row)}>Marcar sin match</button>
                        </div>
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {row.candidates.map((candidate) => (
                            <div key={candidate.materialId} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {candidate.materialCode ? `[${candidate.materialCode}] ` : ''}{candidate.materialName} | {candidate.reason}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-secondary" onClick={() => markSingleNoMatch(row)}>Marcar sin match</button>
                      </div>
                    )}

                    {row.duplicateCandidates.length > 0 ? (
                      <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) auto', gap: '10px', alignItems: 'center' }}>
                          <select
                            className="input-modern"
                            value={duplicateKeepOfferIds[row.id] || row.id}
                            onChange={(e) => setDuplicateKeepOfferIds((current) => ({ ...current, [row.id]: e.target.value }))}
                          >
                            <option value={row.id}>Conservar oferta actual ({row.id.slice(-6)})</option>
                            {row.duplicateCandidates.map((candidate) => (
                              <option key={candidate.offerId} value={candidate.offerId}>
                                Conservar {candidate.offerId.slice(-6)} | {candidate.materialCode || candidate.supplierProductName || 'sin code'} | {fmtMoney(candidate.unitCost)}
                              </option>
                            ))}
                          </select>
                          <button type="button" className="btn-secondary" onClick={() => dedupeRow(row)}>Deduplicar seleccion</button>
                        </div>
                        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {row.duplicateCandidates.map((candidate) => (
                            <div key={candidate.offerId} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {candidate.offerId.slice(-6)} | {candidate.materialCode ? `[${candidate.materialCode}] ` : ''}{candidate.materialName || candidate.supplierProductName || 'sin nombre'} | {fmtMoney(candidate.unitCost)} | {candidate.reason}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`glass-panel ${styles.panel}`}>
            <h2 className={styles.panelTitle}>Preview + importacion CSV prudente</h2>
            <p className={styles.panelDesc}>Antes de aplicar, puedes ver filas claras, duplicadas o candidatas a review para evitar ruido en catalogo.</p>
            <textarea className="input-modern" rows={8} value={csvText} onChange={(e) => setCsvText(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
              <button type="button" className="btn-secondary" onClick={previewCsv}>Previsualizar CSV</button>
              <button type="button" className="btn-secondary" onClick={importCsv}>Importar CSV</button>
            </div>
            {preview ? (
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                  {[
                    ['Filas', preview.totalRows],
                    ['Claras', preview.readyToCreate],
                    ['Review', preview.needsReview],
                    ['Duplicadas', preview.duplicateCount],
                    ['Invalidas', preview.invalidCount],
                  ].map(([label, value]) => (
                    <div key={String(label)} style={{ padding: '10px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</div>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                {preview.rows.slice(0, 12).map((row) => (
                  <div key={`${row.rowNumber}-${row.supplierProductName}`} style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                    Fila {row.rowNumber} | {row.status} | {row.supplierName || 'sin proveedor'} | {row.supplierProductName || row.procurementMaterialCode || 'sin producto'} | {row.mappingReason}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className={`glass-panel ${styles.panel}`}>
            <h2 className={styles.panelTitle}>Alta manual de oferta</h2>
            <form onSubmit={submitManual} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Proveedor</label>
                <select className="input-modern" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                  <option value="">Seleccionar proveedor</option>
                  {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Material interno</label>
                <select className="input-modern" value={form.materialId} onChange={(e) => setForm({ ...form, materialId: e.target.value })}>
                  <option value="">Mapping automatico o pendiente</option>
                  {materials.map((material) => <option key={material.id} value={material.id}>{material.code ? `[${material.code}] ` : ''}{material.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Procurement code</label>
                <input className="input-modern" value={form.procurementMaterialCode} onChange={(e) => setForm({ ...form, procurementMaterialCode: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label>Producto proveedor</label>
                <input className="input-modern" value={form.supplierProductName} onChange={(e) => setForm({ ...form, supplierProductName: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label>Referencia proveedor</label>
                <input className="input-modern" value={form.supplierProductRef} onChange={(e) => setForm({ ...form, supplierProductRef: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label>Almacen / warehouse</label>
                <input className="input-modern" value={form.warehouseLabel} onChange={(e) => setForm({ ...form, warehouseLabel: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label>Unidad</label>
                <input className="input-modern" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label>Coste unitario</label>
                <input type="number" className="input-modern" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label>Lead time (dias)</label>
                <input type="number" className="input-modern" value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label>Valid until</label>
                <input type="date" className="input-modern" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label>Estado</label>
                <select className="input-modern" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="ACTIVA">ACTIVA</option>
                  <option value="PAUSADA">PAUSADA</option>
                  <option value="EXPIRADA">EXPIRADA</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={form.isPreferred} onChange={(e) => setForm({ ...form, isPreferred: e.target.checked })} />
                  Preferred
                </label>
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-primary">{editingOfferId ? 'Actualizar oferta' : 'Guardar oferta'}</button>
              </div>
            </form>
          </div>

          <div className={`glass-panel ${styles.panel}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <h2 className={styles.panelTitle} style={{ marginBottom: 0 }}>Catalogo de ofertas cargadas</h2>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <input type="checkbox" checked={needsReviewOnly} onChange={(e) => setNeedsReviewOnly(e.target.checked)} />
                Solo review
              </label>
            </div>
            {isLoading ? (
              <p className={styles.panelDesc}>Cargando ofertas...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {offers.map((offer) => (
                  <div key={offer.id} style={{ padding: '14px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <strong>{offer.supplier?.name} | {offer.supplierProductName || offer.material?.name || offer.procurementMaterialCode}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {fmtMoney(offer.unitCost)}/{offer.unit} | {offer.leadTimeDays} d | {offer.status}{offer.isActive === false ? ' | Inactiva' : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      Mapping: {offer.mappingStatus} | {offer.mappingReason || 'sin detalle'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Material interno: {offer.material?.code ? `[${offer.material.code}] ` : ''}{offer.material?.name || offer.procurementMaterialCode || 'pendiente'}
                      {offer.supplierProductRef ? ` | Ref: ${offer.supplierProductRef}` : ''}
                      {offer.warehouseLabel ? ` | Warehouse: ${offer.warehouseLabel}` : ''}
                      {offer.intakeSource ? ` | Fuente: ${offer.intakeSource}` : ''}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setEditingOfferId(offer.id);
                          setForm({
                            supplierId: offer.supplier?.id || '',
                            materialId: offer.material?.id || '',
                            procurementMaterialCode: offer.procurementMaterialCode || '',
                            supplierProductName: offer.supplierProductName || '',
                            supplierProductRef: offer.supplierProductRef || '',
                            warehouseLabel: offer.warehouseLabel || '',
                            unit: offer.unit,
                            unitCost: String(offer.unitCost),
                            leadTimeDays: String(offer.leadTimeDays),
                            status: offer.status,
                            isPreferred: offer.isPreferred,
                            validUntil: offer.validUntil ? new Date(offer.validUntil).toISOString().slice(0, 10) : '',
                          });
                        }}
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
