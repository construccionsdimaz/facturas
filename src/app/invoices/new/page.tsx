"use client";

import { useState, useRef, useEffect } from 'react';
import styles from './page.module.css';
import InvoicePDFTemplate from './InvoicePDFTemplate';

interface InvoiceItem {
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
  companyTaxId: string;
  companyLogo: string;
  logoZoom?: number;
  logoX?: number;
  logoY?: number;
  paymentMethod: string;
  bankAccount: string;
  dataProtection: string;
}

export default function NewInvoice() {
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, price: 0 }
  ]);
  
  // Database State
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  
  // Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Transferencia Bancaria');
  const [brandColor, setBrandColor] = useState('#00509d'); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const pdfRef = useRef<HTMLDivElement>(null);

  // Quick Add Client State
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickClientEmail, setQuickClientEmail] = useState('');
  const [quickClientPhone, setQuickClientPhone] = useState('');
  const [quickClientTaxId, setQuickClientTaxId] = useState('');
  const [quickClientAddress, setQuickClientAddress] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Client Search State
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Load Initial Data + Sequential Invoice Number
  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(res => res.json()),
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/invoices').then(res => res.json())
    ]).then(([clientsData, settingsData, invoicesData]) => {
      setClients(clientsData || []);
      setSettings(settingsData || null);
      
      // Generate sequential invoice number
      const year = new Date().getFullYear();
      const existingNumbers = (invoicesData || [])
        .map((inv: any) => {
          const matches = inv.number?.match(/\d+/g);
          return matches ? parseInt(matches[matches.length - 1]) : 0;
        })
        .filter((n: number) => n > 0);
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      setInvoiceNumber(nextNumber.toString().padStart(3, '0'));
      
      if (settingsData?.paymentMethod) {
        setPaymentMethod(settingsData.paymentMethod);
      }
    }).catch(err => console.error("Error loading data", err));
  }, []);

  // Quick Add Client
  const handleQuickAddClient = async () => {
    if (!quickClientName.trim()) return;
    setIsCreatingClient(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: quickClientName, 
          email: quickClientEmail || undefined,
          phone: quickClientPhone || undefined,
          taxId: quickClientTaxId || undefined,
          address: quickClientAddress || undefined
        })
      });
      if (!res.ok) throw new Error('Error');
      const newClient = await res.json();
      setClients(prev => [newClient, ...prev]);
      setSelectedClientId(newClient.id);
      setClientSearch(newClient.name);
      setQuickClientName('');
      setQuickClientEmail('');
      setQuickClientPhone('');
      setQuickClientTaxId('');
      setQuickClientAddress('');
      setShowQuickClient(false);
    } catch {
      alert('Error al crear el cliente.');
    } finally {
      setIsCreatingClient(false);
    }
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const tax = subtotal * 0.21;
  const total = subtotal + tax;

  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Save Invoice to DB only (no PDF)
  const saveInvoice = async () => {
    if (!selectedClientId) {
      alert("Por favor selecciona un cliente antes de guardar.");
      return;
    }
    setIsSaving(true);
    setSaveSuccess('');
    try {
      const invoiceData = {
        number: invoiceNumber,
        clientId: selectedClientId,
        userId: 'demo-user-bypass',
        subtotal,
        taxAmount: tax,
        total,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          price: item.price
        })),
        paymentMethod
      };
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });
      if (!res.ok) throw new Error('Error al guardar');
      setSaveSuccess('✓ Factura guardada correctamente');
      setTimeout(() => setSaveSuccess(''), 4000);
      // Auto-increment for next
      const num = parseInt(invoiceNumber) || 0;
      setInvoiceNumber((num + 1).toString().padStart(3, '0'));
    } catch {
      alert("Error al guardar la factura.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Print / Preview
  const handlePrint = async () => {
    if (!selectedClientId) {
      alert("Por favor selecciona un cliente antes de imprimir.");
      return;
    }
    
    // Save to DB first so the user doesn't lose data
    setIsSaving(true);
    try {
      const invoiceData = {
        number: invoiceNumber,
        clientId: selectedClientId,
        userId: 'demo-user-bypass',
        subtotal,
        taxAmount: tax,
        total,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          price: item.price
        })),
        paymentMethod
      };
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });
      const savedInvoice = await res.json();
      
      // Open print preview in new tab
      if (savedInvoice.id) {
        window.open(`/invoices/${savedInvoice.id}/print`, '_blank');
      }
      
      // Auto-increment
      const num = parseInt(invoiceNumber) || 0;
      setInvoiceNumber((num + 1).toString().padStart(3, '0'));
      setSaveSuccess('✓ Factura emitida - Previsualizando...');
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (error) {
       console.error("Error saving/printing", error);
    } finally {
       setIsSaving(false);
    }
  };

  return (
    <div className={styles.invoiceCreator}>
      {/* Hidden PDF Template for printing */}
      <div ref={pdfRef} className="printable-invoice" style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <InvoicePDFTemplate data={{
          number: invoiceNumber,
          issueDate: new Date().toISOString(),
          dueDate: '',
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
          companyTaxId: settings?.companyTaxId,
          companyLogo: settings?.companyLogo,
          logoZoom: settings?.logoZoom,
          logoX: settings?.logoX,
          logoY: settings?.logoY,
          paymentMethod: paymentMethod,
          bankAccount: settings?.bankAccount,
          dataProtection: settings?.dataProtection
        }} />
      </div>

      <div className={styles.header + " no-print"}>
        <div>
          <h1 className="text-gradient">Crear Nueva Factura</h1>
          <p className={styles.subtitle}>Rellena los datos para generar una nueva factura.</p>
        </div>
        <div className={styles.actions + " no-print"}>
          {saveSuccess && <span style={{ color: '#10b981', marginRight: '16px', fontWeight: 600 }}>{saveSuccess}</span>}
          <button 
            className={`btn-secondary ${styles.saveBtn}`}
            onClick={saveInvoice}
            disabled={isSaving}
            style={{ marginRight: '12px' }}
          >
            {isSaving ? 'Guardando...' : '💾 Guardar Borrador'}
          </button>
          <button 
            className={`btn-primary no-print ${styles.saveBtn}`} 
            onClick={handlePrint}
            disabled={isSaving}
          >
            {isSaving ? 'Procesando...' : '📄 Imprimir / Descargar PDF'}
          </button>
        </div>
      </div>

      <div className={styles.contentGrid + " no-print"}>
        {/* Left Form Panel */}
        <div className={styles.formPanel}>
          <div className={`glass-panel ${styles.card}`}>
            <h3>Datos de la Factura</h3>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Nº Factura</label>
                <input 
                  type="text" 
                  className="input-modern" 
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Fecha Emisión</label>
                <input type="date" className="input-modern" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div className={styles.formGroup}>
                <label>Fecha Vencimiento</label>
                <input type="date" className="input-modern" />
              </div>
              <div className={styles.formGroup}>
                <label>Forma de Pago</label>
                <select 
                  className="input-modern" 
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                  <option value="Efectivo">Efectivo</option>
                </select>
              </div>
            </div>
            
            <div className={styles.divider}></div>
            
            <h3>Información del Cliente</h3>
            <div className={styles.formGroup}>
              <label>Buscar Cliente</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    className="input-modern"
                    placeholder="🔍 Buscar por nombre, DNI, teléfono, email..."
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowClientDropdown(true);
                      if (!e.target.value) setSelectedClientId('');
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
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
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                        background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                      }}>
                        {filtered.map(c => (
                          <div
                            key={c.id}
                            onMouseDown={() => {
                              setSelectedClientId(c.id);
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
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{c.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {[c.taxId, c.phone, c.email].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  {selectedClientId && (
                    <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                      ✓ Cliente seleccionado: {clients.find(c => c.id === selectedClientId)?.name}
                    </div>
                  )}
                </div>
                <button 
                  className="btn-primary" 
                  onClick={() => setShowQuickClient(!showQuickClient)}
                  style={{ padding: '8px 16px', fontSize: '14px', whiteSpace: 'nowrap' }}
                >
                  {showQuickClient ? '✕ Cerrar' : '+ Nuevo'}
                </button>
              </div>
            </div>

            {/* Quick Add Client Inline */}
            {showQuickClient && (
              <div style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.08)', 
                borderRadius: '12px', 
                padding: '20px', 
                marginTop: '12px',
              }}>
                <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
                  ➕ Nuevo Cliente
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                      Nombre / Razón Social *
                    </label>
                    <input
                      type="text"
                      className="input-modern"
                      placeholder="Ej. Juan García / Construcciones Dímaz S.L."
                      value={quickClientName}
                      onChange={(e) => setQuickClientName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                      DNI / NIE / CIF
                    </label>
                    <input
                      type="text"
                      className="input-modern"
                      placeholder="Ej. 12345678A / B-12345678"
                      value={quickClientTaxId}
                      onChange={(e) => setQuickClientTaxId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      className="input-modern"
                      placeholder="Ej. 612 345 678"
                      value={quickClientPhone}
                      onChange={(e) => setQuickClientPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      className="input-modern"
                      placeholder="contacto@empresa.com"
                      value={quickClientEmail}
                      onChange={(e) => setQuickClientEmail(e.target.value)}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                      Dirección
                    </label>
                    <input
                      type="text"
                      className="input-modern"
                      placeholder="Calle, nº, CP, Ciudad"
                      value={quickClientAddress}
                      onChange={(e) => setQuickClientAddress(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => setShowQuickClient(false)}
                    style={{ padding: '8px 16px', fontSize: '14px' }}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleQuickAddClient}
                    disabled={isCreatingClient || !quickClientName.trim()}
                    style={{ padding: '8px 20px', fontSize: '14px' }}
                  >
                    {isCreatingClient ? 'Creando...' : '✓ Crear Cliente'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={`glass-panel ${styles.card}`}>
            <h3>Conceptos</h3>
            <div className={styles.itemsTable}>
              <div className={styles.itemsHeader}>
                <div className={styles.colDesc}>Descripción</div>
                <div className={styles.colQty}>Cant.</div>
                <div className={styles.colPrice}>Precio</div>
                <div className={styles.colTotal}>Total</div>
                <div className={styles.colAction}></div>
              </div>

              {items.map((item) => (
                <div key={item.id} className={styles.itemRow}>
                  <div className={styles.colDesc}>
                    <input 
                      type="text" 
                      className="input-modern" 
                      placeholder="Descripción del servicio o producto" 
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className={styles.colQty}>
                    <input 
                      type="number" 
                      className="input-modern" 
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className={styles.colPrice}>
                    <input 
                      type="number" 
                      className="input-modern" 
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className={styles.colTotal}>
                    {(item.quantity * item.price).toFixed(2)} €
                  </div>
                  <div className={styles.colAction}>
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button className={styles.addBtn} onClick={addItem}>
              + Añadir Concepto
            </button>
          </div>
        </div>

        {/* Right Summary Panel */}
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

          <div className={`glass-panel ${styles.brandCard}`}>
             <h3>Color de Marca</h3>
             <div className={styles.formGroup}>
                <label>Color del Tema</label>
                <div className={styles.colorPicker}>
                   {['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'].map(color => (
                     <div 
                        key={color}
                        className={styles.colorDot} 
                        style={{
                           background: color, 
                           transform: brandColor === color ? 'scale(1.3)' : 'scale(1)',
                           borderColor: brandColor === color ? 'white' : 'transparent'
                        }}
                        onClick={() => setBrandColor(color)}
                     ></div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
