"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react';
import styles from '@/app/invoices/page.module.css';

interface Supply {
  id: string;
  description: string;
  category: string;
  requiredOnSiteDate: string;
  leadTimeDays: number;
  orderDate: string;
  priority: 'CRITICA' | 'ALTA' | 'NORMAL' | 'APOYO';
  status: string;
  responsible: string;
  quantity?: number;
  unit?: string;
  projectActivity?: { id: string; name: string; code: string; plannedStartDate: string };
  location?: { id: string; name: string };
  wbs?: { id: string; name: string; code: string };
  observations?: string;
}

export default function ProjectProcurementTab({ projectId }: { projectId: string }) {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [autoSource, setAutoSource] = useState<'estimate' | 'activities' | 'hybrid'>('estimate');

  // Form helpers
  const [activities, setActivities] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [wbsItems, setWbsItems] = useState<any[]>([]);

  const [formData, setFormData] = useState<any>({
    description: '',
    category: 'ACABADOS',
    priority: 'NORMAL',
    status: 'IDENTIFICADA',
    responsible: '',
    requiredOnSiteDate: '',
    leadTimeDays: 0,
    projectActivityId: '',
    locationId: '',
    wbsId: '',
    quantity: '',
    unit: '',
    observations: ''
  });

  useEffect(() => {
    fetchData();
    fetchHelpers();
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
      const [actRes, locRes, wbsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/activities`),
        fetch(`/api/projects/${projectId}/locations`),
        fetch(`/api/projects/${projectId}/wbs`)
      ]);
      if (actRes.ok) setActivities(await actRes.json());
      if (locRes.ok) setLocations(await locRes.json());
      if (wbsRes.ok) setWbsItems(await wbsRes.json());
    } catch (e) { console.error(e); }
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
          useEstimate: autoSource !== 'activities',
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudieron generar los suministros');
      }

      await fetchData();
      alert('Suministros automaticos generados');
    } catch (error: any) {
      alert(error.message || 'Error generando suministros');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/projects/${projectId}/supplies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({ description: '', category: 'ACABADOS', priority: 'NORMAL', status: 'IDENTIFICADA', responsible: '', requiredOnSiteDate: '', leadTimeDays: 0, projectActivityId: '', locationId: '', wbsId: '', quantity: '', unit: '', observations: '' });
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
  const delayed = supplies.filter(s => {
    if (s.status === 'RECIBIDA') return false;
    if (!s.requiredOnSiteDate) return false;
    return new Date(s.requiredOnSiteDate) < new Date();
  }).length;
  const received = supplies.filter(s => s.status === 'RECIBIDA').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Dashboard Logístico */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{total}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Suministros Ligados</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', borderColor: critical > 0 ? '#ef4444' : 'transparent' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: critical > 0 ? '#ef4444' : 'var(--accent-primary)' }}>{critical}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>📦 Críticos Pendientes</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', borderColor: delayed > 0 ? '#f59e0b' : 'transparent' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: delayed > 0 ? '#f59e0b' : 'inherit' }}>{delayed}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>⚠️ Fuera de Plazo Obra</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{received}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>✅ Recibidos / Listos</div>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
        <select className="input-modern" value={autoSource} onChange={(e) => setAutoSource(e.target.value as any)} style={{ minWidth: '220px' }}>
          <option value="estimate">Desde presupuesto</option>
          <option value="activities">Desde cronograma</option>
          <option value="hybrid">Presupuesto + cronograma</option>
        </select>
        <button className="btn-secondary" onClick={handleAutoGenerateSupplies}>Generar compras automaticas</button>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Nueva Necesidad de Suministro</button>
      </div>

      {/* Matriz de Abastecimiento Operativo */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 20px 0' }}>🚛 Control de Abastecimiento vs Ejecución</h3>
        
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Suministro / Material</th>
                <th>Vínculo Obra</th>
                <th>Responsable</th>
                <th>Meta en Obra</th>
                <th>Estado Logístico</th>
                <th>Plazo</th>
                <th style={{textAlign:'right'}}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {supplies.length === 0 ? (
                <tr><td colSpan={7} style={{textAlign:'center', padding: '40px', color: 'var(--text-muted)'}}>No hay suministros ligados al plazo registrados.</td></tr>
              ) : supplies.map(s => {
                const isDelayed = s.status !== 'RECIBIDA' && s.requiredOnSiteDate && new Date(s.requiredOnSiteDate) < new Date();
                return (
                  <tr key={s.id} style={{ opacity: s.status === 'RECIBIDA' ? 0.7 : 1 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontWeight: '600', color: s.priority === 'CRITICA' ? '#ef4444' : 'inherit' }}>{s.description}</div>
                        {isDelayed && <span title="¡Retraso Crítico! Ya debería estar en obra." style={{ cursor: 'help' }}>⚠️</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.category} | {s.quantity}{s.unit}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '11px' }}>
                        {s.projectActivity && <div style={{ color: 'var(--accent-primary)' }}>⚡ {s.projectActivity.name}</div>}
                        {s.location && <div style={{ color: 'var(--text-secondary)' }}>📍 {s.location.name}</div>}
                        {s.wbs && <div style={{ color: 'var(--text-muted)' }}>📂 {s.wbs.name}</div>}
                      </div>
                    </td>
                    <td><span style={{fontSize:'12px'}}>{s.responsible || '-'}</span></td>
                    <td>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: isDelayed ? '#ef4444' : 'inherit' }}>
                        {s.requiredOnSiteDate ? new Date(s.requiredOnSiteDate).toLocaleDateString() : 'Sin fecha'}
                      </div>
                      {s.projectActivity?.plannedStartDate && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Inicio act: {new Date(s.projectActivity.plannedStartDate).toLocaleDateString()}</div>
                      )}
                    </td>
                    <td>
                      <select 
                        style={{ fontSize: '11px', padding: '4px', background: 'rgba(0,0,0,0.2)', color: '#fff', border: 'none', borderRadius: '4px' }}
                        value={s.status}
                        onChange={(e) => updateStatus(s.id, e.target.value)}
                      >
                        <option value="IDENTIFICADA">IDENTIFICADA</option>
                        <option value="PENDIENTE">PENDIENTE DE PEDIR</option>
                        <option value="PEDIDA">PEDIDA / ENCARGADA</option>
                        <option value="CONFIRMADA">CONFIRMADA (Plazo OK)</option>
                        <option value="EN_TRANSITO">EN TRÁNSITO</option>
                        <option value="RECIBIDA">RECIBIDA EN OBRA</option>
                        <option value="RETRASADA">RETRASADA 🚨</option>
                      </select>
                    </td>
                    <td>
                       <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.leadTimeDays || 0} días</span>
                    </td>
                    <td style={{textAlign:'right'}}>
                      <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', color: '#ef4444' }} onClick={() => deleteSupply(s.id)}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Suministro */}
      {showModal && (
        <div className="modal-backdrop" style={{ zIndex: 120 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '650px' }}>
            <h2 style={{ marginBottom: '20px' }}>Vincular Suministro al Plazo</h2>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              
              <div className="formGroup" style={{ gridColumn: 'span 2' }}>
                <label>Descripción del Material / Elemento</label>
                <input className="input-modern" required placeholder="Ej: Suelo laminado roble AC5" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} />
              </div>

              <div className="formGroup">
                <label>Categoría</label>
                <select className="input-modern" value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})}>
                  <option value="ESTRUCTURA">Estructura</option>
                  <option value="CERRAMIENTOS">Cerramientos</option>
                  <option value="INSTALACIONES">Instalaciones</option>
                  <option value="ACABADOS">Acabados / Revestimientos</option>
                  <option value="MOBILIARIO">Mobiliario / Carpintería</option>
                  <option value="EQUIPOS">Equipos Especiales</option>
                  <option value="OTROS">Otros</option>
                </select>
              </div>

              <div className="formGroup">
                <label>Prioridad Logística</label>
                <select className="input-modern" value={formData.priority} onChange={e=>setFormData({...formData, priority: e.target.value})}>
                  <option value="CRITICA">CRÍTICA (Para la obra si no llega)</option>
                  <option value="ALTA">ALTA (Hito principal)</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="APOYO">APOYO / AUXILIAR</option>
                </select>
              </div>

              <div className="formGroup">
                <label>Vincular a Actividad (Cronograma)</label>
                <select className="input-modern" value={formData.projectActivityId} onChange={e=>setFormData({...formData, projectActivityId: e.target.value})}>
                  <option value="">Cualquier actividad</option>
                  {activities.map(a => <option key={a.id} value={a.id}>[{a.code || 'S/N'}] {a.name}</option>)}
                </select>
              </div>

              <div className="formGroup">
                <label>Vincular a Ubicación</label>
                <select className="input-modern" value={formData.locationId} onChange={e=>setFormData({...formData, locationId: e.target.value})}>
                  <option value="">Cualquier zona</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div className="formGroup">
                <label>Fecha Necesaria en Obra</label>
                <input type="date" className="input-modern" required value={formData.requiredOnSiteDate} onChange={e=>setFormData({...formData, requiredOnSiteDate: e.target.value})} />
              </div>

              <div className="formGroup">
                <label>Plazo Suministro (Días)</label>
                <input type="number" className="input-modern" placeholder="Días fabricación/envío" value={formData.leadTimeDays} onChange={e=>setFormData({...formData, leadTimeDays: e.target.value})} />
              </div>

              <div className="formGroup">
                <label>Cantidad Estimada</label>
                <input type="number" className="input-modern" value={formData.quantity} onChange={e=>setFormData({...formData, quantity: e.target.value})} />
              </div>

              <div className="formGroup">
                <label>Unidad (m2, ml, ud...)</label>
                <input className="input-modern" placeholder="ud" value={formData.unit} onChange={e=>setFormData({...formData, unit: e.target.value})} />
              </div>

              <div className="formGroup" style={{ gridColumn: 'span 2' }}>
                <label>Responsable de Gestión / Proveedor</label>
                <input className="input-modern" placeholder="Quién rinde cuentas" value={formData.responsible} onChange={e=>setFormData({...formData, responsible: e.target.value})} />
              </div>

              <div className="formGroup" style={{ gridColumn: 'span 2' }}>
                <label>Observaciones Logísticas</label>
                <textarea className="input-modern" rows={2} value={formData.observations} onChange={e=>setFormData({...formData, observations: e.target.value})} />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Registrar Necesidad</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
