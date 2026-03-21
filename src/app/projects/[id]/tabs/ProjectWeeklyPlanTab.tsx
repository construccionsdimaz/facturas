"use client";

import { useState, useEffect } from 'react';
import styles from '@/app/invoices/page.module.css';

export default function ProjectWeeklyPlanTab({ projectId }: { projectId: string }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [scheduleActivities, setScheduleActivities] = useState<any[]>([]); // For lookahead popup
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [showLookupModal, setShowLookupModal] = useState(false);

  // New plan state
  const [newPlan, setNewPlan] = useState({ weekName: '', startDate: '', endDate: '', generalManager: '' });

  useEffect(() => {
    fetchPlans();
  }, [projectId]);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/weekly-plans`);
      if(res.ok) {
        const data = await res.json();
        setPlans(data);
        if(!selectedPlanId && data.length > 0) {
          setSelectedPlanId(data[0].id);
        }
      }
    } catch(e) { console.error('Error', e); }
    setIsLoading(false);
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/projects/${projectId}/weekly-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlan)
      });
      if(res.ok) {
        const plan = await res.json();
        setShowNewPlanModal(false);
        setNewPlan({ weekName: '', startDate: '', endDate: '', generalManager: '' });
        setSelectedPlanId(plan.id);
        fetchPlans();
      }
    } catch(e) { alert('Error creando el plan'); }
  };

  const loadScheduleForLookup = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule`);
      if(res.ok) {
        const data = await res.json();
        setScheduleActivities(data);
        setShowLookupModal(true);
      }
    } catch(e) { alert('Error leyendo el cronograma maestro'); }
  };

  const handleAddActivitiesToPlan = async (selectedIds: string[]) => {
    if(!selectedPlanId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/weekly-plans/${selectedPlanId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectActivityIds: selectedIds })
      });
      if(res.ok) {
        setShowLookupModal(false);
        fetchPlans();
      }
    } catch(e) { alert('Error añadiendo tareas'); }
  };

  const handleDeletePlan = async (id: string) => {
    if(!confirm('¿Eliminar por completo este plan semanal y sus compromisos?')) return;
    try {
      await fetch(`/api/projects/${projectId}/weekly-plans/${id}`, { method: 'DELETE' });
      if(selectedPlanId === id) setSelectedPlanId(null);
      fetchPlans();
    } catch(e) { alert('Error borrando plan'); }
  };

  const updateActivityStatus = async (actId: string, payload: any) => {
    if(!selectedPlanId) return;
    try {
      await fetch(`/api/projects/${projectId}/weekly-plans/${selectedPlanId}/activities/${actId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      fetchPlans();
    } catch (e) { console.error(e); }
  };

  const handleRemoveActivity = async (actId: string) => {
    if(!selectedPlanId || !confirm('¿Quitar del plan semanal? Esta tarea seguirá existiendo en el Cronograma Maestro.')) return;
    try {
      await fetch(`/api/projects/${projectId}/weekly-plans/${selectedPlanId}/activities/${actId}`, {
        method: 'DELETE'
      });
      fetchPlans();
    } catch (e) { console.error(e); }
  };

  const statusColors: any = {
    'PENDIENTE': 'var(--text-muted)',
    'EN_CURSO': '#f59e0b',
    'COMPLETADA': '#10b981',
    'NO_INICIADA': '#ef4444',
    'BLOQUEADA': '#ef4444',
    'CANCELADA': '#ef4444',
    'INCOMPLETA': '#f59e0b'
  };

  const activePlan = plans.find(p => p.id === selectedPlanId);

  return (
    <div style={{ display: 'flex', gap: '24px', minHeight: '600px', alignItems: 'flex-start' }}>
      
      {/* Sidebar de Planes */}
      <div className="glass-panel" style={{ width: '280px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button className="btn-primary" onClick={() => setShowNewPlanModal(true)} style={{ width: '100%' }}>
          + Crear Plan Semanal
        </button>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '500px' }}>
          {plans.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>No existen planes operativos aún.</p>
          ) : plans.map(p => (
            <div 
              key={p.id} 
              onClick={() => setSelectedPlanId(p.id)}
              style={{ 
                padding: '12px', 
                borderRadius: '8px', 
                cursor: 'pointer',
                background: selectedPlanId === p.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
                border: selectedPlanId === p.id ? '1px solid transparent' : '1px solid rgba(255,255,255,0.05)',
                transition: 'all 0.2s',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px', color: selectedPlanId === p.id ? '#fff' : 'var(--text-primary)' }}>{p.weekName}</div>
                <div style={{ fontSize: '11px', color: selectedPlanId === p.id ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>{p.activities?.length || 0} tareas</div>
              </div>
              <div style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.2)' }}>
                {p.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visor Principal del Plan */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {!activePlan ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Selecciona o crea un Plan Semanal a la izquierda para poder gestionar su ejecución.
          </div>
        ) : (
          <>
            {/* Cabecera del plan */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  🗓️ {activePlan.weekName}
                  <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', verticalAlign: 'middle' }}>{activePlan.status}</span>
                </h2>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Período: {activePlan.startDate ? new Date(activePlan.startDate).toLocaleDateString() : '??'} al {activePlan.endDate ? new Date(activePlan.endDate).toLocaleDateString() : '??'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Responsable: {activePlan.generalManager || 'No especificado'}
                </div>
              </div>
              <button className="btn-secondary" style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeletePlan(activePlan.id)}>
                Eliminar Plan
              </button>
            </div>

            {/* Dashboard del Plan */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{activePlan.activities?.length || 0}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Compromisos Adquiridos</div>
              </div>
              <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{activePlan.activities?.filter((a:any)=>a.weeklyStatus==='COMPLETADA').length || 0}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Completadas Cumplidas</div>
              </div>
              <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', borderColor: activePlan.activities?.filter((a:any)=>a.weeklyStatus==='BLOQUEADA' || a.weeklyStatus==='CANCELADA').length > 0 ? '#ef4444' : 'transparent' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: activePlan.activities?.filter((a:any)=>a.weeklyStatus==='BLOQUEADA' || a.weeklyStatus==='CANCELADA').length > 0 ? '#ef4444' : '#f59e0b' }}>
                  {activePlan.activities?.filter((a:any)=>a.weeklyStatus==='BLOQUEADA' || a.weeklyStatus==='CANCELADA' || a.weeklyStatus==='NO_INICIADA').length || 0}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Incidencias / No inciadas</div>
              </div>
              <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                  {activePlan.activities?.length > 0 ? Math.round((activePlan.activities?.filter((a:any)=>a.weeklyStatus==='COMPLETADA').length / activePlan.activities?.length) * 100) : 0}%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Fiabilidad del Plan (PPC)</div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.1)' }}>
                  <div style={{ height: '100%', background: 'var(--accent-primary)', width: `${activePlan.activities?.length > 0 ? Math.round((activePlan.activities?.filter((a:any)=>a.weeklyStatus==='COMPLETADA').length / activePlan.activities?.length) * 100) : 0}%` }}></div>
                </div>
              </div>
            </div>

            {/* Listado de Compromisos */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0 }}>📍 Panel de Ocurrencias en Obra</h3>
                <button className="btn-secondary" onClick={loadScheduleForLookup} style={{ fontSize: '13px' }}>
                  + Importar de Cronograma
                </button>
              </div>

              {(!activePlan.activities || activePlan.activities.length === 0) ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No has importado ningún compromiso a esta semana.
                </div>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{width:'50px'}}>Prioridad</th>
                        <th style={{minWidth:'200px'}}>Actividad Madre</th>
                        <th>Responsable</th>
                        <th>Estado Reunión</th>
                        <th>Días Involucrados</th>
                        <th style={{textAlign:'right'}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePlan.activities.map((act: any) => (
                        <tr key={act.id}>
                          <td style={{textAlign:'center'}}>
                            <select 
                              value={act.priority} 
                              onChange={(e)=>updateActivityStatus(act.id, { priority: e.target.value })}
                              style={{ 
                                background: 'transparent', border: 'none', appearance: 'none', fontWeight: 'bold',
                                color: act.priority === 'CLAVE' ? '#ef4444' : act.priority === 'IMPORTANTE' ? '#f59e0b' : act.priority === 'REMATE' ? '#8b5cf6' : 'var(--text-muted)'
                              }}>
                              <option value="CLAVE">CLAVE</option>
                              <option value="IMPORTANTE">ALTA</option>
                              <option value="NORMAL">NORMAL</option>
                              <option value="REMATE">REMATE</option>
                            </select>
                          </td>
                          <td>
                            <div style={{ fontWeight: '500', fontSize: '14px' }}>{act.projectActivity?.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>[{act.projectActivity?.code || 'S/N'}]</div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {act.projectActivity?.responsible || 'Sin asignar'}
                          </td>
                          <td>
                            <select 
                              className="input-modern"
                              style={{ padding: '6px', fontSize: '12px', minWidth: '130px', fontWeight: 'bold', color: statusColors[act.weeklyStatus] }}
                              value={act.weeklyStatus}
                              onChange={(e)=>updateActivityStatus(act.id, { weeklyStatus: e.target.value })}
                            >
                               <option value="PENDIENTE">Pendiente (No arranca aún)</option>
                               <option value="EN_CURSO">En Curso (Con recursos metidos)</option>
                               <option value="COMPLETADA">Completada (Cerrado 100%)</option>
                               <option value="INCOMPLETA">Incompleta (No lograda entera)</option>
                               <option value="NO_INICIADA">No Iniciada (Fallo grave)</option>
                               <option value="BLOQUEADA">Bloqueada (Por terceros)</option>
                               <option value="CANCELADA">Cancelada temporalmente</option>
                            </select>
                          </td>
                          <td>
                            <input 
                              type="text" 
                              className="input-modern" 
                              style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent' }}
                              placeholder="Ej: LMX"
                              defaultValue={act.executionDays || ''}
                              onBlur={(e)=>updateActivityStatus(act.id, { executionDays: e.target.value })}
                            />
                          </td>
                          <td style={{textAlign:'right'}}>
                            <button onClick={() => handleRemoveActivity(act.id)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }} title="Excluir de esta semana">✖</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal Crear Plan */}
      {showNewPlanModal && (
        <div className="modal-backdrop" style={{ zIndex: 100 }}>
          <div className="modal-content glass-panel" style={{ width: '100%', maxWidth: '500px' }}>
            <h2>Génesis de Plan Semanal</h2>
            <form onSubmit={handleCreatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="formGroup">
                <label>Nombre del Plan / Semana *</label>
                <input required type="text" className="input-modern" placeholder="Ej: Semana del 12 a 18 Oct" value={newPlan.weekName} onChange={e=>setNewPlan({...newPlan, weekName: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="formGroup">
                  <label>Lunes (Inicio)</label>
                  <input type="date" className="input-modern" value={newPlan.startDate} onChange={e=>setNewPlan({...newPlan, startDate: e.target.value})} />
                </div>
                <div className="formGroup">
                  <label>Domingo (Fin)</label>
                  <input type="date" className="input-modern" value={newPlan.endDate} onChange={e=>setNewPlan({...newPlan, endDate: e.target.value})} />
                </div>
              </div>
              <div className="formGroup">
                <label>Jefe de Producción Semanal</label>
                <input type="text" className="input-modern" placeholder="Quién rinde cuentas del compromiso" value={newPlan.generalManager} onChange={e=>setNewPlan({...newPlan, generalManager: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowNewPlanModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Registrar Espacio</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lookahead Inyector */}
      {showLookupModal && (
        <LookaheadInjector 
          activities={scheduleActivities} 
          currentPlanIds={activePlan ? activePlan.activities?.map((a:any)=>a.projectActivityId) : []}
          onClose={()=>setShowLookupModal(false)}
          onAdd={handleAddActivitiesToPlan}
        />
      )}
    </div>
  );
}

// Sub-componente para buscar e inyectar tareas rápidamente
function LookaheadInjector({ activities, currentPlanIds, onClose, onAdd }: any) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');

  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const performInjection = () => {
    onAdd(Array.from(selected));
  };

  // Filtrar las que no estén ya en el plan
  const eligible = activities.filter((a: any) => !currentPlanIds.includes(a.id) && (a.name.toLowerCase().includes(q.toLowerCase()) || (a.code || '').toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="modal-backdrop" style={{ zIndex: 110 }}>
      <div className="modal-content glass-panel" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <h2>Inyector Táctico desde Lookahead / Maestro</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Selecciona las tareas preparadas que quieres comprometer a ejecutar esta semana concreta.</p>
        
        <input 
          type="text" 
          className="input-modern" 
          placeholder="🔎 Buscar tarea para inyectar..." 
          value={q} 
          onChange={e=>setQ(e.target.value)}
          style={{ margin: '16px 0' }}
        />

        <div style={{ flex: '1', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px', background: 'rgba(0,0,0,0.2)' }}>
          {eligible.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron tareas disponibles.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {eligible.map((a: any) => (
                <div 
                  key={a.id}
                  onClick={() => toggle(a.id)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '6px', cursor: 'pointer',
                    background: selected.has(a.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    border: selected.has(a.id) ? '1px solid var(--accent-primary)' : '1px solid transparent'
                  }}
                >
                   <input type="checkbox" checked={selected.has(a.id)} onChange={()=>{}} style={{ accentColor: 'var(--accent-primary)', width:'16px', height:'16px' }} />
                   <div>
                     <div style={{ fontWeight: '500', fontSize: '14px' }}>{a.name}</div>
                     <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Resp: {a.responsible || '---'} | Status: {a.status}</div>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '20px', alignItems: 'center' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selected.size} tareas seleccionadas</div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={performInjection} disabled={selected.size === 0}>Integrar {selected.size} a la Semana</button>
          </div>
        </div>
      </div>
    </div>
  );
}
