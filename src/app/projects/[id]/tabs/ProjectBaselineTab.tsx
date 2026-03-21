"use client";

import { useState, useEffect } from 'react';
import styles from '@/app/invoices/page.module.css';

interface Baseline {
  id: string;
  name: string;
  description?: string;
  responsible?: string;
  status: string;
  snapshotData: any;
  createdAt: string;
}

interface ChangeRequest {
  id: string;
  title: string;
  description?: string;
  reason: string;
  impact?: string;
  priority: string;
  status: string;
  requestedDate: string;
  approvedDate?: string;
  responsible?: string;
  observations?: string;
}

export default function ProjectBaselineTab({ projectId }: { projectId: string }) {
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBaselineModal, setShowBaselineModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);

  const [baselineForm, setBaselineForm] = useState({ name: '', description: '', responsible: '' });
  const [changeForm, setChangeForm] = useState({
    title: '', description: '', reason: 'ALCANCE', impact: 'PLAZO', priority: 'MEDIA', status: 'PROPUESTO', responsible: '', observations: ''
  });

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [bRes, cRes, aRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/baselines`),
        fetch(`/api/projects/${projectId}/changes`),
        fetch(`/api/projects/${projectId}/activities`)
      ]);
      if (bRes.ok) setBaselines(await bRes.json());
      if (cRes.ok) setChanges(await cRes.json());
      if (aRes.ok) setActivities(await aRes.json());
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const createBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/projects/${projectId}/baselines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baselineForm)
      });
      if (res.ok) {
        setShowBaselineModal(false);
        setBaselineForm({ name: '', description: '', responsible: '' });
        fetchData();
      }
    } catch (e) { alert("Error al fijar baseline"); }
  };

  const createChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/projects/${projectId}/changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changeForm)
      });
      if (res.ok) {
        setShowChangeModal(false);
        setChangeForm({ title: '', description: '', reason: 'ALCANCE', impact: 'PLAZO', priority: 'MEDIA', status: 'PROPUESTO', responsible: '', observations: '' });
        fetchData();
      }
    } catch (e) { alert("Error al registrar cambio"); }
  };

  const updateChangeStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/changes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const deleteChange = async (id: string) => {
    if (!confirm("¿Eliminar este registro de cambio?")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/changes/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando memoria del proyecto...</div>;

  const activeBaseline = baselines.find(b => b.status === 'VIGENTE') || baselines[0];
  
  // Basic Deviation logic
  let delayedActivitiesCount = 0;
  if (activeBaseline && activeBaseline.snapshotData) {
    activities.forEach(act => {
      const bAct = (activeBaseline.snapshotData as any[]).find(ba => ba.id === act.id);
      if (bAct && act.plannedEndDate && bAct.plannedEndDate) {
        if (new Date(act.plannedEndDate) > new Date(bAct.plannedEndDate)) {
          delayedActivitiesCount++;
        }
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Dashboard de Control */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Baseline Vigente</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{activeBaseline ? activeBaseline.name : 'No fijada'}</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Desviaciones vs Ref.</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: delayedActivitiesCount > 0 ? '#ef4444' : 'var(--accent-primary)' }}>{delayedActivitiesCount}</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cambios Pendientes</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>{changes.filter(c => c.status === 'PROPUESTO' || c.status === 'REVISADO').length}</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Estabilidad del Plan</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{delayedActivitiesCount === 0 ? 'ALTA' : delayedActivitiesCount < 5 ? 'MEDIA' : 'BAJA'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Sección de Baselines */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>📸 Historial de Baselines (FOTOS)</h3>
            <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setShowBaselineModal(true)}>Fijar Foto del Plan</button>
          </div>
          
          <div className={styles.tableContainer} style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre / Fecha</th>
                  <th>Responsable</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {baselines.length === 0 ? (
                  <tr><td colSpan={3} style={{textAlign:'center', padding: '20px', color: 'var(--text-muted)'}}>No hay baselines fijadas.</td></tr>
                ) : baselines.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: '600' }}>{b.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(b.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td>{b.responsible || '-'}</td>
                    <td><span className={`badge ${b.status === 'VIGENTE' ? 'badge-success' : 'badge-neutral'}`} style={{fontSize:'10px'}}>{b.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sección de Control de Cambios */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>📝 Registro de Control de Cambios</h3>
            <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setShowChangeModal(true)}>Registrar Cambio</button>
          </div>

          <div className={styles.tableContainer} style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cambio / Motivo</th>
                  <th>Impacto</th>
                  <th>Estado</th>
                  <th style={{textAlign:'right'}}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {changes.length === 0 ? (
                  <tr><td colSpan={4} style={{textAlign:'center', padding: '20px', color: 'var(--text-muted)'}}>No hay cambios registrados.</td></tr>
                ) : changes.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>{c.title}</div>
                      <div style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{c.reason}</div>
                    </td>
                    <td><span style={{fontSize:'11px'}}>{c.impact}</span></td>
                    <td>
                      <select 
                        style={{ fontSize: '10px', padding: '2px 4px', background: 'rgba(0,0,0,0.2)', color: '#fff', border: 'none', borderRadius: '4px' }}
                        value={c.status}
                        onChange={(e) => updateChangeStatus(c.id, e.target.value)}
                      >
                        <option value="PROPUESTO">PROPUESTO</option>
                        <option value="REVISADO">REVISADO</option>
                        <option value="APROBADO">APROBADO</option>
                        <option value="IMPLEMENTADO">IMPLEMENTADO</option>
                        <option value="RECHAZADO">RECHAZADO</option>
                      </select>
                    </td>
                    <td style={{textAlign:'right'}}>
                       <button style={{ background: 'none', border: 'none', fontSize: '12px', cursor: 'pointer' }} onClick={() => deleteChange(c.id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal Baseline */}
      {showBaselineModal && (
        <div className="modal-backdrop" style={{ zIndex: 120 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <h2>Fijar Foto del Plan (Baseline)</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Esto guardará el estado actual de todas las actividades. Podrás comparar desviaciones más adelante.
            </p>
            <form onSubmit={createBaseline} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="formGroup">
                <label>Nombre de la Referencia</label>
                <input className="input-modern" required placeholder="Ej: Baseline Inicial Aprobada" value={baselineForm.name} onChange={e=>setBaselineForm({...baselineForm, name: e.target.value})} />
              </div>
              <div className="formGroup">
                <label>Responsable</label>
                <input className="input-modern" placeholder="Nombre" value={baselineForm.responsible} onChange={e=>setBaselineForm({...baselineForm, responsible: e.target.value})} />
              </div>
              <div className="formGroup">
                <label>Descripción / Notas</label>
                <textarea className="input-modern" value={baselineForm.description} onChange={e=>setBaselineForm({...baselineForm, description: e.target.value})} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowBaselineModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Congelar Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cambio */}
      {showChangeModal && (
        <div className="modal-backdrop" style={{ zIndex: 120 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '600px' }}>
            <h2>Registrar Control de Cambio</h2>
            <form onSubmit={createChange} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="formGroup" style={{ gridColumn: 'span 2' }}>
                <label>Título del Cambio</label>
                <input className="input-modern" required placeholder="Ej: Reordenación zona jardines tras hallazgo" value={changeForm.title} onChange={e=>setChangeForm({...changeForm, title: e.target.value})} />
              </div>
              <div className="formGroup">
                <label>Motivo</label>
                <select className="input-modern" value={changeForm.reason} onChange={e=>setChangeForm({...changeForm, reason: e.target.value})}>
                  <option value="ALCANCE">Cambio de Alcance (Cliente)</option>
                  <option value="TECNICO">Necesidad Técnica / Error</option>
                  <option value="SUMINISTRO">Retraso Suministros</option>
                  <option value="OPERATIVO">Reordenación Operativa</option>
                  <option value="RESTRICCION">Restricción Sobrevienida</option>
                </select>
              </div>
              <div className="formGroup">
                <label>Impacto Principal</label>
                <select className="input-modern" value={changeForm.impact} onChange={e=>setChangeForm({...changeForm, impact: e.target.value})}>
                  <option value="PLAZO">Plazo (Días adicionales)</option>
                  <option value="SECUENCIA">Secuencia (Cambio de orden)</option>
                  <option value="COSTE">Coste (Aumento presupuesto)</option>
                  <option value="CRITICO">Hito Crítico</option>
                </select>
              </div>
              <div className="formGroup">
                <label>Prioridad</label>
                <select className="input-modern" value={changeForm.priority} onChange={e=>setChangeForm({...changeForm, priority: e.target.value})}>
                  <option value="CRITICA">Crítica</option>
                  <option value="ALTA">Alta</option>
                  <option value="MEDIA">Media</option>
                  <option value="BAJA">Baja</option>
                </select>
              </div>
              <div className="formGroup">
                <label>Responsable</label>
                <input className="input-modern" value={changeForm.responsible} onChange={e=>setChangeForm({...changeForm, responsible: e.target.value})} />
              </div>
              <div className="formGroup" style={{ gridColumn: 'span 2' }}>
                <label>Descripción del Cambio e Impacto Esperado</label>
                <textarea className="input-modern" rows={3} value={changeForm.description} onChange={e=>setChangeForm({...changeForm, description: e.target.value})} />
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowChangeModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Registrar Cambio</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
