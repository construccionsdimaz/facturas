"use client";

import { useState, useRef, useEffect } from 'react';
import styles from '../../invoices/new/page.module.css';
import EstimatePDFTemplate from '../EstimatePDFTemplate';

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

interface CompanySettings {
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyZip: string;
  companyProvince: string;
  companyTaxId: string;
  companyLogo: string;
  logoZoom?: number;
  logoX?: number;
  logoY?: number;
  paymentMethod: string;
  bankAccount: string;
  dataProtection: string;
}

export default function NewEstimate() {
  const [items, setItems] = useState<EstimateItem[]>([
    { id: '1', description: '', quantity: 1, price: 0 }
  ]);
  
  // Database State
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  
  // Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [estimateNumber, setEstimateNumber] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [brandColor, setBrandColor] = useState('#8b5cf6'); // Purple for estimates to distinguish from blue invoices
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const pdfRef = useRef<HTMLDivElement>(null);

  // Quick Add Client State (omitting for brevity or keeping simple)
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Load Initial Data + Sequential Estimate Number
  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(res => res.json()),
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/estimates').then(res => res.json())
    ]).then(([clientsData, settingsData, estimatesData]) => {
      setClients(clientsData || []);
      setSettings(settingsData || null);
      
      // Generate sequential estimate number
      const year = new Date().getFullYear();
      const existingNumbers = (estimatesData || [])
        .map((est: any) => {
          const matches = est.number?.match(/\d+/g);
          return matches ? parseInt(matches[matches.length - 1]) : 0;
        })
        .filter((n: number) => n > 0);
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      setEstimateNumber(`PRE-${year}-${nextNumber.toString().padStart(3, '0')}`);
      
    }).catch(err => console.error("Error loading data", err));
  }, []);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof EstimateItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const tax = subtotal * 0.21;
  const total = subtotal + tax;

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const saveEstimate = async () => {
    if (!selectedClientId) {
      alert("Por favor selecciona un cliente antes de guardar.");
      return;
    }
    setIsSaving(true);
    setSaveSuccess('');
    try {
      const estimateData = {
        number: estimateNumber,
        clientId: selectedClientId,
        subtotal,
        taxAmount: tax,
        total,
        validUntil: validUntil || undefined,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          price: item.price
        }))
      };
      const res = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estimateData)
      });
      if (!res.ok) throw new Error('Error al guardar');
      setSaveSuccess('✓ Presupuesto guardado correctamente');
      setTimeout(() => setSaveSuccess(''), 4000);
      
      // Refresh increment
      const year = new Date().getFullYear();
      const currentNum = parseInt(estimateNumber.split('-').pop() || '0');
      setEstimateNumber(`PRE-${year}-${(currentNum + 1).toString().padStart(3, '0')}`);
      
    } catch {
      alert("Error al guardar el presupuesto.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.invoiceCreator}>
       {/* Hidden PDF Component */}
       <div ref={pdfRef} className="printable-invoice" style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <EstimatePDFTemplate data={{
          number: estimateNumber,
          issueDate: new Date().toISOString(),
          validUntil: validUntil,
          clientName: selectedClient?.name || '',
          clientAddress: selectedClient?.address || '',
          clientTaxId: selectedClient?.taxId || '',
          items: items,
          subtotal: subtotal,
          tax: tax,
          total: total,
          brandColor: brandColor,
          companyName: settings?.companyName,
          companyAddress: settings?.companyAddress,
          companyCity: settings?.companyCity,
          companyZip: settings?.companyZip,
          companyProvince: settings?.companyProvince,
          companyTaxId: settings?.companyTaxId,
          companyLogo: settings?.companyLogo,
          logoZoom: settings?.logoZoom,
          logoX: settings?.logoX,
          logoY: settings?.logoY,
          paymentMethod: settings?.paymentMethod,
          bankAccount: settings?.bankAccount,
          dataProtection: settings?.dataProtection
        }} />
      </div>

      <div className={styles.header + " no-print"}>
        <div>
          <h1 className="text-gradient">Crear Nuevo Presupuesto</h1>
          <p className={styles.subtitle}>Genera una propuesta comercial para tu cliente.</p>
        </div>
        <div className={styles.actions + " no-print"}>
          {saveSuccess && <span style={{ color: '#10b981', marginRight: '16px', fontWeight: 600 }}>{saveSuccess}</span>}
          <button 
            className={`btn-primary ${styles.saveBtn}`} 
            onClick={saveEstimate}
            disabled={isSaving}
          >
            {isSaving ? 'Guardando...' : '💾 Guardar Presupuesto'}
          </button>
        </div>
      </div>

      <div className={styles.contentGrid + " no-print"}>
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
                <label>Fecha Emisión</label>
                <input type="date" className="input-modern" defaultValue={new Date().toISOString().split('T')[0]} />
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
            </div>
            
            <div className={styles.divider}></div>
            
            <h3>Información del Cliente</h3>
            <div className={styles.formGroup}>
              <label>Buscar Cliente</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-modern"
                  placeholder="🔍 Buscar cliente..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                />
                {showClientDropdown && clientSearch && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto'
                  }}>
                    {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                      <div
                        key={c.id}
                        onMouseDown={() => {
                          setSelectedClientId(c.id);
                          setClientSearch(c.name);
                          setShowClientDropdown(false);
                        }}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        {c.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`glass-panel ${styles.card}`}>
            <h3>Conceptos del Presupuesto</h3>
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
                  <div className={styles.colTotal}>
                    {(item.quantity * item.price).toFixed(2)} €
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
