"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from '@/app/invoices/new/page.module.css';

interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

interface Client {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  phone: string | null;
  taxId: string | null;
}

export default function EditEstimatePage() {
  const router = useRouter();
  const params = useParams();
  const estimateId = params.id as string;
  
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [estimateNumber, setEstimateNumber] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Client search
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  useEffect(() => {
    if (!estimateId) return;

    // Load estimate + clients
    Promise.all([
      fetch(`/api/estimates/${estimateId}`).then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
    ]).then(([estimate, clientsData]) => {
      setEstimateNumber(estimate.number);
      setSelectedClientId(estimate.clientId);
      setClientSearch(estimate.client?.name || '');
      setValidUntil(estimate.validUntil ? estimate.validUntil.split('T')[0] : '');
      setStatus(estimate.status);
      setItems(estimate.items.map((item: any) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
      })));
      setClients(clientsData || []);
      setIsLoading(false);
    });
  }, [estimateId]);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof EstimateItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const tax = subtotal * 0.21;
  const total = subtotal + tax;

  const handleSave = async () => {
    if (!selectedClientId) {
      alert("Por favor selecciona un cliente.");
      return;
    }
    setIsSaving(true);
    setSaveSuccess('');
    try {
      const res = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: estimateNumber,
          clientId: selectedClientId,
          subtotal,
          taxAmount: tax,
          total,
          status,
          validUntil: validUntil || null,
          items: items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
          }))
        })
      });
      if (!res.ok) throw new Error('Error');
      setSaveSuccess('✓ Presupuesto actualizado correctamente');
      setTimeout(() => {
        router.push(`/estimates/${estimateId}`);
      }, 1500);
    } catch {
      alert("Error al guardar el presupuesto.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: 'var(--text-secondary)' }}>
        Cargando presupuesto...
      </div>
    );
  }

  return (
    <div className={styles.invoiceCreator}>
      <div className={styles.header}>
        <div>
          <button onClick={() => router.push(`/estimates/${estimateId}`)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
            ← Volver al presupuesto
          </button>
          <h1 className="text-gradient">Editar Presupuesto {estimateNumber}</h1>
          <p className={styles.subtitle}>Modifica los datos del presupuesto.</p>
        </div>
        <div className={styles.actions}>
          {saveSuccess && <span style={{ color: '#10b981', marginRight: '16px', fontWeight: 600 }}>{saveSuccess}</span>}
          <button
            className="btn-secondary"
            onClick={() => router.push(`/estimates/${estimateId}`)}
            style={{ marginRight: '12px' }}
          >
            Cancelar
          </button>
          <button 
            className={`btn-primary ${styles.saveBtn}`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.formPanel}>
          <div className={`glass-panel ${styles.card}`}>
            <h3>Datos del Presupuesto</h3>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Nº Presupuesto</label>
                <input 
                  type="text" 
                  className="input-modern" 
                  value={estimateNumber}
                  onChange={(e) => setEstimateNumber(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Válido hasta</label>
                <input 
                  type="date" 
                  className="input-modern" 
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Estado</label>
                <select 
                  className="input-modern" 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="DRAFT">Borrador</option>
                  <option value="SENT">Enviado</option>
                  <option value="ACCEPTED">Aceptado</option>
                  <option value="REJECTED">Rechazado</option>
                  <option value="CONVERTED" disabled>Convertido</option>
                </select>
              </div>
            </div>
          </div>

          <div className={`glass-panel ${styles.card}`}>
            <h3>Conceptos</h3>
            <div className={styles.itemsTable}>
              {items.map((item) => (
                <div key={item.id} className={styles.itemRow}>
                  <div className={styles.colDesc}>
                    <input 
                      type="text" 
                      className="input-modern" 
                      placeholder="Descripción" 
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className={styles.colQty}>
                    <input 
                      type="number" 
                      className="input-modern" 
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className={styles.colPrice}>
                    <input 
                      type="number" 
                      className="input-modern" 
                      value={item.price}
                      onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className={styles.colAction}>
                    <button className={styles.deleteBtn} onClick={() => removeItem(item.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <button className={styles.addBtn} onClick={addItem}>+ Añadir Concepto</button>
          </div>
        </div>

        <div className={styles.summaryPanel}>
          <div className={`glass-panel ${styles.summaryCard}`}>
            <h3>Resumen</h3>
            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>
            <div className={styles.summaryRow}>
              <span>IVA (21%)</span>
              <span>{tax.toFixed(2)} €</span>
            </div>
            <div className={styles.divider}></div>
            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
              <span>Total</span>
              <span className="text-gradient">{total.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
