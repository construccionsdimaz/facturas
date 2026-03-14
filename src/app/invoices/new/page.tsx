"use client";

import { useState, useRef, useEffect } from 'react';
import styles from './page.module.css';
import jsPDF from 'jspdf';
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
}

interface CompanySettings {
  companyName: string;
  companyAddress: string;
  companyTaxId: string;
}

export default function NewInvoice() {
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Diseño Web', quantity: 1, price: 1500 }
  ]);
  
  // Database State
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  
  // Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(`FAC-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
  const [brandColor, setBrandColor] = useState('#3b82f6'); 
  const [isGenerating, setIsGenerating] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  // Load Initial Data
  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(res => res.json()),
      fetch('/api/settings').then(res => res.json())
    ]).then(([clientsData, settingsData]) => {
      setClients(clientsData || []);
      setSettings(settingsData || null);
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

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const tax = subtotal * 0.21; // 21% IVA as default
  const total = subtotal + tax;

  const generatePDF = async () => {
    if (!pdfRef.current || !selectedClientId) {
      alert("Por favor selecciona un cliente antes de generar la factura.");
      return;
    }
    setIsGenerating(true);

    try {
      // 1. Convert client to name for PDF
      const selectedClient = clients.find(c => c.id === selectedClientId);

      // 2. Save Invoice to Database via API
      const invoiceData = {
        number: invoiceNumber,
        clientId: selectedClientId,
        // Using a dummy user ID for the demo since there's no auth session yet
        // In a real app this comes securely from a middleware or NextAuth
        userId: 'demo-user-bypass', 
        subtotal,
        taxAmount: tax,
        total,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          price: item.price
        }))
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });
      
      if (!res.ok) {
        console.error("Failed to save invoice to DB. Proceeding with PDF anyway for demo purposes.");
      }

      // 3. Generate the actual PDF Document
      pdfRef.current.style.position = 'static';
      pdfRef.current.style.top = '0';
      pdfRef.current.style.left = '0';
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4',
      });

      await pdf.html(pdfRef.current, {
        callback: function (doc) {
          doc.save(`${invoiceNumber}.pdf`);
        },
        x: 0,
        y: 0,
        width: 800,
        windowWidth: 800
      });

      pdfRef.current.style.position = 'absolute';
      pdfRef.current.style.top = '-9999px';
      pdfRef.current.style.left = '-9999px';
      
      // Auto-increment invoice number for next one
      setInvoiceNumber(`FAC-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
      
    } catch (error) {
       console.error("Error generating PDF", error);
    } finally {
       setIsGenerating(false);
    }
  };

  return (
    <div className={styles.invoiceCreator}>
      {/* Hidden PDF Template rendered with current state */}
      <div ref={pdfRef} style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <InvoicePDFTemplate data={{
          number: invoiceNumber,
          issueDate: new Date().toISOString(),
          dueDate: '',
          clientName: clients.find(c => c.id === selectedClientId)?.name || 'Cliente Desconocido',
          items: items,
          subtotal: subtotal,
          tax: tax,
          total: total,
          brandColor: brandColor,
          companyName: settings?.companyName,
          companyAddress: settings?.companyAddress,
          companyTaxId: settings?.companyTaxId
        }} />
      </div>

      <div className={styles.header}>
        <div>
          <h1 className="text-gradient">Crear Nueva Factura</h1>
          <p className={styles.subtitle}>Rellena los datos para generar una nueva factura.</p>
        </div>
        <div className={styles.actions}>
          <button 
            className={`btn-primary ${styles.saveBtn}`} 
            onClick={generatePDF}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generando PDF...' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      <div className={styles.contentGrid}>
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
            </div>
            
            <div className={styles.divider}></div>
            
            <h3>Información del Cliente</h3>
            <div className={styles.formGroup}>
              <label>Seleccionar Cliente</label>
              <select 
                className="input-modern" 
                value={selectedClientId} 
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">-- Elige un cliente existente --</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
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
              <span>Tax (21% IVA)</span>
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
