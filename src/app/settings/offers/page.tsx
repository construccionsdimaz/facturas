"use client";

import { useEffect, useState } from 'react';
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
  unit: string;
  unitCost: number;
  leadTimeDays: number;
  status: string;
  isPreferred: boolean;
  mappingStatus: string;
  mappingReason?: string | null;
  intakeSource: string;
  validUntil?: string | null;
  supplier?: { id: string; name: string } | null;
  material?: { id: string; code?: string | null; name: string } | null;
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

export default function SupplierOffersSettingsPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [csvText, setCsvText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);
    try {
      const [offersRes, materialsRes, suppliersRes] = await Promise.all([
        fetch(`/api/material-offers?includeInactive=true${needsReviewOnly ? '&needsReview=true' : ''}`),
        fetch('/api/materials'),
        fetch('/api/suppliers'),
      ]);
      if (offersRes.ok) setOffers(await offersRes.json());
      if (materialsRes.ok) setMaterials(await materialsRes.json());
      if (suppliersRes.ok) setSuppliers(await suppliersRes.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [needsReviewOnly]);

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
    await loadData();
  }

  return (
    <div className={styles.settingsPage}>
      <div className={styles.header}>
        <div>
          <h1 className="text-gradient">Catalogo y Ofertas</h1>
          <p className={styles.subtitle}>Intake operativo de ofertas reales con mapping prudente a material interno.</p>
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
            <h2 className={styles.panelTitle}>Importacion CSV prudente</h2>
            <p className={styles.panelDesc}>Columnas soportadas: supplier, material/procurement code, product name, reference, unit, unit cost, lead time, status, preferred, valid until.</p>
            <textarea className="input-modern" rows={8} value={csvText} onChange={(e) => setCsvText(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="button" className="btn-secondary" onClick={importCsv}>Importar CSV</button>
            </div>
          </div>

          <div className={`glass-panel ${styles.panel}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <h2 className={styles.panelTitle} style={{ marginBottom: 0 }}>Ofertas cargadas</h2>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <input type="checkbox" checked={needsReviewOnly} onChange={(e) => setNeedsReviewOnly(e.target.checked)} />
                Solo pendientes de review
              </label>
            </div>
            {message && <p className={styles.panelDesc}>{message}</p>}
            {isLoading ? (
              <p className={styles.panelDesc}>Cargando ofertas...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {offers.map((offer) => (
                  <div key={offer.id} style={{ padding: '14px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <strong>{offer.supplier?.name} | {offer.supplierProductName || offer.material?.name || offer.procurementMaterialCode}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {offer.unitCost.toFixed(2)} EUR/{offer.unit} | {offer.leadTimeDays} d | {offer.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      Mapping: {offer.mappingStatus} | {offer.mappingReason || 'sin detalle'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Material interno: {offer.material?.code ? `[${offer.material.code}] ` : ''}{offer.material?.name || offer.procurementMaterialCode || 'pendiente'}
                      {offer.supplierProductRef ? ` | Ref: ${offer.supplierProductRef}` : ''}
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
                            warehouseLabel: '',
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
