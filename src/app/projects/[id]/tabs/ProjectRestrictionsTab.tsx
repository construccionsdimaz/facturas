"use client";

import { useState, useEffect } from 'react';
import styles from '@/app/invoices/page.module.css';

interface Restriction {
  id: string;
  title: string;
  type: string;
  description: string;
  priority: 'CRITICA' | 'ALTA' | 'MEDIA' | 'MENOR';
  status: string;
  responsible: string;
  targetDate: string;
  impact: string;
  projectActivity?: { id: string; name: string; code: string };
  location?: { id: string; name: string };
  wbs?: { id: string; name: string };
  createdAt: string;
}

export default function ProjectRestrictionsTab({ projectId }: { projectId: string }) {
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Data for selects
  const [activities, setActivities] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [wbsItems, setWbsItems] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState<any>({
    title: '',
    type: 'SUMINISTROS',
    description: '',
    priority: 'MEDIA',
    status: 'DETECTADA',
    responsible: '',
    targetDate: '',
    projectActivityId: '',
    locationId: '',
    wbsId: '',
    impact: 'BLOQUEA ARRANQUE'
  });

  useEffect(() => {
    fetchData();
    fetchHelpers();
  }, [projectId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/restrictions`);
      if (res.ok) setRestrictions(await res.json());
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/projects/${projectId}/restrictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({ title: '', type: 'SUMINISTROS', description: '', priority: 'MEDIA', status: 'DETECTADA', responsible: '', targetDate: '', projectActivityId: '', locationId: '', wbsId: '', impact: 'BLOQUEA ARRANQUE' });
        fetchData();
      }
    } catch (err) { alert("Error al guardar restricción"); }
  };

  const deleteRestriction = async (id: string) => {
    if (!confirm("¿Eliminar esta restricción?")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/restrictions/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/restrictions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Escaneando bloqueos operativos...</div>;

  const totalActive = restrictions.filter(r => r.status !== 'RESUELTA' && r.status !== 'CERRADA').length;
  const critical = restrictions.filter(r => r.priority === 'CRITICA' && (r.status !== 'RESUELTA' && r.status !== 'CERRADA')).length;
  const overdue = restrictions.filter(r => r.targetDate && new Date(r.targetDate) < new Date() && (r.status !== 'RESUELTA' && r.status !== 'CERRADA')).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Resumen Ejecutivo de Salud de Obra */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: totalActive > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{totalActive}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Restricciones Activas</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', borderColor: critical > 0 ? '#ef4444' : 'transparent' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: critical > 0 ? '#ef4444' : 'var(--text-muted)' }}>{critical}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>🔴 Críticas (Bloqueo Total)</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: overdue > 0 ? '#f59e0b' : 'var(--text-muted)' }}>{overdue}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>⚠️ Vencidas (Fuera de fecha)</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
           <button className="btn-primary" style={{ width: '100%', height: '100%', fontSize: '16px' }} onClick={() => setShowModal(true)}>
             + Nueva Restricción
           </button>
        </div>
      </div>

      {/* Lista de Restricciones */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 20px 0' }}>📂 Log de Bloqueos y Condicionantes</h3>
        
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Restricción</th>
                <th>Dimensión / Vínculo</th>
                <th>Prioridad</th>
                <th>Responsable</th>
                <th>Meta</th>
                <th>Estado</th>
                <th style={{textAlign:'right'}}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {restrictions.length === 0 ? (
                <tr><td colSpan={7} style={{textAlign:'center', padding: '40px', color: 'var(--text-muted)'}}>No hay restricciones registradas. El camino está despejado.</td></tr>
              ) : restrictions.map(r => (
                <tr key={r.id} style={{ opacity: (r.status === 'RESUELTA' || r.status === 'CERRADA') ? 0.6 : 1 }}>
                  <td>
                    <div style={{ fontWeight: '600', color: (r.status === 'RESUELTA' || r.status === 'CERRADA') ? 'var(--text-muted)' : 'var(--text-primary)' }}>{r.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.type} | {r.impact}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '11px' }}>
                      {r.projectActivity && <div style={{ color: 'var(--accent-primary)' }}>⚡ {r.projectActivity.name}</div>}
                      {r.location && <div style={{ color: 'var(--text-secondary)' }}>📍 {r.location.name}</div>}
                      {r.wbs && <div style={{ color: 'var(--text-muted)' }}>📂 {r.wbs.name}</div>}
                      {!r.projectActivity && !r.location && !r.wbs && <span style={{color:'var(--text-muted)'}}>Gral. Obra</span>}
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold',
                      background: r.priority === 'CRITICA' ? 'rgba(239, 68, 68, 0.1)' : r.priority === 'ALTA' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.05)',
                      color: r.priority === 'CRITICA' ? '#ef4444' : r.priority === 'ALTA' ? '#f59e0b' : 'var(--text-secondary)'
                    }}>
                      {r.priority}
                    </span>
                  </td>
                  <td><span style={{fontSize:'12px'}}>{r.responsible || 'Sin asignar'}</span></td>
                  <td>
                    <div style={{ fontSize: '12px', color: (r.targetDate && new Date(r.targetDate) < new Date() && r.status !== 'RESUELTA') ? '#ef4444' : 'inherit' }}>
                      {r.targetDate ? new Date(r.targetDate).toLocaleDateString() : '-'}
                    </div>
                  </td>
                  <td>
                    <select 
                      style={{ fontSize: '11px', padding: '4px', background: 'rgba(0,0,0,0.2)', color: '#fff', border: 'none', borderRadius: '4px' }}
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value)}
                    >
                      <option value="DETECTADA">DETECTADA</option>
                      <option value="EN_GESTION">EN GESTIÓN</option>
                      <option value="RESUELTA">RESUELTA</option>
                      <option value="CERRADA">CERRADA</option>
                    </select>
                  </td>
                  <td style={{textAlign:'right'}}>
                    <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', color: '#ef4444' }} onClick={() => deleteRestriction(r.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nueva Restricción */}
      {showModal && (
        <div className="modal-backdrop" style={{ zIndex: 120 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '600px' }}>
            <h2 style={{ marginBottom: '20px' }}>Registrar Nuevo Bloqueo</h2>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="formGroup" style={{ gridColumn: 'span 2' }}>
                <label>Título de la Restricción</label>
                <input className="input-modern" required placeholder="Ej: Retraso suministro perfiles pladur" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} />
              </div>

              <div className="formGroup">
                <label>Tipo de Condicionante</label>
                <select className="input-modern" value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})}>
                  <option value="SUMINISTROS">Compras / Materiales</option>
                  <option value="DOCUMENTACION">Planos / Documentación</option>
                  <option value="DECISIONES">Decisiones Cliente/DF</option>
                  <option value="PERMISOS">Permisos / Legal</option>
                  <option value="FRENTE">Frente no liberado</option>
                  <option value="PERSONAL">Recursos Humanos</option>
                  <option value="SUBCONTRATAS">Subcontratas</option>
                  <option value="MAQUINARIA">Maquinaria</option>
                  <option value="OTROS">Otros</option>
                </select>
              </div>

              <div className="formGroup">
                <label>Prioridad</label>
                <select className="input-modern" value={formData.priority} onChange={e=>setFormData({...formData, priority: e.target.value})}>
                  <option value="CRITICA">CRÍTICA (Bloqueo Total)</option>
                  <option value="ALTA">ALTA (Riesgo alto)</option>
                  <option value="MEDIA">MEDIA</option>
                  <option value="MENOR">MENOR</option>
                </select>
              </div>

              <div className="formGroup">
                <label>Referencia WBS (Capítulo)</label>
                <select className="input-modern" value={formData.wbsId} onChange={e=>setFormData({...formData, wbsId: e.target.value})}>
                  <option value="">Ninguno</option>
                  {wbsItems.map(w => <option key={w.id} value={w.id}>{w.code} {w.name}</option>)}
                </select>
              </div>

              <div className="formGroup">
                <label>Referencia Ubicación</label>
                <select className="input-modern" value={formData.locationId} onChange={e=>setFormData({...formData, locationId: e.target.value})}>
                  <option value="">Ninguna</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div className="formGroup" style={{ gridColumn: 'span 2' }}>
                <label>Actividad Específica Afectada</label>
                <select className="input-modern" value={formData.projectActivityId} onChange={e=>setFormData({...formData, projectActivityId: e.target.value})}>
                  <option value="">Cualquier actividad de la zona/capítulo</option>
                  {activities.map(a => <option key={a.id} value={a.id}>[{a.code || 'S/N'}] {a.name}</option>)}
                </select>
              </div>

              <div className="formGroup">
                <label>Responsable de Resolución</label>
                <input className="input-modern" placeholder="Nombre o Cargo" value={formData.responsible} onChange={e=>setFormData({...formData, responsible: e.target.value})} />
              </div>

              <div className="formGroup">
                <label>Fecha Límite</label>
                <input type="date" className="input-modern" value={formData.targetDate} onChange={e=>setFormData({...formData, targetDate: e.target.value})} />
              </div>

              <div className="formGroup" style={{ gridColumn: 'span 2' }}>
                <label>Descripción / Observaciones</label>
                <textarea className="input-modern" rows={3} value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Registrar Restricción</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
