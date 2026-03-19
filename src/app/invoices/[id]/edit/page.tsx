"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../new/page.module.css';

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

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [invoiceId, setInvoiceId] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Transferencia Bancaria');
  const [language, setLanguage] = useState('ES');
  const [spellcheckLang, setSpellcheckLang] = useState('ES');
  
  // Calculation States
  const [taxRate, setTaxRate] = useState(21);
  const [taxAmount, setTaxAmount] = useState(0);
  const [total, setTotal] = useState(0);

  // Client search
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  useEffect(() => {
    params.then(p => {
      setInvoiceId(p.id);
      // Load invoice + clients
      Promise.all([
        fetch(`/api/invoices/${p.id}`).then(r => r.json()),
        fetch('/api/clients').then(r => r.json()),
      ]).then(([invoice, clientsData]) => {
        setInvoiceNumber(invoice.number);
        setSelectedClientId(invoice.clientId);
        setClientSearch(invoice.client?.name || '');
        setItems(invoice.items.map((item: any) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
        })));
        setIssueDate(invoice.issueDate ? invoice.issueDate.split('T')[0] : '');
        setDueDate(invoice.dueDate ? invoice.dueDate.split('T')[0] : '');
        if (invoice.language) {
          setLanguage(invoice.language);
        }
        if (invoice.paymentMethod) {
          setPaymentMethod(invoice.paymentMethod);
        }
        if (invoice.taxAmount !== undefined) {
          setTaxAmount(invoice.taxAmount);
        }
        if (invoice.total !== undefined) {
          setTotal(invoice.total);
        }
        if (invoice.subtotal > 0 && invoice.taxAmount !== undefined) {
          setTaxRate((invoice.taxAmount / invoice.subtotal) * 100);
        }
        setClients(clientsData || []);
        setIsLoading(false);
      });
    });
  }, [params]);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  
  // Sync calculations when items or taxRate change (only if not manually edited? 
  // No, in edit mode we should probably sync initially or when items change)
  useEffect(() => {
    // We only want to auto-sync if items change, but we should be careful not to overwrite manual edits 
    // if the items didn't change. However, usually subtotal change implies items change.
    const newTax = subtotal * (taxRate / 100);
    setTaxAmount(newTax);
    setTotal(subtotal + newTax);
  }, [subtotal, taxRate]);

  const handleTaxAmountChange = (val: number) => {
    setTaxAmount(val);
    setTotal(subtotal + val);
    if (subtotal !== 0) {
      setTaxRate((val / subtotal) * 100);
    }
  };

  const handleTotalChange = (val: number) => {
    setTotal(val);
    const newTax = val - subtotal;
    setTaxAmount(newTax);
    if (subtotal !== 0) {
      setTaxRate((newTax / subtotal) * 100);
    }
  };

  const handleTaxRateChange = (val: number) => {
    setTaxRate(val);
    const newTax = subtotal * (val / 100);
    setTaxAmount(newTax);
    setTotal(subtotal + newTax);
  };

  const handleSave = async () => {
    if (!selectedClientId) {
      alert("Por favor selecciona un cliente.");
      return;
    }
    setIsSaving(true);
    setSaveSuccess('');
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: invoiceNumber,
          clientId: selectedClientId,
          subtotal,
          taxAmount,
          total,
          items: items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
          })),
          paymentMethod,
          language,
          issueDate,
          dueDate
        })
      });
      if (!res.ok) throw new Error('Error');
      setSaveSuccess('✓ Factura actualizada correctamente');
      setTimeout(() => {
        router.push(`/invoices/${invoiceId}`);
      }, 1500);
    } catch {
      alert("Error al guardar la factura.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: 'var(--text-secondary)' }}>
        Cargando factura...
      </div>
    );
  }

  return (
    <div className={styles.invoiceCreator}>
      <div className={styles.header}>
        <div>
          <a href={`/invoices/${invoiceId}`} style={{ color: 'var(--text-secondary)', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
            ← Volver a la factura
          </a>
          <h1 className="text-gradient">Editar Factura {invoiceNumber}</h1>
          <p className={styles.subtitle}>Modifica los datos de la factura.</p>
        </div>
        <div className={styles.actions}>
          {saveSuccess && <span style={{ color: '#10b981', marginRight: '16px', fontWeight: 600 }}>{saveSuccess}</span>}
          <button
            className="btn-secondary"
            onClick={() => router.push(`/invoices/${invoiceId}`)}
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
                <input 
                  type="date" 
                  className="input-modern" 
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Fecha Vencimiento</label>
                <input 
                  type="date" 
                  className="input-modern" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className={styles.formRow} style={{ marginTop: '1.5rem' }}>
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
              <div className={styles.formGroup}>
                <label>Idioma PDF</label>
                <select 
                  className="input-modern" 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="ES">Español</option>
                  <option value="CA">Català</option>
                  <option value="EN">English</option>
                </select>
              </div>
              <div className={styles.formGroup}></div>
            </div>
            
            <div className={styles.divider}></div>
            
            <h3>Información del Cliente</h3>
            <div className={styles.formGroup}>
              <label>Buscar Cliente</label>
              <div style={{ position: 'relative' }}>
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
            </div>
          </div>

          <div className={`glass-panel ${styles.card}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Conceptos</h3>
              <div className={styles.langToggle}>
                <button 
                  className={`${styles.langBtn} ${spellcheckLang === 'ES' ? styles.langBtnActive : ''}`}
                  onClick={() => setSpellcheckLang('ES')}
                >
                  ESP
                </button>
                <button 
                  className={`${styles.langBtn} ${spellcheckLang === 'CA' ? styles.langBtnActive : ''}`}
                  onClick={() => setSpellcheckLang('CA')}
                >
                  CAT
                </button>
              </div>
            </div>
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
                    <textarea 
                      className="input-modern" 
                      placeholder="Descripción del servicio o producto" 
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      spellCheck={true}
                      lang={spellcheckLang === 'ES' ? 'es' : 'ca'}
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
              <span>Subtotal (Base)</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>
            <div className={styles.summaryRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>IVA</span>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '2px 6px' }}>
                  <input 
                    type="number" 
                    value={taxRate % 1 === 0 ? taxRate : taxRate.toFixed(2)} 
                    onChange={(e) => handleTaxRateChange(parseFloat(e.target.value) || 0)}
                    style={{ width: '45px', background: 'transparent', border: 'none', color: 'white', textAlign: 'right', outline: 'none', fontSize: '13px' }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>%</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '2px 6px' }}>
                <input 
                  type="number" 
                  step="0.01"
                  value={taxAmount.toFixed(2)} 
                  onChange={(e) => handleTaxAmountChange(parseFloat(e.target.value) || 0)}
                  style={{ width: '80px', background: 'transparent', border: 'none', color: 'white', textAlign: 'right', outline: 'none', fontSize: '14px' }}
                />
                <span style={{ marginLeft: '4px' }}>€</span>
              </div>
            </div>
            <div className={styles.divider}></div>
            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
              <span>Total</span>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(59,130,246,0.1)', borderRadius: '6px', padding: '4px 10px', border: '1px solid rgba(59,130,246,0.2)' }}>
                <input 
                  type="number" 
                  step="0.01"
                  value={total.toFixed(2)} 
                  onChange={(e) => handleTotalChange(parseFloat(e.target.value) || 0)}
                  className="text-gradient"
                  style={{ width: '100px', background: 'transparent', border: 'none', fontWeight: 700, textAlign: 'right', outline: 'none', fontSize: '18px' }}
                />
                <span className="text-gradient" style={{ marginLeft: '4px', fontWeight: 700 }}>€</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
