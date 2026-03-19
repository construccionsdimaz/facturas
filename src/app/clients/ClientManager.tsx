"use client";

import { useState } from 'react';
import styles from './page.module.css';
import ConfirmationModal from '@/components/ConfirmationModal';

type Client = {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  taxId: string | null;
  type: string;
  createdAt: string;
  _count?: { invoices: number };
};

const CLIENT_TYPES = [
  { id: 'PARTICULAR', label: 'Particular', color: '#3b82f6' },
  { id: 'EMPRESA', label: 'Empresa', color: '#10b981' },
  { id: 'PROMOTOR', label: 'Promotor', color: '#f59e0b' },
  { id: 'COMUNIDAD', label: 'Comunidad', color: '#8b5cf6' },
  { id: 'INVERSOR', label: 'Inversor', color: '#ec4899' },
  { id: 'INDUSTRIAL', label: 'Industrial / Subcontrata', color: '#64748b' }
];

export default function ClientManager({ initialClients }: { initialClients: any[] }) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [isAdding, setIsAdding] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    taxId: '',
    type: 'PARTICULAR'
  });

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingClient) {
        // Update existing client
        const res = await fetch(`/api/clients/${editingClient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!res.ok) throw new Error('Failed to update client');
        
        const updatedClient = await res.json();
        setClients(clients.map(c => c.id === updatedClient.id ? { ...c, ...updatedClient } : c));
        setEditingClient(null);
      } else {
        // Create new client
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!res.ok) throw new Error('Failed to create client');
        
        const newClient = await res.json();
        setClients([newClient, ...clients]);
        setIsAdding(false);
      }
      
      // Reset form
      setFormData({ name: '', email: '', address: '', taxId: '' });
      
    } catch (error) {
      console.error(error);
      alert('Error al guardar el cliente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (client: Client) => {
    setFormData({
      name: client.name,
      email: client.email || '',
      address: client.address || '',
      taxId: client.taxId || '',
      type: client.type || 'PARTICULAR'
    });
    setEditingClient(client);
    setIsAdding(false);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setModalConfig({ isOpen: true, id, name });
  };

  const confirmDeleteClient = async () => {
    const { id } = modalConfig;
    setModalConfig({ ...modalConfig, isOpen: false });

    setIsLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete client');
      }

      setClients(clients.filter(c => c.id !== id));
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Error al eliminar el cliente.');
    } finally {
      setIsLoading(false);
    }
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingClient(null);
    setFormData({ name: '', email: '', address: '', taxId: '', type: 'PARTICULAR' });
  };

  return (
    <div className={styles.managerContainer}>
      {(isAdding || editingClient) ? (
        <div className={`glass-panel ${styles.addClientForm}`}>
          <div className={styles.formHeader}>
            <h2>{editingClient ? 'Editar Cliente' : 'Añadir Nuevo Cliente'}</h2>
            <button className={styles.closeBtn} onClick={closeForm}>×</button>
          </div>
          <form onSubmit={handleSaveClient}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Nombre Empresa/Cliente *</label>
                <input 
                  type="text" 
                  className="input-modern" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej. Construcciones Dímaz S.L."
                />
              </div>
              <div className={styles.formGroup}>
                <label>Correo Electrónico</label>
                <input 
                  type="email" 
                  className="input-modern" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="contacto@empresa.com"
                />
              </div>
              <div className={styles.formGroup}>
                <label>NIF/CIF</label>
                <input 
                  type="text" 
                  className="input-modern" 
                  value={formData.taxId}
                  onChange={e => setFormData({...formData, taxId: e.target.value})}
                  placeholder="B-12345678"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Dirección de Facturación</label>
                <input 
                  type="text" 
                  className="input-modern" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="Calle Ejemplo 123, Ciudad"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Tipo de Cliente</label>
                <select 
                  className="input-modern"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  {CLIENT_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.formActions}>
              <button type="button" className="btn-secondary" onClick={closeForm}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? 'Guardando...' : (editingClient ? 'Actualizar Cliente' : 'Guardar Cliente')}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className={styles.actionsBar}>
           <div className={styles.searchBox}>
               <input type="text" className="input-modern" placeholder="Buscar clientes..." />
           </div>
           <button className="btn-primary" onClick={() => setIsAdding(true)}>+ Nuevo Cliente</button>
        </div>
      )}

      <div className={`glass-panel ${styles.tableContainer}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Datos del Cliente</th>
              <th>Tipo</th>
              <th>Contacto</th>
              <th>NIF/CIF</th>
              <th>Facturas</th>
              <th>Fecha Alta</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyState}>No se han encontrado clientes. Añade tu primer cliente arriba.</td>
              </tr>
            ) : clients.map((client) => (
              <tr key={client.id} className={styles.tableRow}>
                <td className={styles.cellClient}>
                  <div className={styles.clientAvatar}>{client.name.charAt(0).toUpperCase()}</div>
                  <div className={styles.clientInfo}>
                    <span className={styles.clientName}>{client.name}</span>
                  </div>
                </td>
                <td>
                  {(() => {
                    const typeInfo = CLIENT_TYPES.find(t => t.id === (client.type || 'PARTICULAR'));
                    return (
                      <span className={styles.badge} style={{ 
                        backgroundColor: 'rgba(255,255,255,0.05)', 
                        border: `1px solid ${typeInfo?.color || '#3b82f6'}33`,
                        color: typeInfo?.color || '#3b82f6',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        {typeInfo?.label || 'Particular'}
                      </span>
                    );
                  })()}
                </td>
                <td className={styles.cellContact}>
                    {client.email || <span className={styles.muted}>N/A</span>}
                </td>
                <td className={styles.cellTax}>
                    {client.taxId || <span className={styles.muted}>N/A</span>}
                </td>
                <td className={styles.cellInvoices}>
                    <span className={styles.badge}>{client._count?.invoices || 0}</span>
                </td>
                <td className={styles.cellDate}>
                  {new Date(client.createdAt).toLocaleDateString()}
                </td>
                <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        className={styles.editBtn} 
                        onClick={() => handleEditClick(client)}
                        title="Editar cliente"
                      >
                        ✏️
                      </button>
                      <button 
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteClick(client.id, client.name)}
                        disabled={isLoading}
                        title="Eliminar cliente"
                      >
                        🗑️
                      </button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        title="Eliminar Cliente"
        message={`¿Estás seguro de que deseas eliminar al cliente "${modalConfig.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmDeleteClient}
        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />
    </div>
  );
}
