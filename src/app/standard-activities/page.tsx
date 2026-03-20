"use client";

import { useState, useEffect } from 'react';
import styles from '@/app/invoices/page.module.css';

export default function StandardActivitiesPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingAct, setEditingAct] = useState<any>(null);

  const initialForm = {
    code: '', name: '', category: 'ALBANILERIA', description: '', observations: '', status: 'BORRADOR',
    defaultUnit: 'ud', requiresQuantity: false, requiresLocation: true, requiresManager: false, requiresCrew: false,
    canBeInSchedule: true, canBeInLookahead: true, canBeInWeeklyPlan: true,
    requiresInspection: false, relatedToPurchases: false, generatesWait: false, actsAsMilestone: false, allowsRepetition: true
  };
  const [formData, setFormData] = useState(initialForm);

  const categories = [
    'PRELIMINARES', 'DEMOLICIONES', 'ALBANILERIA', 'ESTRUCTURA', 'CUBIERTA', 
    'FONTANERIA', 'SANEAMIENTO', 'ELECTRICIDAD', 'CLIMATIZACION', 'PLADUR', 
    'REVESTIMIENTOS', 'PINTURA', 'CARPINTERIA', 'ACABADOS', 'LIMPIEZA', 
    'INSPECCIONES', 'ESPERAS_TECNICAS', 'OTROS'
  ];

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/standard-activities');
      if (res.ok) setActivities(await res.json());
    } catch(e) { console.error('Error fetching standard activities', e); }
    setIsLoading(false);
  };

  const openForm = (act?: any) => {
    if (act) {
      setEditingAct(act);
      setFormData({
        ...act,
        description: act.description || '',
        observations: act.observations || '',
        code: act.code || ''
      });
    } else {
      setEditingAct(null);
      setFormData(initialForm);
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingAct ? `/api/standard-activities/${editingAct.id}` : '/api/standard-activities';
      const method = editingAct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al guardar la actividad');
      }

      setShowModal(false);
      fetchActivities();
    } catch(err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if(!confirm('¿Estás seguro de eliminar esta actividad estándar de toda la plataforma?')) return;
    try {
      const res = await fetch(`/api/standard-activities/${id}`, { method: 'DELETE' });
      if(!res.ok) throw new Error('Error al eliminar');
      fetchActivities();
    } catch(err: any) { alert(err.message); }
  };

  const filteredAct = activities.filter(a => {
    const matchQ = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || (a.code && a.code.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCat = filterCategory ? a.category === filterCategory : true;
    const matchStat = filterStatus ? a.status === filterStatus : true;
    return matchQ && matchCat && matchStat;
  });

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>📚 Catálogo de Actividades Estándar</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Biblioteca central para planificar y estructurar obras recurrentes.</p>
        </div>
        <button onClick={() => openForm()} className="btn-primary">
          + Nueva Actividad Plantilla
        </button>
      </div>

      {/* DASHBOARD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{activities.length}</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>Actividades Totales</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#10b981' }}>{activities.filter(a => a.status === 'ACTIVA').length}</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>Disponibles para uso (Activas)</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', border: activities.filter(a => a.status === 'BORRADOR').length > 0 ? '1px solid #f59e0b' : 'none' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f59e0b' }}>{activities.filter(a => a.status === 'BORRADOR').length}</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>Borradores Pendientes</div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* FILTROS */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="🔍 Buscar por código o nombre..." 
            className="input-modern"
            style={{ flex: '1', minWidth: '250px' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <select className="input-modern" value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}>
            <option value="">Todas las Familias</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input-modern" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="">Todos los Estados</option>
            <option value="BORRADOR">Borrador</option>
            <option value="REVISION">En Revisión</option>
            <option value="ACTIVA">Activa</option>
            <option value="ARCHIVADA">Archivada</option>
            <option value="OBSOLETA">Obsoleta</option>
          </select>
        </div>

        {/* TABLA DE RESULTADOS */}
        {isLoading ? (
          <p>Cargando biblioteca...</p>
        ) : filteredAct.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron actividades de plantilla.</div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Actividad Base</th>
                  <th>Familia</th>
                  <th>Unid</th>
                  <th>Comportamiento</th>
                  <th>Estado</th>
                  <th style={{textAlign:'right'}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAct.map(act => (
                  <tr key={act.id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{act.code || 'S/C'}</td>
                    <td style={{ fontWeight: '500' }}>{act.name}</td>
                    <td><span className="badge" style={{ background: 'rgba(255,255,255,0.05)' }}>{act.category}</span></td>
                    <td>{act.defaultUnit}</td>
                    <td style={{ fontSize: '16px', letterSpacing: '4px', opacity: 0.8 }}>
                      {act.canBeInSchedule ? '📅' : ''}
                      {act.requiresLocation ? '📍' : ''}
                      {act.requiresInspection ? '🔎' : ''}
                      {act.requiresCrew ? '👷' : ''}
                      {act.actsAsMilestone ? '🚩' : ''}
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: '12px', padding: '4px 8px', borderRadius: '4px', 
                        background: act.status === 'ACTIVA' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                        color: act.status === 'ACTIVA' ? '#10b981' : 'var(--text-secondary)'
                      }}>
                        {act.status}
                      </span>
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

      {/* MODAL CONFIGURACIÓN DE ACTIVIDAD */}
      {showModal && (
        <div className="modal-backdrop" style={{ zIndex: 100 }}>
          <div className="modal-content glass-panel" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 20px 0' }}>{editingAct ? 'Edición de Actividad Tipo' : 'Nueva Actividad Tipo'}</h2>
            
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px' }}>
                
                {/* Lado Izquierdo: Datos Generales */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', margin: 0 }}>Identidad</h3>
                  
                  <div className="formGroup">
                    <label>Nombre de la Actividad</label>
                    <input required type="text" className="input-modern" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} placeholder="Ej: Vertido de hormigón en zapatas..." />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="formGroup">
                      <label>Categoría</label>
                      <select className="input-modern" value={formData.category} onChange={e=>setFormData({...formData, category:e.target.value})}>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="formGroup">
                      <label>Código Interno</label>
                      <input type="text" className="input-modern" value={formData.code} onChange={e=>setFormData({...formData, code:e.target.value})} placeholder="Ej: EST-02" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="formGroup">
                      <label>Estado en Catálogo</label>
                      <select className="input-modern" value={formData.status} onChange={e=>setFormData({...formData, status:e.target.value})}>
                        <option value="BORRADOR">Borrador</option>
                        <option value="REVISION">En Revisión</option>
                        <option value="ACTIVA">🟢 Lista para usar (Activa)</option>
                        <option value="ARCHIVADA">Archivada</option>
                        <option value="OBSOLETA">Obsoleta</option>
                      </select>
                    </div>
                    <div className="formGroup">
                      <label>Unidad de Medida (UDM)</label>
                      <input type="text" className="input-modern" value={formData.defaultUnit} onChange={e=>setFormData({...formData, defaultUnit:e.target.value})} placeholder="m2, ml, ud..." />
                    </div>
                  </div>

                  <div className="formGroup">
                    <label>Descripción Operativa</label>
                    <textarea className="input-modern" rows={3} value={formData.description} onChange={e=>setFormData({...formData, description:e.target.value})} placeholder="¿Qué incluye o excluye esta actividad estándar?" />
                  </div>
                </div>

                {/* Lado Derecho: Atributos Funcionales */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', margin: 0 }}>Comportamiento al instanciar</h3>
                  <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-muted)' }}>Estos son los requisitos que el sistema forzará cuando un técnico cargue esta plantilla en su obra.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
                    
                    {/* Banderas de requerimientos */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={formData.requiresQuantity} onChange={e=>setFormData({...formData, requiresQuantity: e.target.checked})} />
                        Requiere Medición/Cantidad
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={formData.requiresLocation} onChange={e=>setFormData({...formData, requiresLocation: e.target.checked})} />
                        📍 Imputar a Ubicación Fís.
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={formData.requiresCrew} onChange={e=>setFormData({...formData, requiresCrew: e.target.checked})} />
                        👷 Fija Cuadrilla propia
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={formData.requiresInspection} onChange={e=>setFormData({...formData, requiresInspection: e.target.checked})} />
                        🔎 Pide Check de Calidad
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={formData.relatedToPurchases} onChange={e=>setFormData({...formData, relatedToPurchases: e.target.checked})} />
                        📦 Sujeta a Recepción Material
                      </label>
                    </div>

                    {/* Banderas de Planeación */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={formData.canBeInSchedule} onChange={e=>setFormData({...formData, canBeInSchedule: e.target.checked})} />
                        📅 Va al Cronograma (Gantt)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={formData.actsAsMilestone} onChange={e=>setFormData({...formData, actsAsMilestone: e.target.checked})} />
                        🚩 Actúa como Hito (Milestone)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={formData.generatesWait} onChange={e=>setFormData({...formData, generatesWait: e.target.checked})} />
                        ⏳ Es de flujo pasivo (Ej: Secado)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', opacity: formData.actsAsMilestone ? 0.4 : 1 }}>
                        <input type="checkbox" disabled={formData.actsAsMilestone} checked={formData.allowsRepetition} onChange={e=>setFormData({...formData, allowsRepetition: e.target.checked})} />
                        🔁 Replicable (Muchas ubicaciones)
                      </label>
                    </div>

                  </div>
                </div>

              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Plantilla</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
