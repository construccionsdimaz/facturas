"use client";

import { useState } from 'react';
import styles from './page.module.css';

type Client = {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  taxId: string | null;
  createdAt: Date;
  _count?: { invoices: number };
};

export default function ClientManager({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    taxId: ''
  });

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to create client');
      
      const newClient = await res.json();
      setClients([newClient, ...clients]);
      
      // Reset form
      setFormData({ name: '', email: '', address: '', taxId: '' });
      setIsAdding(false);
      
    } catch (error) {
      console.error(error);
      alert('Error creating client. Check console.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.managerContainer}>
      {isAdding ? (
        <div className={`glass-panel ${styles.addClientForm}`}>
          <div className={styles.formHeader}>
            <h2>Add New Client</h2>
            <button className={styles.closeBtn} onClick={() => setIsAdding(false)}>×</button>
          </div>
          <form onSubmit={handleAddClient}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Company/Client Name *</label>
                <input 
                  type="text" 
                  className="input-modern" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Acme Corporation"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Email Address</label>
                <input 
                  type="email" 
                  className="input-modern" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="contact@acme.com"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Tax ID (CIF/NIF/VAT)</label>
                <input 
                  type="text" 
                  className="input-modern" 
                  value={formData.taxId}
                  onChange={e => setFormData({...formData, taxId: e.target.value})}
                  placeholder="B-12345678"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Billing Address</label>
                <input 
                  type="text" 
                  className="input-modern" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="123 Business Rd, City"
                />
              </div>
            </div>
            <div className={styles.formActions}>
              <button type="button" className="btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Client'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className={styles.actionsBar}>
           <div className={styles.searchBox}>
               <input type="text" className="input-modern" placeholder="Search clients..." />
           </div>
           <button className="btn-primary" onClick={() => setIsAdding(true)}>+ New Client</button>
        </div>
      )}

      <div className={`glass-panel ${styles.tableContainer}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Client Details</th>
              <th>Contact</th>
              <th>Tax ID</th>
              <th>Total Invoices</th>
              <th>Added On</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyState}>No clients found. Add your first client above.</td>
              </tr>
            ) : clients.map((client) => (
              <tr key={client.id} className={styles.tableRow}>
                <td className={styles.cellClient}>
                  <div className={styles.clientAvatar}>{client.name.charAt(0).toUpperCase()}</div>
                  <div className={styles.clientInfo}>
                    <span className={styles.clientName}>{client.name}</span>
                  </div>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
