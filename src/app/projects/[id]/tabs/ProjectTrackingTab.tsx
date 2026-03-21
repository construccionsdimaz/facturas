"use client";

import { useState, useEffect } from 'react';
import styles from '@/app/invoices/page.module.css';

export default function ProjectTrackingTab({ projectId }: { projectId: string }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal tracking
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [newLog, setNewLog] = useState({ progressReported: 0, statusReported: 'EN_CURSO', executionNotes: '', incidences: '' });
  const [activeRestrictions, setActiveRestrictions] = useState<any[]>([]);

  useEffect(() => {
    fetchSnapshot();
    fetchRestrictions();
  }, [projectId]);

  const fetchSnapshot = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tracking`);
      if(res.ok) {
        setActivities(await res.json());
      }
    } catch(e) { console.error(e); }
    setIsLoading(false);
  };

  const fetchRestrictions = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/restrictions?status=DETECTADA`); 
      if(res.ok) setActiveRestrictions(await res.json());
    } catch(e) { console.error(e); }
  };

  const handleOpenTrackingModal = async (act: any) => {
    setSelectedActivity(act);
    setNewLog({
      progressReported: act.realProgress || 0,
      statusReported: act.realStatus || 'EN_CURSO',
      executionNotes: '',
      incidences: ''
    });
    
    // fetch past logs
    try {
      const res = await fetch(`/api/projects/${projectId}/tracking/${act.id}`);
      if(res.ok) setLogs(await res.json());
    } catch(e) { console.error(e); }
  };

  const handleSubmitNovedad = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!selectedActivity) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/tracking/${selectedActivity.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog)
      });
      if(res.ok) {
        setSelectedActivity(null);
        fetchSnapshot();
      }
    } catch(err) {
      alert("Error reportando seguimiento");
    }
  };

  if(isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Capturando realidad de la obra...</div>;

  const total = activities.length;
  const enCurso = activities.filter(a => a.realStatus === 'EN_CURSO').length;
  const terminadas = activities.filter(a => a.realStatus === 'TERMINADA').length;
  const bloqueadas = activities.filter(a => a.realStatus === 'BLOQUEADA').length;

  const globalProgress = total === 0 ? 0 : Math.round(activities.reduce((acc, a) => acc + (a.realProgress || 0), 0) / total);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Dashboard KPI Supremo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{globalProgress}%</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Progreso Físico Global</div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.1)' }}>
            <div style={{ height: '100%', background: 'var(--accent-primary)', width: `${globalProgress}%` }}></div>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{terminadas}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Actividades Terminadas</div>
        </div>
        
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>{enCurso}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Trabajos Activos (En Curso)</div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', borderColor: bloqueadas > 0 ? '#ef4444' : 'transparent' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: bloqueadas > 0 ? '#ef4444' : 'var(--text-muted)' }}>{bloqueadas}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Frentes Bloqueados</div>
        </div>
      </div>

      {/* Grilla Contrasting (Teórico vs Real) */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 20px 0' }}>📋 Matriz de Verdad de Obra</h3>
        
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{minWidth:'250px'}}>Actividad Física</th>
                <th>Tiempos (Previsto / Real)</th>
                <th>Compromiso Semanal</th>
                <th style={{ width: '200px' }}>Barra de Avance Real</th>
                <th>Estado</th>
                <th style={{textAlign:'right'}}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {activities.map(act => (
                <tr key={act.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>{act.name}</div>
                      {activeRestrictions.some(r => r.projectActivityId === act.id) && (
                        <span title="Esta actividad tiene restricciones activas" style={{ cursor: 'help' }}>⚠️</span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                      <span>[{act.code || 'S/N'}]</span>
                      {act.wbs && <span>📂 {act.wbs.name}</span>}
                      {act.location && <span>📍 {act.location.name}</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>M: </span>
                      {act.plannedStartDate ? new Date(act.plannedStartDate).toLocaleDateString() : '??'} - {act.plannedEndDate ? new Date(act.plannedEndDate).toLocaleDateString() : '??'}
                    </div>
                    {(act.realStartDate || act.realEndDate) && (
                      <div style={{ fontSize: '12px', marginTop: '2px', color: 'var(--accent-primary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>R: </span>
                        {act.realStartDate ? new Date(act.realStartDate).toLocaleDateString() : '??'} - {act.realEndDate ? new Date(act.realEndDate).toLocaleDateString() : '---'}
                      </div>
                    )}
                  </td>
                  <td>
                    {act.weeklyPlanInclusions?.length > 0 ? (
                      <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '4px 8px', borderRadius: '4px' }}>
                        En Plan Activo (x{act.weeklyPlanInclusions.length})
                      </span>
                    ) : <span style={{ color:'var(--text-muted)', fontSize: '11px' }}>- - -</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: act.realStatus === 'TERMINADA' ? '#10b981' : 'var(--accent-primary)', width: `${act.realProgress || 0}%` }}></div>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', width: '35px', textAlign: 'right', color: act.realStatus === 'TERMINADA' ? '#10b981' : 'inherit' }}>
                        {act.realProgress || 0}%
                      </span>
                    </div>
                  </td>
                  <td>
                     <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', background: 'rgba(255,255,255,0.05)', color: act.realStatus === 'BLOQUEADA' ? '#ef4444' : act.realStatus === 'EN_CURSO' ? '#3b82f6' : act.realStatus === 'TERMINADA' ? '#10b981' : 'var(--text-muted)' }}>
                        {act.realStatus || 'NO INICIADA'}
                     </span>
                  </td>
                  <td style={{textAlign:'right'}}>
                    <button className="btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => handleOpenTrackingModal(act)}>
                      Reportar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Trazador de Historial y Actualización */}
      {selectedActivity && (
        <div className="modal-backdrop" style={{ zIndex: 110 }}>
          <div className="modal-content glass-panel" style={{ width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
              <h2 style={{ margin: '0 0 4px 0' }}>Reportar Progreso Real</h2>
              <div style={{ color: 'var(--text-secondary)' }}>{selectedActivity.name} [{selectedActivity.code || 'S/N'}]</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
              
              {/* Formulario Novedad Táctica */}
              <form onSubmit={handleSubmitNovedad} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="formGroup">
                  <label>Porcentaje Real Alcanzado</label>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      style={{ flex: 1, accentColor: 'var(--accent-primary)' }} 
                      value={newLog.progressReported} 
                      onChange={e=>setNewLog({...newLog, progressReported: Number(e.target.value)})} 
                      disabled={newLog.statusReported === 'TERMINADA'}
                    />
                    <span style={{ fontWeight: 'bold', fontSize: '18px', width: '50px', textAlign: 'right' }}>
                      {newLog.statusReported === 'TERMINADA' ? 100 : newLog.progressReported}%
                    </span>
                  </div>
                </div>

                <div className="formGroup">
                  <label>Estado Trinchera</label>
                  <select 
                    className="input-modern" 
                    value={newLog.statusReported} 
                    onChange={e=>{
                      const val = e.target.value;
                      setNewLog({...newLog, statusReported: val, progressReported: val === 'TERMINADA' ? 100 : newLog.progressReported})
                    }}>
                    <option value="NO_INICIADA">No Iniciada Aún</option>
                    <option value="EN_CURSO">En Curso (Avanzando)</option>
                    <option value="PAUSADA">Pausada (Por logística interna)</option>
                    <option value="BLOQUEADA">Bloqueada (Por terceros / Ajeno)</option>
                    <option value="TERMINADA">Terminada (Ejecución 100%)</option>
                    <option value="CANCELADA">Cancelada definitivamente</option>
                  </select>
                </div>

                <div className="formGroup">
                  <label>Incidencias / Bloqueos Encontrados</label>
                  <textarea 
                    className="input-modern" 
                    rows={2} 
                    placeholder="Ej: El suministro de acero no llegó hoy..."
                    value={newLog.incidences} 
                    onChange={e=>setNewLog({...newLog, incidences: e.target.value})} 
                  />
                </div>

                <div className="formGroup">
                  <label>Notas de Ejecución / Calidad</label>
                  <textarea 
                    className="input-modern" 
                    rows={2} 
                    placeholder="Ej: Se completó la primera capa. Faltan repasos."
                    value={newLog.executionNotes} 
                    onChange={e=>setNewLog({...newLog, executionNotes: e.target.value})} 
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                  <button type="button" className="btn-secondary" onClick={()=>setSelectedActivity(null)}>Volver</button>
                  <button type="submit" className="btn-primary">Firmar Reporte Real</button>
                </div>
              </form>

              {/* Historico / Trazabilidad Lateral */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', overflowY: 'auto', maxHeight: '420px' }}>
                <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>Historial (Trazabilidad)</h4>
                
                {logs.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No existe memoria de vida en esta actividad.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {logs.map((L: any, i: number) => (
                      <div key={L.id} style={{ fontSize: '12px', position: 'relative', paddingLeft: '16px', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ position: 'absolute', left: '-5px', top: '2px', width: '8px', height: '8px', borderRadius: '50%', background: L.statusReported === 'TERMINADA' ? '#10b981' : L.statusReported==='BLOQUEADA' ? '#ef4444' : 'var(--text-muted)' }}></div>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          {new Date(L.reportDate).toLocaleDateString()} - <span style={{color:'#fff'}}>{L.progressReported}%</span> ({L.statusReported})
                        </div>
                        {L.incidences && <div style={{ color: '#ef4444', marginBottom: '2px' }}>🚨 {L.incidences}</div>}
                        {L.executionNotes && <div style={{ color: 'var(--text-muted)' }}>✏️ {L.executionNotes}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
