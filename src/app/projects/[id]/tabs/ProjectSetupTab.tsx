"use client";

import { useState } from 'react';
import styles from '@/app/invoices/page.module.css';
import { formatCurrency } from '@/lib/format';

interface ProjectSetupTabProps {
  project: any;
  onUpdate: () => void;
}

export default function ProjectSetupTab({ project, onUpdate }: ProjectSetupTabProps) {
  const [subTab, setSubTab] = useState<'resumen' | 'general' | 'parametros' | 'hitos' | 'restricciones'>('resumen');
  const [isSaving, setIsSaving] = useState(false);

  // General State
  const [genData, setGenData] = useState({
    code: project.code || '',
    projectType: project.projectType || '',
    manager: project.manager || '',
    targetEndDate: project.targetEndDate ? new Date(project.targetEndDate).toISOString().split('T')[0] : '',
    contractualEndDate: project.contractualEndDate ? new Date(project.contractualEndDate).toISOString().split('T')[0] : '',
    observations: project.observations || '',
  });

  // Calendar State
  const c = project.calendar || {};
  const [calData, setCalData] = useState({
    workingDays: c.workingDays ? JSON.parse(c.workingDays) : ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
    workHours: c.workHours || '08:00-18:00',
    worksSaturdays: c.worksSaturdays || false,
    worksHolidays: c.worksHolidays || false,
    bufferDays: c.bufferDays || 0,
    timeCriteria: c.timeCriteria || 'LABORABLES'
  });

  // Milestones State
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ name: '', targetDate: '', priority: 'MEDIA', manager: '', status: 'PENDIENTE', description: '', observations: '' });

  // Constraints State
  const [showAddConstraint, setShowAddConstraint] = useState(false);
  const [newConstraint, setNewConstraint] = useState({ title: '', type: 'OTROS', description: '', impact: 'MEDIO', priority: 'MEDIA', manager: '', status: 'ABIERTA', targetResolutionDate: '', comments: '' });

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...project, ...genData })
      });
      onUpdate();
      alert('Datos generales guardados');
    } catch (e) { alert('Error guardando datos generales'); }
    setIsSaving(false);
  };

  const handleSaveCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await fetch(`/api/projects/${project.id}/calendar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calData)
      });
      onUpdate();
      alert('Parámetros guardados');
    } catch (e) { alert('Error guardando calendario'); }
    setIsSaving(false);
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`/api/projects/${project.id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMilestone)
      });
      setShowAddMilestone(false);
      onUpdate();
    } catch (e) { alert('Error guardando hito'); }
  };

  const handleDeleteMilestone = async (id: string) => {
    if(!confirm('¿Eliminar hito?')) return;
    try {
      await fetch(`/api/projects/${project.id}/milestones/${id}`, { method: 'DELETE' });
      onUpdate();
    } catch (e) { alert('Error borrando'); }
  };

  const handleAddConstraint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`/api/projects/${project.id}/constraints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConstraint)
      });
      setShowAddConstraint(false);
      onUpdate();
    } catch (e) { alert('Error guardando restricción'); }
  };

  const handleDeleteConstraint = async (id: string) => {
    if(!confirm('¿Eliminar restricción?')) return;
    try {
      await fetch(`/api/projects/${project.id}/constraints/${id}`, { method: 'DELETE' });
      onUpdate();
    } catch (e) { alert('Error borrando'); }
  };

  const handleToggleSetupStatus = async () => {
    const nextStatus = project.setupStatus === 'VALIDATED' ? 'INCOMPLETE' : 
                       project.setupStatus === 'READY_FOR_PLANNING' ? 'VALIDATED' : 
                       'READY_FOR_PLANNING';
                       
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...project, setupStatus: nextStatus })
      });
      onUpdate();
    } catch(e) { alert('Error cambiando estado'); }
  };

  const isReady = project.manager && project.targetEndDate && project.calendar && project.milestones?.length > 0;
  const criticalConstraints = project.constraints?.filter((c:any) => c.status === 'ABIERTA' && (c.impact === 'BLOQUEANTE' || c.priority === 'CRITICA'));
  const latestEstimate = project.estimates?.[0] || null;
  const hasInternalEstimate = Boolean(latestEstimate?.internalAnalysis);
  const hasPlanning = (project.activities?.length || 0) > 0;
  const hasSupplies = (project.supplies?.length || 0) > 0;
  const hasOperationalContext = Boolean(project.projectType && (project.description || project.observations));
  const setupChecklist = [
    {
      label: 'Datos generales minimos',
      ok: Boolean(project.manager && project.targetEndDate && project.projectType),
      detail: project.manager && project.targetEndDate && project.projectType ? 'Responsable, tipo y fecha objetivo definidos.' : 'Falta responsable, tipo de obra o fecha objetivo.',
    },
    {
      label: 'Contexto operativo describible',
      ok: hasOperationalContext,
      detail: hasOperationalContext ? 'La obra tiene descripcion u observaciones para inferencia y trazabilidad.' : 'Conviene describir alcance y condicionantes de la obra.',
    },
    {
      label: 'Calendario de obra',
      ok: Boolean(project.calendar),
      detail: project.calendar ? `Calendario activo (${project.calendar.timeCriteria || 'LABORABLES'} | ${project.calendar.workHours || '08:00-18:00'}).` : 'Falta inicializar calendario base.',
    },
    {
      label: 'Presupuesto con analisis interno',
      ok: hasInternalEstimate,
      detail: hasInternalEstimate ? `Ultimo estimate con capa interna (${latestEstimate?.internalAnalysis?.source || 'MASTER'}).` : 'No hay estimate con capa interna; la automatizacion operara con menos contexto.',
    },
    {
      label: 'Planning generado',
      ok: hasPlanning,
      detail: hasPlanning ? `${project.activities.length} actividades en cronograma.` : 'Todavia no se ha generado el planning base.',
    },
    {
      label: 'Supplies / procurement inicial',
      ok: hasSupplies,
      detail: hasSupplies ? `${project.supplies.length} necesidades de suministro registradas.` : 'Todavia no se han generado necesidades de compra ligadas al planning.',
    },
  ];
  const nextRecommendedStep = !project.manager || !project.targetEndDate || !project.projectType
    ? 'Completar datos generales minimos de la obra.'
    : !project.calendar
    ? 'Configurar el calendario base antes de planificar.'
    : !hasInternalEstimate
    ? 'Generar y guardar un presupuesto automatico con analisis interno.'
    : !hasPlanning
    ? 'Generar el planning automatico con fechas previstas.'
    : !hasSupplies
    ? 'Generar supplies y validar compras criticas.'
    : 'La obra ya tiene base operativa para arrancar un piloto controlado.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Sub Navigation */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch' }}>
        {['resumen', 'general', 'parametros', 'hitos', 'restricciones'].map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t as any)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '15px', fontWeight: subTab === t ? '600' : '400',
              color: subTab === t ? 'var(--accent-primary)' : 'var(--text-muted)',
              textTransform: 'capitalize',
              position: 'relative'
            }}
          >
            {t}
            {subTab === t && <div style={{ position: 'absolute', bottom: '-13px', left: 0, right: 0, height: '2px', background: 'var(--accent-primary)' }} />}
          </button>
        ))}
      </div>

      {subTab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.4))', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <h2 style={{ fontSize: '20px', margin: '0 0 8px 0' }}>Estado de Preparación: <span style={{ color: project.setupStatus === 'VALIDATED' ? '#10b981' : project.setupStatus === 'READY_FOR_PLANNING' ? '#3b82f6' : '#f59e0b' }}>{project.setupStatus}</span></h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Verifica que todos los datos iniciales de la obra están correctamente definidos antes de empezar a planificar el cronograma.</p>
            </div>
            <button 
              className="btn-primary" 
              onClick={handleToggleSetupStatus}
              style={{ background: isReady && criticalConstraints?.length === 0 ? 'var(--accent-primary)' : '#475569' }}
            >
              Cambiar a {project.setupStatus === 'VALIDATED' ? 'Incompleta' : project.setupStatus === 'READY_FOR_PLANNING' ? 'Validada' : 'Lista para Planificar'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '20px', gridColumn: '1 / -1' }}>
              <h4 style={{ margin: '0 0 16px 0' }}>Checklist operativo minimo</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                {setupChecklist.map((item) => (
                  <div key={item.label} style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${item.ok ? 'rgba(16, 185, 129, 0.28)' : 'rgba(245, 158, 11, 0.28)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontWeight: 600, marginBottom: '6px' }}>
                      <span>{item.label}</span>
                      <span>{item.ok ? '✅' : '⚠️'}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', gridColumn: '1 / -1', borderLeft: '4px solid #3b82f6' }}>
              <h4 style={{ margin: '0 0 8px 0' }}>Siguiente paso recomendado</h4>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>{nextRecommendedStep}</p>
            </div>

            <div className="glass-panel" style={{ padding: '20px', gridColumn: '1 / -1' }}>
              <h4 style={{ margin: '0 0 12px 0' }}>Datos mínimos operativos</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <div>
                  <strong style={{ color: '#fff' }}>Obligatorios de verdad</strong>
                  <div style={{ marginTop: '6px' }}>Responsable, tipo de obra, fecha objetivo y calendario base.</div>
                </div>
                <div>
                  <strong style={{ color: '#fff' }}>Muy recomendables</strong>
                  <div style={{ marginTop: '6px' }}>Descripcion de alcance, estimate con analisis interno y al menos un hito principal.</div>
                </div>
                <div>
                  <strong style={{ color: '#fff' }}>El sistema puede inferir</strong>
                  <div style={{ marginTop: '6px' }}>Parte de la tipologia, unidades y magnitudes basicas, pero con mas riesgo si faltan datos.</div>
                </div>
              </div>
            </div>

            {/* Box 1 */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: project.manager && project.targetEndDate ? '4px solid #10b981' : '4px solid #ef4444' }}>
              <h4 style={{ margin: '0 0 16px 0', display: 'flex', justifyContent: 'space-between' }}>
                Datos Generales
                {project.manager && project.targetEndDate ? <span>✅</span> : <span>❌</span>}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Responsable: {project.manager ? <strong style={{color:'#fff'}}>{project.manager}</strong> : <span style={{color:'#ef4444'}}>Falta asignar</span>}</li>
                <li>Fecha Objetivo: {project.targetEndDate ? <strong style={{color:'#fff'}}>{new Date(project.targetEndDate).toLocaleDateString()}</strong> : <span style={{color:'#ef4444'}}>No definida</span>}</li>
                <li>Tipo: {project.projectType || 'No definido'}</li>
              </ul>
              <button className="btn-secondary" style={{ marginTop: '16px', width: '100%' }} onClick={() => setSubTab('general')}>Completar Datos</button>
            </div>

            {/* Box 2 */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: project.calendar ? '4px solid #10b981' : '4px solid #ef4444' }}>
              <h4 style={{ margin: '0 0 16px 0', display: 'flex', justifyContent: 'space-between' }}>
                Calendario Base
                {project.calendar ? <span>✅</span> : <span>❌</span>}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>{project.calendar ? `Criterio: ${project.calendar.timeCriteria}` : <span style={{color:'#ef4444'}}>Calendario no inicializado</span>}</li>
                <li>{project.calendar ? `Horario: ${project.calendar.workHours}` : ''}</li>
                <li>{project.calendar ? `Buffer: ${project.calendar.bufferDays} días` : ''}</li>
              </ul>
              <button className="btn-secondary" style={{ marginTop: '16px', width: '100%' }} onClick={() => setSubTab('parametros')}>Configurar Calendario</button>
            </div>

            {/* Box 3 */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: project.milestones?.length > 0 ? '4px solid #10b981' : '4px solid #f59e0b' }}>
              <h4 style={{ margin: '0 0 16px 0', display: 'flex', justifyContent: 'space-between' }}>
                Hitos Clave
                {project.milestones?.length > 0 ? <span>✅</span> : <span>⚠️</span>}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Hitos definidos: <strong style={{color:'#fff'}}>{project.milestones?.length || 0}</strong></li>
                {project.milestones?.length === 0 && <li style={{color:'#f59e0b'}}>Se recomienda fijar al menos el Inicio y el Fin.</li>}
              </ul>
              <button className="btn-secondary" style={{ marginTop: '16px', width: '100%' }} onClick={() => setSubTab('hitos')}>Gestionar Hitos</button>
            </div>

            {/* Box 4 */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: criticalConstraints?.length > 0 ? '4px solid #ef4444' : '4px solid #10b981' }}>
              <h4 style={{ margin: '0 0 16px 0', display: 'flex', justifyContent: 'space-between' }}>
                Restricciones
                {criticalConstraints?.length > 0 ? <span>🛑</span> : <span>✅</span>}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Total abiertas: <strong style={{color:'#fff'}}>{project.constraints?.filter((c:any) => c.status === 'ABIERTA').length || 0}</strong></li>
                {criticalConstraints?.length > 0 && <li style={{color:'#ef4444'}}>Hay {criticalConstraints.length} restricciones críticas/bloqueantes.</li>}
              </ul>
              <button className="btn-secondary" style={{ marginTop: '16px', width: '100%' }} onClick={() => setSubTab('restricciones')}>Ver Restricciones</button>
            </div>
          </div>
        </div>
      )}

      {subTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '24px' }}>Datos Generales de la Obra</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div className="formGroup">
              <label>Código Interno</label>
              <input type="text" className="input-modern" value={genData.code} onChange={e => setGenData({...genData, code: e.target.value})} placeholder="Ej: OBR-024" />
            </div>
            <div className="formGroup">
              <label>Tipo de Obra</label>
              <select className="input-modern" value={genData.projectType} onChange={e => setGenData({...genData, projectType: e.target.value})}>
                <option value="">Seleccionar...</option>
                <option value="RESIDENCIAL">Residencial</option>
                <option value="REFORMA">Reforma / Rehabilitación</option>
                <option value="INDUSTRIAL">Industrial</option>
                <option value="CIVIL">Obra Civil</option>
                <option value="OTROS">Otros</option>
              </select>
            </div>
            <div className="formGroup">
              <label>Responsable de Obra</label>
              <input type="text" className="input-modern" value={genData.manager} onChange={e => setGenData({...genData, manager: e.target.value})} />
            </div>
            <div className="formGroup">
              <label>Fecha Objetivo Fin</label>
              <input type="date" className="input-modern" value={genData.targetEndDate} onChange={e => setGenData({...genData, targetEndDate: e.target.value})} />
            </div>
            <div className="formGroup">
              <label>Plazo Contractual (Fin)</label>
              <input type="date" className="input-modern" value={genData.contractualEndDate} onChange={e => setGenData({...genData, contractualEndDate: e.target.value})} />
            </div>
            <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
              <label>Observaciones Iniciales</label>
              <textarea className="input-modern" rows={3} value={genData.observations} onChange={e => setGenData({...genData, observations: e.target.value})} />
            </div>
          </div>
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Datos'}</button>
          </div>
        </form>
      )}

      {subTab === 'parametros' && (
        <form onSubmit={handleSaveCalendar} className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '24px' }}>Parámetros y Calendario</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="formGroup">
                <label>Horario Habitual (Ej. 08:00 - 18:00)</label>
                <input type="text" className="input-modern" value={calData.workHours} onChange={e => setCalData({...calData, workHours: e.target.value})} />
              </div>
              <div className="formGroup">
                <label>Criterio de Cómputo</label>
                <select className="input-modern" value={calData.timeCriteria} onChange={e => setCalData({...calData, timeCriteria: e.target.value})}>
                  <option value="LABORABLES">Días Laborables</option>
                  <option value="NATURALES">Días Naturales</option>
                </select>
              </div>
              <div className="formGroup">
                <label>Buffer Interno General (Días de margen)</label>
                <input type="number" className="input-modern" value={calData.bufferDays} onChange={e => setCalData({...calData, bufferDays: Number(e.target.value)})} />
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Excepciones de Trabajo</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={calData.worksSaturdays} onChange={e => setCalData({...calData, worksSaturdays: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                <span>La obra permite trabajos los Sábados</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={calData.worksHolidays} onChange={e => setCalData({...calData, worksHolidays: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                <span>La obra permite trabajos en Festivos (Licencia Especial)</span>
              </label>
            </div>
          </div>
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Calendario'}</button>
          </div>
        </form>
      )}

      {subTab === 'hitos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Hitos Principales</h3>
            <button className="btn-primary" onClick={() => setShowAddMilestone(!showAddMilestone)}>{showAddMilestone ? 'Cerrar' : '+ Añadir Hito'}</button>
          </div>

          {showAddMilestone && (
            <form onSubmit={handleAddMilestone} className="glass-panel" style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', border: '1px solid var(--accent-primary)' }}>
              <div className="formGroup">
                <label>Nombre del Hito</label><input type="text" className="input-modern" required value={newMilestone.name} onChange={e=>setNewMilestone({...newMilestone, name:e.target.value})} placeholder="Ej: Firma Acta Replanteo" />
              </div>
              <div className="formGroup">
                <label>Fecha Objetivo</label><input type="date" className="input-modern" required value={newMilestone.targetDate} onChange={e=>setNewMilestone({...newMilestone, targetDate:e.target.value})} />
              </div>
              <div className="formGroup">
                <label>Prioridad</label>
                <select className="input-modern" value={newMilestone.priority} onChange={e=>setNewMilestone({...newMilestone, priority:e.target.value})}>
                  <option value="BAJA">Baja</option><option value="MEDIA">Media</option><option value="ALTA">Alta</option><option value="CRITICA">Crítica</option>
                </select>
              </div>
              <div className="formGroup">
                <label>Responsable</label><input type="text" className="input-modern" value={newMilestone.manager} onChange={e=>setNewMilestone({...newMilestone, manager:e.target.value})} />
              </div>
              <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
                <label>Descripción / Observaciones</label><input type="text" className="input-modern" value={newMilestone.description} onChange={e=>setNewMilestone({...newMilestone, description:e.target.value})} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-primary">Guardar Hito</button>
              </div>
            </form>
          )}

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Hito</th>
                  <th>Fecha Obj.</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                  <th>Responsable</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {project.milestones?.length === 0 ? <tr><td colSpan={6} style={{textAlign:'center', padding:'20px', color:'var(--text-muted)'}}>No hay hitos registrados</td></tr> : null}
                {project.milestones?.map((m: any) => (
                  <tr key={m.id}>
                    <td><strong>{m.name}</strong><div style={{fontSize:'12px', color:'var(--text-muted)'}}>{m.description}</div></td>
                    <td>{new Date(m.targetDate).toLocaleDateString()}</td>
                    <td><span className="badge" style={{ background: m.priority === 'CRITICA' ? '#ef4444' : m.priority === 'ALTA' ? '#f59e0b' : 'rgba(255,255,255,0.1)' }}>{m.priority}</span></td>
                    <td>{m.status}</td>
                    <td>{m.manager}</td>
                    <td><button onClick={() => handleDeleteMilestone(m.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer'}}>Borrar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'restricciones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Restricciones y Condicionantes Iniciales</h3>
            <button className="btn-primary" onClick={() => setShowAddConstraint(!showAddConstraint)}>{showAddConstraint ? 'Cerrar' : '+ Añadir Restricción'}</button>
          </div>

          {showAddConstraint && (
            <form onSubmit={handleAddConstraint} className="glass-panel" style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', border: '1px solid var(--accent-primary)' }}>
              <div className="formGroup">
                <label>Título Corto</label><input type="text" className="input-modern" required value={newConstraint.title} onChange={e=>setNewConstraint({...newConstraint, title:e.target.value})} placeholder="Ej: Licencia Vado Pendiente" />
              </div>
              <div className="formGroup">
                <label>Tipo</label>
                <select className="input-modern" value={newConstraint.type} onChange={e=>setNewConstraint({...newConstraint, type:e.target.value})}>
                  <option value="LICENCIA">Licencia / Permiso</option><option value="SUMINISTRO">Suministros Largo Plazo</option><option value="CLIENTE">Decisión Cliente</option><option value="ENTORNO">Entorno / Vecinos</option><option value="NORMATIVA">Normativa</option><option value="OTROS">Otros</option>
                </select>
              </div>
               <div className="formGroup">
                <label>Impacto</label>
                <select className="input-modern" value={newConstraint.impact} onChange={e=>setNewConstraint({...newConstraint, impact:e.target.value})}>
                  <option value="BAJO">Bajo</option><option value="MEDIO">Medio</option><option value="ALTO">Alto</option><option value="BLOQUEANTE">Bloqueante</option>
                </select>
              </div>
              <div className="formGroup">
                <label>Resp. Resolución</label><input type="text" className="input-modern" value={newConstraint.manager} onChange={e=>setNewConstraint({...newConstraint, manager:e.target.value})} />
              </div>
              <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
                <label>Descripción Completa</label><textarea className="input-modern" required rows={2} value={newConstraint.description} onChange={e=>setNewConstraint({...newConstraint, description:e.target.value})} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-primary">Guardar Restricción</button>
              </div>
            </form>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {project.constraints?.length === 0 && <p style={{color:'var(--text-muted)'}}>No hay restricciones registradas.</p>}
            {project.constraints?.map((c: any) => (
              <div key={c.id} className="glass-panel" style={{ padding: '16px', borderLeft: c.impact === 'BLOQUEANTE' ? '4px solid #ef4444' : c.impact === 'ALTO' ? '4px solid #f59e0b' : '4px solid #3b82f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px' }}>{c.title}</h4>
                  <span className="badge" style={{ fontSize: '10px' }}>{c.type}</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>{c.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                  <span>Resp: {c.manager || '-'}</span>
                  <span>Impacto: <strong style={{color: c.impact === 'BLOQUEANTE' ? '#ef4444' : c.impact === 'ALTO' ? '#f59e0b' : '#fff'}}>{c.impact}</strong></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button onClick={() => handleDeleteConstraint(c.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer', fontSize: '12px'}}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
