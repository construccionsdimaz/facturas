"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import invStyles from '@/app/invoices/page.module.css';
import styles from '../page.module.css';
import ConfirmationModal from '@/components/ConfirmationModal';

interface ProjectDetailClientProps {
  project: {
    id: string;
    clientId: string;
    name: string;
    description: string | null;
    address: string | null;
    status: string;
    client: { name: string };
    invoices: any[];
    estimates: any[];
  };
  clients: any[];
}

export default function ProjectDetailClient({ project: initialProject, clients }: ProjectDetailClientProps) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [activeTab, setActiveTab] = useState<'invoices' | 'estimates'>('invoices');
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(project.name);
  const [editedDescription, setEditedDescription] = useState(project.description || '');
  const [editedAddress, setEditedAddress] = useState(project.address || '');
  const [editedClientId, setEditedClientId] = useState(project.clientId);
  const [isSaving, setIsSaving] = useState(false);

  // Search state
  const [clientSearch, setClientSearch] = useState(project.client.name);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalInvoiced = project.invoices.reduce((sum, inv) => sum + inv.total, 0);

  const handleUpdate = async () => {
    if (!editedName || !editedClientId) {
      alert("Por favor rellena el nombre y selecciona un cliente.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editedName,
          description: editedDescription,
          address: editedAddress,
          status: project.status,
          clientId: editedClientId
        })
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      
      // Update local state with the new client data that might come back from API
      // Or just refresh the page since it's cleaner to get the full include data
      router.refresh(); 
      setProject({ ...project, ...updated });
      setIsEditing(false);
    } catch (error) {
      alert('Error al actualizar la obra');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = project.status === 'ACTIVE' ? 'COMPLETED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus
        })
      });
      if (!res.ok) throw new Error('Failed to update status');
      setProject({ ...project, status: newStatus });
    } catch (error) {
      alert('Error al cambiar el estado');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/projects');
    } catch (error) {
      alert('Error al eliminar la obra');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        {!isEditing ? (
          <>
            <button className="btn-secondary" onClick={() => setIsEditing(true)}>✏️ Editar Obra</button>
            <button className="btn-secondary" onClick={handleToggleStatus}>
              {project.status === 'ACTIVE' ? '✅ Finalizar Obra' : '🚀 Reactivar Obra'}
            </button>
            <button className="btn-secondary" style={{ color: '#ff4444' }} onClick={() => setShowDeleteModal(true)}>🗑️ Eliminar</button>
          </>
        ) : (
          <>
            <button className="btn-secondary" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancelar</button>
            <button className="btn-primary" onClick={handleUpdate} disabled={isSaving}>
              {isSaving ? 'Guardando...' : '💾 Guardar Cambios'}
            </button>
          </>
        )}
      </div>

      {isEditing ? (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3>Editar Información de la Obra</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div className={styles.formGroup}>
              <label>Cliente Vinculado *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-modern"
                  placeholder="🔍 Buscar por nombre, DNI, teléfono..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                    if (!e.target.value) setEditedClientId('');
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                  required={!editedClientId}
                />
                {showClientDropdown && clientSearch && (() => {
                  const query = clientSearch.toLowerCase();
                  const filtered = clients.filter(c =>
                    c.name.toLowerCase().includes(query) ||
                    (c.taxId && c.taxId.toLowerCase().includes(query)) ||
                    (c.phone && c.phone.toLowerCase().includes(query)) ||
                    (c.email && c.email.toLowerCase().includes(query))
                  );
                  return filtered.length > 0 ? (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                      background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                    }}>
                      {filtered.map(c => (
                        <div
                          key={c.id}
                          onMouseDown={() => {
                            setEditedClientId(c.id);
                            setClientSearch(c.name);
                            setShowClientDropdown(false);
                          }}
                          style={{
                            padding: '10px 14px', cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{c.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {[c.taxId, c.phone, c.email].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}
                {editedClientId && (
                  <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                    ✓ Cliente seleccionado: {clients.find(c => c.id === editedClientId)?.name}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Nombre de la Obra *</label>
              <input 
                type="text" 
                className="input-modern" 
                value={editedName} 
                onChange={(e) => setEditedName(e.target.value)} 
              />
            </div>
            <div className={styles.formGroup}>
              <label>Dirección / Localización</label>
              <input 
                type="text" 
                className="input-modern" 
                value={editedAddress} 
                onChange={(e) => setEditedAddress(e.target.value)} 
              />
            </div>
            <div className={styles.formGroup}>
              <label>Descripción / Notas</label>
              <textarea 
                className="input-modern" 
                style={{ minHeight: '100px', resize: 'vertical' }}
                value={editedDescription} 
                onChange={(e) => setEditedDescription(e.target.value)}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="metricsGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>CLIENTE</div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>{project.client.name}</div>
            {project.address && (
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>📍 {project.address}</div>
            )}
          </div>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>TOTAL FACTURADO</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-primary)' }}>
              {totalInvoiced.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>ESTADO</div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>
              <span className={`badge badge-${project.status === 'ACTIVE' ? 'success' : 'warning'}`}>
                  {project.status === 'ACTIVE' ? 'ACTIVA' : 'FINALIZADA'}
              </span>
            </div>
          </div>
        </div>
      )}

      {!isEditing && project.description && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>DESCRIPCIÓN</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{project.description}</div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '0' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <button 
            onClick={() => setActiveTab('invoices')}
            style={{ 
              padding: '16px 24px', 
              color: activeTab === 'invoices' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'invoices' ? '2px solid var(--accent-primary)' : 'none',
              background: 'none',
              fontWeight: '600'
            }}
          >
            Facturas ({project.invoices.length})
          </button>
          <button 
            onClick={() => setActiveTab('estimates')}
            style={{ 
              padding: '16px 24px', 
              color: activeTab === 'estimates' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'estimates' ? '2px solid var(--accent-primary)' : 'none',
              background: 'none',
              fontWeight: '600'
            }}
          >
            Presupuestos ({project.estimates.length})
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {activeTab === 'invoices' ? (
            <table className={invStyles.table}>
              <thead>
                <tr>
                  <th>Nº Factura</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {project.invoices.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No hay facturas vinculadas.</td></tr>
                ) : project.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td><Link href={`/invoices/${inv.id}`} className={styles.rowLink}>{inv.number}</Link></td>
                    <td>{new Date(inv.issueDate).toLocaleDateString()}</td>
                    <td>{inv.total.toFixed(2)} €</td>
                    <td>
                      <span className={`badge badge-${inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'danger' : 'warning'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className={invStyles.table}>
              <thead>
                <tr>
                  <th>Nº Presupuesto</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {project.estimates.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No hay presupuestos vinculados.</td></tr>
                ) : project.estimates.map((est) => (
                  <tr key={est.id}>
                    <td><Link href={`/estimates/${est.id}`} className={styles.rowLink}>{est.number}</Link></td>
                    <td>{new Date(est.issueDate).toLocaleDateString()}</td>
                    <td>{est.total.toFixed(2)} €</td>
                    <td>
                      <span className={`badge badge-${est.status === 'ACCEPTED' ? 'success' : 'warning'}`}>
                        {est.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmationModal 
        isOpen={showDeleteModal}
        title="¿Eliminar Obra?"
        message="Esta acción no se puede deshacer. Los documentos asociados (facturas y presupuestos) no se borrarán, pero dejarán de estar vinculados a esta obra."
        confirmLabel={isDeleting ? "Eliminando..." : "Sí, Eliminar"}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
