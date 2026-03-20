"use client";

import { useState, useEffect } from 'react';

interface ProjectLocationsTabProps {
  project: any;
}

export default function ProjectLocationsTab({ project }: ProjectLocationsTabProps) {
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingLoc, setEditingLoc] = useState<any>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '', type: 'EDIFICIO', parentId: '', code: '', description: '', status: 'ACTIVA', observations: ''
  });

  const locationTypes = [
    'EDIFICIO', 'PLANTA', 'VIVIENDA', 'ZONA_COMUN', 'EXTERIOR', 'HABITACION', 'BANO', 'COCINA', 'PASILLO', 'SALON', 'TERRAZA', 'FACHADA', 'CUBIERTA', 'PATIO', 'LOCAL_TECNICO', 'GARAJE', 'OTROS'
  ];

  useEffect(() => {
    fetchLocations();
  }, [project.id]);

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/locations`);
      if (res.ok) {
        setLocations(await res.json());
      }
    } catch(e) { console.error('Error fetching locations', e); }
    setIsLoading(false);
  };

  const openForm = (loc?: any, parentId?: string) => {
    if (loc) {
      setEditingLoc(loc);
      setFormData({
        name: loc.name, type: loc.type, parentId: loc.parentId || '', code: loc.code || '', description: loc.description || '', status: loc.status, observations: loc.observations || ''
      });
    } else {
      setEditingLoc(null);
      setFormData({
        name: '', type: 'ESTANCIA', parentId: parentId || '', code: '', description: '', status: 'ACTIVA', observations: ''
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLoc && formData.parentId === editingLoc.id) {
      alert("Una ubicación no puede ser su propio padre");
      return;
    }

    try {
      const url = editingLoc 
        ? `/api/projects/${project.id}/locations/${editingLoc.id}`
        : `/api/projects/${project.id}/locations`;
      const method = editingLoc ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, parentId: formData.parentId || null })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al guardar');
      }

      setShowModal(false);
      fetchLocations();
    } catch(err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if(!confirm('¿Eliminar esta ubicación y dejar a sus hijos huérfanos, o eliminar solo si no tiene hijos? (Solo elimina si no tiene hijos)')) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/locations/${id}`, { method: 'DELETE' });
      if(!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al eliminar');
      }
      fetchLocations();
    } catch(err: any) {
      alert(err.message);
    }
  };

  // Build Tree
  const buildTree = (parentId: string | null = null): any[] => {
    return locations
      .filter(loc => loc.parentId === parentId)
      .map(loc => ({
        ...loc,
        children: buildTree(loc.id)
      }));
  };

  const locationTree = buildTree(null);

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'EDIFICIO': return '#3b82f6';
      case 'PLANTA': return '#10b981';
      case 'VIVIENDA': return '#8b5cf6';
      case 'HABITACION': case 'BANO': case 'COCINA': return '#64748b';
      default: return '#94a3b8';
    }
  };

  const TreeNode = ({ node, level }: { node: any, level: number }) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div style={{ marginLeft: level * 24 + 'px', borderLeft: level > 0 ? '2px solid rgba(255,255,255,0.1)' : 'none', paddingLeft: level > 0 ? '16px' : '0', marginBottom: '8px' }}>
        <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {hasChildren ? (
              <button onClick={() => setExpanded(!expanded)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', width: '20px' }}>
                {expanded ? '▼' : '▶'}
              </button>
            ) : <div style={{width:'20px'}}></div>}
            
            <span className="badge" style={{ background: getBadgeColor(node.type) }}>{node.type}</span>
            <strong style={{ fontSize: '15px' }}>{node.name}</strong>
            {node.code && <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>[{node.code}]</span>}
            <span style={{ fontSize:'12px', color: node.status === 'ACTIVA' ? '#10b981' : 'var(--text-muted)' }}>{node.status}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => openForm(null, node.id)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>+ Sub</button>
            <button onClick={() => openForm(node)} style={{ background:'none', border:'none', color:'var(--accent-primary)', cursor:'pointer', fontSize: '13px' }}>Editar</button>
            <button onClick={() => handleDelete(node.id)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize: '13px' }}>Borrar</button>
          </div>
        </div>
        
        {expanded && hasChildren && (
          <div style={{ marginTop: '8px' }}>
            {node.children.map((child: any) => (
              <TreeNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Dashboard Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{locations.length}</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Total Ubicaciones</div>
        </div>
        {locationTypes.slice(0, 4).map(type => {
          const count = locations.filter(l => l.type === type).length;
          if (count === 0) return null;
          return (
            <div key={type} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{count}</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{type}s</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Estructura Física de la Obra</h3>
        <button onClick={() => openForm()} className="btn-primary">+ Nueva Ubicación Principal</button>
      </div>

      {isLoading ? (
        <p>Cargando ubicaciones...</p>
      ) : locations.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>La obra aún no tiene ubicaciones definidas.</p>
          <button onClick={() => openForm()} className="btn-primary">Empezar a dividir la obra</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {locationTree.map(rootNode => (
            <TreeNode key={rootNode.id} node={rootNode} level={0} />
          ))}
        </div>
      )}

      {/* Modal Creación / Edición */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel" style={{ width: '100%', maxWidth: '600px' }}>
             <h3 style={{ margin: '0 0 20px 0' }}>{editingLoc ? 'Editar Ubicación' : 'Nueva Ubicación'}</h3>
             
             <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
               <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
                 <label>Nombre de la Ubicación</label>
                 <input type="text" className="input-modern" required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} placeholder="Ej: Planta Baja, Habitación 01..." />
               </div>

               <div className="formGroup">
                 <label>Tipo</label>
                 <select className="input-modern" value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})}>
                   {locationTypes.map(t => <option key={t} value={t}>{t}</option>)}
                 </select>
               </div>

               <div className="formGroup">
                 <label>Ubicación Padre (Dónde está dentro)</label>
                 <select className="input-modern" value={formData.parentId} onChange={e=>setFormData({...formData, parentId: e.target.value})}>
                   <option value="">[Ubicación Raíz / Principal]</option>
                   {locations.map(l => (
                     <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                   ))}
                 </select>
                 {editingLoc && <small style={{color:'var(--text-muted)'}}>Cambiar de padre moverá toda la rama.</small>}
               </div>

               <div className="formGroup">
                 <label>Referencia Interna (Código)</label>
                 <input type="text" className="input-modern" value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} />
               </div>

               <div className="formGroup">
                 <label>Estado</label>
                 <select className="input-modern" value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})}>
                   <option value="PENDIENTE">Pendiente</option>
                   <option value="ACTIVA">Activa</option>
                   <option value="CERRADA">Cerrada</option>
                   <option value="BLOQUEADA">Bloqueada</option>
                   <option value="FUERA_ALCANCE">Fuera de Alcance</option>
                 </select>
               </div>

               <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
                 <label>Descripción / Observaciones</label>
                 <textarea className="input-modern" rows={3} value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} />
               </div>

               <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                 <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                 <button type="submit" className="btn-primary">Guardar Ubicación</button>
               </div>
             </form>
          </div>
        </div>
      )}

    </div>
  );
}
