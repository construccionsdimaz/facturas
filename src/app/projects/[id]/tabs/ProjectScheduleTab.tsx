"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback } from 'react';
import styles from '@/app/invoices/page.module.css';

export default function ProjectScheduleTab({ projectId }: { projectId: string }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [wbsOptions, setWbsOptions] = useState<any[]>([]);
  const [locationOptions, setLocationOptions] = useState<any[]>([]);
  const [standardActivities, setStandardActivities] = useState<any[]>([]);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWbs, setFilterWbs] = useState('');
  const [filterLocation, setFilterLocation] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  const initialForm = {
    name: '', code: '', wbsId: '', locationId: '', standardActivityId: '',
    responsible: '', plannedDuration: '', plannedStartDate: '', plannedEndDate: '',
    status: 'PENDIENTE', observations: ''
  };
  const [formData, setFormData] = useState<any>(initialForm);

  // Load Data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resAct, resWbs, resLoc, resStd, resDeps] = await Promise.all([
        fetch(`/api/projects/${projectId}/schedule`),
        fetch(`/api/projects/${projectId}/wbs`),
        fetch(`/api/projects/${projectId}/locations`),
        fetch(`/api/standard-activities`),
        fetch(`/api/projects/${projectId}/schedule/dependencies`)
      ]);
      if(resAct.ok) setActivities(await resAct.json());
      if(resWbs.ok) setWbsOptions(await resWbs.json());
      if(resLoc.ok) setLocationOptions(await resLoc.json());
      if(resStd.ok) setStandardActivities(await resStd.json());
      if(resDeps.ok) setDependencies(await resDeps.json());
    } catch(e) { console.error('Error fetching data', e); }
    setIsLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openForm = (act?: any) => {
    if (act) {
      setEditingActivity(act);
      setFormData({
        ...act,
        wbsId: act.wbsId || '',
        locationId: act.locationId || '',
        standardActivityId: act.standardActivityId || '',
        plannedDuration: act.plannedDuration || '',
        plannedStartDate: act.plannedStartDate ? new Date(act.plannedStartDate).toISOString().split('T')[0] : '',
        plannedEndDate: act.plannedEndDate ? new Date(act.plannedEndDate).toISOString().split('T')[0] : '',
        responsible: act.responsible || '',
        observations: act.observations || ''
      });
    } else {
      setEditingActivity(null);
      setFormData(initialForm);
    }
    setShowModal(true);
  };

  const handleStandardActivitySelected = (sid: string) => {
    const act = standardActivities.find(a => a.id === sid);
    if(act) {
      setFormData({
        ...formData, 
        standardActivityId: sid,
        name: act.name,
      });
    } else {
      setFormData({ ...formData, standardActivityId: '' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingActivity ? `/api/projects/${projectId}/schedule/${editingActivity.id}` : `/api/projects/${projectId}/schedule`;
      const method = editingActivity ? 'PUT' : 'POST';

      const payload = {...formData};
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al guardar la actividad');
      }

      setShowModal(false);
      fetchData();
    } catch(err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if(!confirm('¿Eliminar esta actividad del cronograma de control?')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule/${id}`, { method: 'DELETE' });
      if(!res.ok) throw new Error('Error al eliminar');
      fetchData();
    } catch(err: any) { alert(err.message); }
  };

  const handleAddDependency = async (predecessorId: string, type: string, lag: number) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predecessorId, successorId: editingActivity.id, dependencyType: type, lagDays: lag })
      });
      if(!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al enlazar actividad');
      }
      // Actualizamos estado refrescando todo. (También actualiza el modal si `fetchData` mantiene editingActivity gracias al refetch que actualiza `activities` aunque el current editingActivity object se queda estático... Para arreglar la UI de depedencias en el modal, resDeps es el que manda y al refetchear `dependencies` se actualizan las listas abajo).
      fetchData();
    } catch(err: any) { alert(err.message); }
  };

  const handleAutoGeneratePlan = async () => {
    const hasData = activities.length > 0 || wbsOptions.length > 0 || locationOptions.length > 0;
    const shouldReplace = hasData ? confirm('La obra ya tiene estructura. ¿Quieres regenerarla y sustituir la estructura actual?') : true;
    if (!shouldReplace) return;

    setIsAutoGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/auto-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replaceExisting: hasData }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo generar el planning');
      }

      const data = await res.json();
      alert(`Planning generado: ${data.createdActivities} actividades, ${data.createdWbs} partidas y ${data.createdLocations} ubicaciones.`);
      fetchData();
    } catch (error: any) {
      alert(error.message || 'Error generando planning');
    } finally {
      setIsAutoGenerating(false);
    }
  };
  
  const handleRemoveDependency = async (depId: string) => {
    if(!confirm('¿Eliminar esta dependencia constructiva?')) return;
    try {
      await fetch(`/api/projects/${projectId}/schedule/dependencies/${depId}`, { method: 'DELETE' });
      fetchData();
    } catch(e: any) { alert(e.message); }
  };

  // Status mapping
  const statusColors: any = {
    'PENDIENTE': 'var(--text-muted)',
    'PREPARADA': '#3b82f6',
    'PLANIFICADA': '#8b5cf6',
    'EN_CURSO': '#f59e0b',
    'PAUSADA': '#64748b',
    'TERMINADA': '#10b981',
    'BLOQUEADA': '#ef4444',
    'CANCELADA': '#ef4444'
  };

  const filteredAct = activities.filter(a => {
    const matchQ = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                   (a.code && a.code.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchWbs = filterWbs ? a.wbsId === filterWbs : true;
    const matchLoc = filterLocation ? a.locationId === filterLocation : true;
    return matchQ && matchLoc && matchWbs;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* DASHBOARD DIAGNÓSTICO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{activities.length}</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Actividades Totales</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#10b981' }}>{activities.filter(a=>a.status==='TERMINADA').length}</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Terminadas</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f59e0b' }}>{activities.filter(a=>a.status==='EN_CURSO').length}</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>En Curso</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', borderColor: activities.filter(a=>!a.locationId || !a.wbsId).length > 0 ? '#ef4444' : 'transparent' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: activities.filter(a=>!a.locationId || !a.wbsId).length > 0 ? '#ef4444' : 'var(--text-muted)' }}>
             {activities.filter(a=>!a.locationId || !a.wbsId).length}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Falta WBS/Zona</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', borderColor: activities.filter(a=>(!a.predecessorLinks || a.predecessorLinks.length === 0) && (!a.successorLinks || a.successorLinks.length === 0)).length > 0 ? '#f59e0b' : 'transparent' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: activities.filter(a=>(!a.predecessorLinks || a.predecessorLinks.length === 0) && (!a.successorLinks || a.successorLinks.length === 0)).length > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
             {activities.filter(a=>(!a.predecessorLinks || a.predecessorLinks.length === 0) && (!a.successorLinks || a.successorLinks.length === 0)).length}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Huérfanas Lógicas</div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0' }}>Generacion automatica de planning</h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            El sistema propone ubicaciones, WBS, actividades, duraciones y una baseline inicial segun el contexto de la obra.
          </p>
        </div>
        <button className="btn-primary" onClick={handleAutoGeneratePlan} disabled={isAutoGenerating}>
          {isAutoGenerating ? 'Generando...' : 'Generar planning automatico'}
        </button>
      </div>

      {/* PANEL PRINCIPAL */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, display:'flex', alignItems:'center', gap:'8px' }}>
             📅 Listado de Control Maestro
          </h3>
          <button onClick={() => openForm()} className="btn-primary" style={{ padding: '8px 16px' }}>
            + Nueva Tarea
          </button>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <input 
            type="text" 
            placeholder="🔍 Buscar tarea (nombre o código)..." 
            className="input-modern"
            style={{ flex: '1', minWidth: '250px' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <select className="input-modern" value={filterWbs} onChange={e=>setFilterWbs(e.target.value)} style={{maxWidth:'200px'}}>
             <option value="">Todas las Partidas (WBS)</option>
             {wbsOptions.map(w => <option key={w.id} value={w.id}>{w.code ? `[${w.code}] ` : ''}{w.name}</option>)}
          </select>
          <select className="input-modern" value={filterLocation} onChange={e=>setFilterLocation(e.target.value)} style={{maxWidth:'200px'}}>
             <option value="">Todas las Zonas</option>
             {locationOptions.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        {/* TABLA DE CRONOGRAMA */}
        {isLoading ? (
          <p>Cargando cronograma...</p>
        ) : filteredAct.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay actividades de obra programadas en esta vista.</div>
        ) : (
          <div className={styles.tableContainer}>
             <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th style={{minWidth:'250px'}}>Actividad Operativa</th>
                    <th>Anclaje Físico y Coste</th>
                    <th>Fechas Base</th>
                    <th>Estado de Campo</th>
                    <th>Red y Enlaces</th>
                    <th style={{textAlign:'right'}}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAct.map(act => (
                    <tr key={act.id}>
                      <td style={{color:'var(--text-muted)'}}>{act.code || '---'}</td>
                      <td>
                         <div style={{ fontWeight: '500', fontSize:'15px' }}>{act.name}</div>
                         {act.standardActivity && (
                            <div style={{ fontSize: '11px', color: 'var(--accent-primary)' }}>
                               📚 {act.standardActivity.name}
                            </div>
                         )}
                         <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop:'4px' }}>
                            👤 Resp: {act.responsible || 'Sin asignar'}
                         </div>
                      </td>
                      <td>
                         <div style={{ fontSize: '13px', color: act.location ? 'white' : '#ef4444', marginBottom:'4px' }}>
                            <span style={{opacity:0.6}}>📍</span> {act.location ? act.location.name : '¡Falta Zona!'}
                         </div>
                         <div style={{ fontSize: '13px', color: act.wbs ? 'var(--text-secondary)' : '#ef4444' }}>
                            <span style={{opacity:0.6}}>🧱</span> {act.wbs ? `${act.wbs.code ? '['+act.wbs.code+'] ' : ''}${act.wbs.name}` : '¡Falta WBS!'}
                         </div>
                      </td>
                      <td>
                         <div style={{ fontSize: '14px', background:'rgba(255,255,255,0.05)', padding:'4px 8px', borderRadius:'4px', display:'inline-block'}}>
                            {act.plannedStartDate ? new Date(act.plannedStartDate).toLocaleDateString() : '??/??/??'} 
                            <span style={{opacity:0.5, margin:'0 4px'}}>→</span> 
                            {act.plannedEndDate ? new Date(act.plannedEndDate).toLocaleDateString() : '??/??/??'} 
                         </div>
                         <div style={{fontSize:'12px', color:'var(--text-muted)', marginTop:'4px', textAlign:'center'}}>
                            {act.plannedDuration ? `(${act.plannedDuration} días)` : ''}
                         </div>
                      </td>
                      <td>
                        <span style={{ 
                          fontSize: '11px', padding: '4px 8px', borderRadius: '4px', letterSpacing: '0.5px', fontWeight: 'bold',
                          background: `${statusColors[act.status]}20`,
                          color: statusColors[act.status]
                        }}>
                          {act.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{fontSize:'12px', color:'var(--text-secondary)', display:'flex', gap:'8px', alignItems:'center'}}>
                          <span style={{color: (!act.predecessorLinks || act.predecessorLinks.length === 0) ? '#f59e0b' : 'var(--accent-primary)'}} title="Predecesoras (Actividades que bloquean a esta)">⬅️ {act.predecessorLinks?.length || 0}</span>
                          <span>|</span>
                          <span style={{color: (!act.successorLinks || act.successorLinks.length === 0) ? '#f59e0b' : 'var(--accent-primary)'}} title="Sucesoras (Actividades bloqueadas por esta)">➡️ {act.successorLinks?.length || 0}</span>
                        </div>
                      </td>
                      <td style={{textAlign:'right'}}>
                        <button onClick={() => openForm(act)} style={{ background:'none', border:'none', color:'var(--accent-primary)', cursor:'pointer', marginRight:'12px' }}>Modificar</button>
                        <button onClick={() => handleDelete(act.id)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer' }}>X</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        )}
      </div>

      {/* MODAL CONFIGURACIÓN ACTIVIDAD */}
      {showModal && (
        <div className="modal-backdrop" style={{ zIndex: 100 }}>
          <div className="modal-content glass-panel" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 20px 0' }}>{editingActivity ? 'Editar Actividad Operativa' : 'Alta de Actividad de Obra'}</h2>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div className="formGroup" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                 <label style={{color:'var(--accent-primary)'}}>Autorellenar desde Biblioteca Central (Recomendado)</label>
                 <select className="input-modern" value={formData.standardActivityId} onChange={e=>handleStandardActivitySelected(e.target.value)}>
                    <option value="">-- No vincular a biblioteca general --</option>
                    {standardActivities.map(sa => (
                       <option key={sa.id} value={sa.id}>{sa.code ? `[${sa.code}] ` : ''}{sa.name}</option>
                    ))}
                 </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                
                {/* Bloque Izquierdo: Identificadores */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', margin: 0, fontSize:'16px' }}>Qué se hace</h3>
                  
                  <div className="formGroup">
                    <label>Título Real de Obra *</label>
                    <input required type="text" className="input-modern" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} placeholder="Ej: Hormigonar losa PB Sector 1" />
                  </div>
                  <div className="formGroup">
                    <label>Código Interno de Tarea</label>
                    <input type="text" className="input-modern" value={formData.code} onChange={e=>setFormData({...formData, code:e.target.value})} placeholder="Ej: T-010" />
                  </div>
                  <div className="formGroup">
                    <label>Responsable / Subcontrata</label>
                    <input type="text" className="input-modern" value={formData.responsible} onChange={e=>setFormData({...formData, responsible:e.target.value})} placeholder="Ej: Estructuras Martínez" />
                  </div>

                  <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', margin: '16px 0 0 0', fontSize:'16px' }}>Anclaje Organizacional</h3>
                  
                  <div className="formGroup">
                    <label>Ubicación Física *</label>
                    <select required className="input-modern" value={formData.locationId} onChange={e=>setFormData({...formData, locationId:e.target.value})}>
                      <option value="">-- Dónde ocurre --</option>
                      {locationOptions.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="formGroup">
                    <label>Partida / Alcance Presupuestario (WBS) *</label>
                    <select required className="input-modern" value={formData.wbsId} onChange={e=>setFormData({...formData, wbsId:e.target.value})}>
                      <option value="">-- Qué bolsa de coste lo asume --</option>
                      {wbsOptions.map(w => <option key={w.id} value={w.id}>{w.code ? `[${w.code}] ` : ''}{w.name}</option>)}
                    </select>
                  </div>

                </div>

                {/* Bloque Derecho: Temporalidad */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', margin: 0, fontSize:'16px' }}>Marcos de Tiempo</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="formGroup">
                      <label>Inicio Previsto</label>
                      <input type="date" className="input-modern" value={formData.plannedStartDate} onChange={e=>setFormData({...formData, plannedStartDate:e.target.value})} />
                    </div>
                    <div className="formGroup">
                      <label>Fin Previsto</label>
                      <input type="date" className="input-modern" value={formData.plannedEndDate} onChange={e=>setFormData({...formData, plannedEndDate:e.target.value})} />
                    </div>
                  </div>

                  <div className="formGroup">
                    <label>Duración Prevista (Días)</label>
                    <input type="number" step="0.5" className="input-modern" value={formData.plannedDuration} onChange={e=>setFormData({...formData, plannedDuration:e.target.value})} placeholder="Ej: 5" style={{fontSize:'18px', fontWeight:'bold'}} />
                  </div>

                  <div className="formGroup" style={{ marginTop: '16px' }}>
                    <label>Estado de Control *</label>
                    <select className="input-modern" value={formData.status} onChange={e=>setFormData({...formData, status:e.target.value})} style={{ color: statusColors[formData.status], fontWeight: 'bold' }}>
                       <option value="PENDIENTE">Pendiente (Idea)</option>
                       <option value="PREPARADA">Preparada (Con pre-requisitos)</option>
                       <option value="PLANIFICADA">Planificada (Fechas fijas)</option>
                       <option value="EN_CURSO">En Curso (Ejecutándose)</option>
                       <option value="PAUSADA">Pausada</option>
                       <option value="TERMINADA">Terminada</option>
                       <option value="BLOQUEADA">Bloqueada</option>
                       <option value="CANCELADA">Cancelada</option>
                    </select>
                  </div>

                  <div className="formGroup">
                    <label>Observaciones de Bloqueo/Retraso</label>
                    <textarea className="input-modern" rows={3} value={formData.observations} onChange={e=>setFormData({...formData, observations:e.target.value})} placeholder="Avisos importantes sobre esta ejecución temporal..." />
                  </div>

                </div>

              </div>

              {editingActivity && (
                <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
                  <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
                    🔗 Lógica Constructiva (Red Temporal)
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Establece qué actividades deben terminar o empezar antes de que esta actividad opere. El sistema valida automáticamente bucles infinitos.
                  </p>
                  
                  {/* PREDECESORAS (Qué bloquea a esta tarea) */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{fontSize:'14px', fontWeight:'bold', color:'var(--accent-primary)', marginBottom:'12px'}}>⬅️ Esta tarea necesita que se cumpla primero:</div>
                    {dependencies.filter(d=>d.successorId === editingActivity.id).length > 0 ? (
                      <table className={styles.table} style={{fontSize:'12px', marginBottom:'16px'}}>
                        <tbody>
                          {dependencies.filter(d=>d.successorId === editingActivity.id).map(dep => (
                            <tr key={dep.id}>
                               <td style={{width:'50px'}}><b>{dep.dependencyType}</b></td>
                               <td>{dep.predecessor?.name} <span style={{color:'var(--text-muted)'}}>[{dep.predecessor?.code}]</span></td>
                               <td>{dep.lagDays !== 0 ? (dep.lagDays > 0 ? `Retardo: +${dep.lagDays}d` : `Solape: ${dep.lagDays}d`) : 'Sin desfase'}</td>
                               <td style={{textAlign:'right'}}>
                                 <button type="button" onClick={()=>handleRemoveDependency(dep.id)} style={{color:'#ef4444', background:'none', border:'none', cursor:'pointer'}}>Quitar</button>
                               </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ fontSize:'12px', color:'var(--text-muted)', fontStyle:'italic', padding:'8px', background:'rgba(255,255,255,0.02)', borderRadius:'4px', marginBottom:'16px' }}>No depende de ninguna actividad previa.</div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(59, 130, 246, 0.05)', padding: '12px', borderRadius: '8px' }}>
                      <select id="newPredSelect" className="input-modern" style={{ flex: 1, fontSize:'13px' }}>
                         <option value="">Añadir nueva predecesora...</option>
                         {activities.filter(a=>a.id !== editingActivity.id).map(a => (
                           <option key={a.id} value={a.id}>{a.code ? `[${a.code}] ` : ''}{a.name}</option>
                         ))}
                      </select>
                      <select id="newPredType" className="input-modern" style={{ width:'80px', fontSize:'13px' }}>
                        <option value="FS">FS (Fin-Inicio)</option>
                        <option value="SS">SS (Inicio-Inicio)</option>
                        <option value="FF">FF (Fin-Fin)</option>
                      </select>
                      <input id="newPredLag" type="number" step="0.5" className="input-modern" placeholder="Días lag" style={{ width:'80px', fontSize:'13px' }} defaultValue={0} title="Positivo para espera, negativo para solape" />
                      <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize:'12px' }} onClick={() => {
                        const predId = (document.getElementById('newPredSelect') as HTMLSelectElement).value;
                        const type = (document.getElementById('newPredType') as HTMLSelectElement).value;
                        const lag = parseFloat((document.getElementById('newPredLag') as HTMLInputElement).value) || 0;
                        if(predId) handleAddDependency(predId, type, lag);
                      }}>Vincular</button>
                    </div>
                  </div>

                  {/* SUCESORAS */}
                  <div>
                    <div style={{fontSize:'14px', fontWeight:'bold', color:'var(--accent-primary)', marginBottom:'12px'}}>➡️ Esta tarea está bloqueando o condicionando a:</div>
                    {dependencies.filter(d=>d.predecessorId === editingActivity.id).length > 0 ? (
                      <table className={styles.table} style={{fontSize:'12px'}}>
                        <tbody>
                          {dependencies.filter(d=>d.predecessorId === editingActivity.id).map(dep => (
                            <tr key={dep.id}>
                               <td style={{width:'50px'}}><b>{dep.dependencyType}</b></td>
                               <td>{dep.successor?.name} <span style={{color:'var(--text-muted)'}}>[{dep.successor?.code}]</span></td>
                               <td>{dep.lagDays !== 0 ? (dep.lagDays > 0 ? `Retardo: +${dep.lagDays}d` : `Solape: ${dep.lagDays}d`) : 'Sin desfase'}</td>
                               <td style={{textAlign:'right'}}>
                                 <button type="button" onClick={()=>handleRemoveDependency(dep.id)} style={{color:'#ef4444', background:'none', border:'none', cursor:'pointer'}}>Quitar</button>
                               </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ fontSize:'12px', color:'var(--text-muted)', fontStyle:'italic', padding:'8px', background:'rgba(255,255,255,0.02)', borderRadius:'4px' }}>No condiciona a ninguna otra actividad futura.</div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ background: '#10b981' }}>Fijar en Cronograma</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
