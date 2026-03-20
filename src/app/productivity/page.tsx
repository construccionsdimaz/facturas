"use client";

import { useState, useEffect } from 'react';
import styles from '@/app/invoices/page.module.css';

export default function ProductivityPage() {
  const [rates, setRates] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterConfidence, setFilterConfidence] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState<any>(null);

  const initialForm = {
    name: '', standardActivityId: '', value: 1.0, unit: 'm2/día',
    category: 'ALBANILERIA', complexity: 'MEDIA', workType: 'GENERICO', locationType: 'INTERIOR',
    confidenceLevel: 'TEORICO', status: 'BORRADOR', description: '', observations: ''
  };
  const [formData, setFormData] = useState<any>(initialForm);

  // Constants
  const categories = [
    'PRELIMINARES', 'DEMOLICIONES', 'ALBANILERIA', 'ESTRUCTURA', 'CUBIERTA', 
    'FONTANERIA', 'SANEAMIENTO', 'ELECTRICIDAD', 'CLIMATIZACION', 'PLADUR', 
    'REVESTIMIENTOS', 'PINTURA', 'CARPINTERIA', 'ACABADOS', 'LIMPIEZA'
  ];
  
  const complexities = ['BAJA', 'MEDIA', 'ALTA'];
  const workTypes = ['GENERICO', 'OBRA_NUEVA', 'REFORMA_PARCIAL', 'REHABILITACION_INTEGRAL'];
  const locationTypes = ['INTERIOR', 'EXTERIOR', 'MIXTO'];
  const confidenceLevels = ['TEORICO', 'BASE_PLANIFICACION', 'ESTIMADO', 'HISTORICO_OBSERVADO'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resRates, resActivities] = await Promise.all([
        fetch('/api/productivity'),
        fetch('/api/standard-activities')
      ]);
      if (resRates.ok) setRates(await resRates.json());
      if (resActivities.ok) setActivities(await resActivities.json());
    } catch(e) { console.error('Error fetching data', e); }
    setIsLoading(false);
  };

  const openForm = (rate?: any) => {
    if (rate) {
      setEditingRate(rate);
      setFormData({
        ...rate,
        standardActivityId: rate.standardActivityId || '',
        description: rate.description || '',
        observations: rate.observations || ''
      });
    } else {
      setEditingRate(null);
      setFormData(initialForm);
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingRate ? `/api/productivity/${editingRate.id}` : '/api/productivity';
      const method = editingRate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...formData, standardActivityId: formData.standardActivityId || null})
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al guardar el rendimiento');
      }

      setShowModal(false);
      fetchData();
    } catch(err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if(!confirm('¿Estás seguro de eliminar este rendimiento de la base histórica de la empresa?')) return;
    try {
      const res = await fetch(`/api/productivity/${id}`, { method: 'DELETE' });
      if(!res.ok) throw new Error('Error al eliminar');
      fetchData();
    } catch(err: any) { alert(err.message); }
  };

  const getConfidenceColor = (level: string) => {
    switch(level) {
      case 'HISTORICO_OBSERVADO': return '#10b981'; // Green
      case 'BASE_PLANIFICACION': return '#3b82f6'; // Blue
      case 'ESTIMADO': return '#f59e0b'; // Orange
      case 'TEORICO': return 'var(--text-muted)'; // Gray
      default: return 'var(--text-muted)';
    }
  };

  const filteredRates = rates.filter(r => {
    const matchQ = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = filterCategory ? r.category === filterCategory : true;
    const matchConf = filterConfidence ? r.confidenceLevel === filterConfidence : true;
    return matchQ && matchCat && matchConf;
  });

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>⏱️ Banco de Rendimientos</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Central histórica de productividad para planificar y autocalcular duraciones en obras.</p>
        </div>
        <button onClick={() => openForm()} className="btn-primary">
          + Nuevo Rendimiento
        </button>
      </div>

      {/* DASHBOARD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{rates.length}</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>Fichas de Rendimiento</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#10b981' }}>{rates.filter(r => r.confidenceLevel === 'HISTORICO_OBSERVADO').length}</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>Basados en Histórico Empírico</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>{activities.length}</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>Actividades disponibles para enlazar</div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* FILTROS */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="🔍 Buscar rendimiento..." 
            className="input-modern"
            style={{ flex: '1', minWidth: '250px' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <select className="input-modern" value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}>
            <option value="">Todas las Familias</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input-modern" value={filterConfidence} onChange={e=>setFilterConfidence(e.target.value)}>
            <option value="">Cualquier Fiabilidad</option>
            {confidenceLevels.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
        </div>

        {/* TABLA DE RESULTADOS */}
        {isLoading ? (
          <p>Cargando banco de rendimientos...</p>
        ) : filteredRates.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron rendimientos que coincidan.</div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Referencia</th>
                  <th>Actividad Enlazada</th>
                  <th>Valor Base</th>
                  <th>Contexto</th>
                  <th>Nivel Fiabilidad</th>
                  <th style={{textAlign:'right'}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRates.map(rate => (
                  <tr key={rate.id}>
                    <td style={{ fontWeight: '500' }}>{rate.name}</td>
                    <td>
                      {rate.standardActivity ? (
                         <span style={{ fontSize: '13px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                           <span style={{ opacity: 0.5 }}>🔗</span> 
                           {rate.standardActivity.code && `[${rate.standardActivity.code}]`} {rate.standardActivity.name}
                         </span>
                      ) : (
                         <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>-- No enlazada --</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{rate.value}</span> 
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '4px' }}>{rate.unit}</span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      <div>{rate.category} • {rate.locationType}</div>
                      <div>Dificultad: {rate.complexity}</div>
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: '11px', padding: '4px 8px', borderRadius: '4px', letterSpacing: '0.5px', fontWeight: 'bold',
                        border: `1px solid ${getConfidenceColor(rate.confidenceLevel)}`,
                        color: getConfidenceColor(rate.confidenceLevel)
                      }}>
                        {rate.confidenceLevel.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{textAlign:'right'}}>
                      <button onClick={() => openForm(rate)} style={{ background:'none', border:'none', color:'var(--accent-primary)', cursor:'pointer', marginRight:'12px' }}>Ajustar</button>
                      <button onClick={() => handleDelete(rate.id)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer' }}>X</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CONFIGURACIÓN RENDIMIENTO */}
      {showModal && (
        <div className="modal-backdrop" style={{ zIndex: 100 }}>
          <div className="modal-content glass-panel" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 20px 0' }}>{editingRate ? 'Edición de Rendimiento' : 'Nuevo Rendimiento Base'}</h2>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px' }}>
                
                {/* Lado Izquierdo: Identificadores y Valor */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', margin: 0 }}>Medición Central</h3>
                  
                  <div className="formGroup">
                    <label>Título del Rendimiento</label>
                    <input required type="text" className="input-modern" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} placeholder="Ej: Alicatado baño estándar porcelánico..." />
                  </div>
                  
                  <div className="formGroup">
                    <label>Vincular a Actividad del Catálogo (Opcional)</label>
                    <select className="input-modern" value={formData.standardActivityId} onChange={e=>{
                       const sid = e.target.value;
                       const act = activities.find(a => a.id === sid);
                       if(act) {
                          setFormData({...formData, standardActivityId: sid, category: act.category, unit: act.defaultUnit});
                       } else {
                          setFormData({...formData, standardActivityId: ''});
                       }
                    }}>
                      <option value="">-- No vincular --</option>
                      {activities.map(a => (
                        <option key={a.id} value={a.id}>{a.code ? `[${a.code}] ` : ''}{a.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
                     <div className="formGroup">
                       <label>Producción</label>
                       <input required type="number" step="0.01" min="0" className="input-modern" value={formData.value} onChange={e=>setFormData({...formData, value:parseFloat(e.target.value)})} style={{ fontSize: '20px', fontWeight: 'bold' }} />
                     </div>
                     <div className="formGroup">
                       <label>Unidad de Tiempo</label>
                       <input required type="text" className="input-modern" value={formData.unit} onChange={e=>setFormData({...formData, unit:e.target.value})} placeholder="Ej: m2/día, ud/hora" />
                     </div>
                  </div>
                  
                  <div className="formGroup">
                    <label>Familia de Oficio</label>
                    <select className="input-modern" value={formData.category} onChange={e=>setFormData({...formData, category:e.target.value})}>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Lado Derecho: Contexto y Calidad */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', margin: 0 }}>Contexto de Uso</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="formGroup">
                      <label>Dificultad</label>
                      <select className="input-modern" value={formData.complexity} onChange={e=>setFormData({...formData, complexity:e.target.value})}>
                        {complexities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="formGroup">
                      <label>Ubicación Típica</label>
                      <select className="input-modern" value={formData.locationType} onChange={e=>setFormData({...formData, locationType:e.target.value})}>
                         {locationTypes.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="formGroup">
                     <label>Nivel de Fiabilidad del Dato</label>
                     <select className="input-modern" value={formData.confidenceLevel} onChange={e=>setFormData({...formData, confidenceLevel:e.target.value})} style={{ color: getConfidenceColor(formData.confidenceLevel), fontWeight: 'bold', background: 'rgba(255,255,255,0.02)' }}>
                        <option value="TEORICO">Teórico (Libros/Internet)</option>
                        <option value="ESTIMADO">Estimación Propia</option>
                        <option value="BASE_PLANIFICACION">Aprobado para Planificar</option>
                        <option value="HISTORICO_OBSERVADO">Demostrado en Obras Reales</option>
                     </select>
                  </div>

                  <div className="formGroup">
                     <label>Estado</label>
                     <select className="input-modern" value={formData.status} onChange={e=>setFormData({...formData, status:e.target.value})}>
                       <option value="BORRADOR">Borrador</option>
                       <option value="VALIDADO">Validado</option>
                       <option value="ACTIVO">Activo</option>
                       <option value="OBSOLETO">Obsoleta</option>
                     </select>
                  </div>
                  
                  <div className="formGroup">
                    <label>Supuestos / Observaciones</label>
                    <textarea className="input-modern" rows={3} value={formData.description} onChange={e=>setFormData({...formData, description:e.target.value})} placeholder="Bajo qué condiciones se asume este rendimiento (nº operarios, medios mecánicos...)" />
                  </div>
                </div>

              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ background: '#10b981' }}>Guardar Rendimiento</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
