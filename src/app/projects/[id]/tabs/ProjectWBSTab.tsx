"use client";

import { useState, useEffect } from 'react';

interface ProjectWBSTabProps {
  project: any;
}

export default function ProjectWBSTab({ project }: ProjectWBSTabProps) {
  const [wbsItems, setWbsItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '', level: 'CAPITULO', parentId: '', code: '', description: '', status: 'PENDIENTE', observations: ''
  });

  const wbsLevels = [
    'CAPITULO', 'SUBCAPITULO', 'PARTIDA', 'PAQUETE_TRABAJO', 'ACTIVIDAD', 'OTRO'
  ];

  useEffect(() => {
    fetchWBS();
  }, [project.id]);

  const fetchWBS = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/wbs`);
      if (res.ok) {
        setWbsItems(await res.json());
      }
    } catch(e) { console.error('Error fetching WBS', e); }
    setIsLoading(false);
  };

  const openForm = (item?: any, parentId?: string) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name, level: item.level, parentId: item.parentId || '', code: item.code || '', description: item.description || '', status: item.status, observations: item.observations || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '', level: parentId ? 'PARTIDA' : 'CAPITULO', parentId: parentId || '', code: '', description: '', status: 'PREPARACION', observations: ''
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem && formData.parentId === editingItem.id) {
      alert("Un elemento no puede ser su propio padre");
      return;
    }

    try {
      const url = editingItem 
        ? `/api/projects/${project.id}/wbs/${editingItem.id}`
        : `/api/projects/${project.id}/wbs`;
      const method = editingItem ? 'PUT' : 'POST';

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
      fetchWBS();
    } catch(err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if(!confirm('¿Estás seguro de eliminar este elemento? Si tiene sub-elementos, la operación será bloqueada.')) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/wbs/${id}`, { method: 'DELETE' });
      if(!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al eliminar');
      }
      fetchWBS();
    } catch(err: any) {
      alert(err.message);
    }
  };

  // Build Tree
  const buildTree = (parentId: string | null = null): any[] => {
    return wbsItems
      .filter(item => item.parentId === parentId)
      .map(item => ({
        ...item,
        children: buildTree(item.id)
      }));
  };

  const wbsTree = buildTree(null);

  const getLevelStyles = (level: string) => {
    switch (level) {
      case 'CAPITULO': return { bg: 'rgba(255,255,255,0.08)', fontWeight: 'bold', fontSize: '16px', color: 'var(--text-primary)' };
      case 'SUBCAPITULO': return { bg: 'rgba(255,255,255,0.04)', fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)' };
      case 'PARTIDA': return { bg: 'transparent', fontWeight: '500', fontSize: '14px', color: 'var(--text-secondary)' };
      default: return { bg: 'transparent', fontWeight: '400', fontSize: '13px', color: 'var(--text-muted)' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVA': return '#10b981';
      case 'CERRADA': return '#3b82f6';
      case 'BLOQUEADA': return '#ef4444';
      default: return 'var(--text-muted)';
    }
  };

  const TreeNode = ({ node, treeLevel }: { node: any, treeLevel: number }) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const styles = getLevelStyles(node.level);

    return (
      <div style={{ marginLeft: treeLevel > 0 ? '24px' : '0', borderLeft: treeLevel > 0 ? '1px dashed rgba(255,255,255,0.1)' : 'none', paddingLeft: treeLevel > 0 ? '16px' : '0', marginBottom: treeLevel === 0 ? '12px' : '4px' }}>
        <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: styles.bg, borderRadius: '6px', border: treeLevel===0?'1px solid rgba(255,255,255,0.1)':'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {hasChildren ? (
              <button onClick={() => setExpanded(!expanded)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', width: '20px', padding: 0 }}>
                {expanded ? '▼' : '▶'}
              </button>
            ) : <div style={{width:'20px'}}></div>}
            
            {node.code && (
              <span style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--accent-primary)', minWidth: '60px' }}>
                {node.code}
              </span>
            )}
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{node.level}</span>
            <strong style={{ fontSize: styles.fontSize, fontWeight: styles.fontWeight as any, color: styles.color }}>{node.name}</strong>
            <span style={{ fontSize:'12px', color: getStatusColor(node.status) }}>• {node.status}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', opacity: 0.7 }}>
            <button onClick={() => openForm(null, node.id)} className="btn-secondary" style={{ padding: '2px 6px', fontSize: '11px', background:'rgba(255,255,255,0.05)' }}>+ Hijo</button>
            <button onClick={() => openForm(node)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize: '13px' }}>Editar</button>
            <button onClick={() => handleDelete(node.id)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize: '13px' }}>Borrar</button>
          </div>
        </div>
        
        {expanded && hasChildren && (
          <div style={{ marginTop: '4px' }}>
            {node.children.map((child: any) => (
              <TreeNode key={child.id} node={child} treeLevel={treeLevel + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Dashboard Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '3px solid var(--accent-primary)' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{wbsItems.length}</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Total Elementos WBS</div>
        </div>
        {['CAPITULO', 'SUBCAPITULO', 'PARTIDA'].map(level => {
          const count = wbsItems.filter(l => l.level === level).length;
          return (
            <div key={level} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: count === 0 ? 'var(--text-muted)' : 'white' }}>{count}</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{level}s</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0 }}>Estructura de Partidas (WBS)</h3>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Desglose de trabajos que conforman el alcance de la obra.</p>
        </div>
        <button onClick={() => openForm()} className="btn-primary">+ Nuevo Capítulo Raíz</button>
      </div>

      {isLoading ? (
        <p>Cargando alcance...</p>
      ) : wbsItems.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>No hay partidas definidas en esta obra.</p>
          <button onClick={() => openForm()} className="btn-primary">Crear el primer Capítulo</button>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          {wbsTree.map(rootNode => (
            <TreeNode key={rootNode.id} node={rootNode} treeLevel={0} />
          ))}
        </div>
      )}

      {/* Modal Creación / Edición */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel" style={{ width: '100%', maxWidth: '600px' }}>
             <h3 style={{ margin: '0 0 20px 0' }}>{editingItem ? 'Editar Elemento WBS' : 'Nuevo Elemento WBS'}</h3>
             
             <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
               <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
                 <label>Nombre / Título</label>
                 <input type="text" className="input-modern" required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} placeholder="Ej: Movimiento de Tierras, Cimentación, Pintura..." />
               </div>

               <div className="formGroup">
                 <label>Código (WBS)</label>
                 <input type="text" className="input-modern" value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} placeholder="Ej: 01, 01.02..." />
               </div>

               <div className="formGroup">
                 <label>Nivel Jerárquico</label>
                 <select className="input-modern" value={formData.level} onChange={e=>setFormData({...formData, level: e.target.value})}>
                   {wbsLevels.map(t => <option key={t} value={t}>{t}</option>)}
                 </select>
               </div>

               <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
                 <label>Elemento Padre (De dónde cuelga)</label>
                 <select className="input-modern" value={formData.parentId} onChange={e=>setFormData({...formData, parentId: e.target.value})}>
                   <option value="">[Nivel Raíz]</option>
                   {wbsItems.map(l => (
                     <option key={l.id} value={l.id}>{l.code ? `${l.code} ` : ''}{l.name} ({l.level})</option>
                   ))}
                 </select>
               </div>

               <div className="formGroup">
                 <label>Estado Inicial</label>
                 <select className="input-modern" value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})}>
                   <option value="PENDIENTE">Pendiente</option>
                   <option value="PREPARACION">En Preparación</option>
                   <option value="ACTIVA">Activa / En Ejecución</option>
                   <option value="CERRADA">Cerrada</option>
                   <option value="BLOQUEADA">Bloqueada</option>
                   <option value="NO_APLICABLE">No Aplicable</option>
                 </select>
               </div>

               <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
                 <label>Descripción del Alcance / Observaciones</label>
                 <textarea className="input-modern" rows={3} value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} />
               </div>

               <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                 <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                 <button type="submit" className="btn-primary">Guardar Alcance</button>
               </div>
             </form>
          </div>
        </div>
      )}

    </div>
  );
}
