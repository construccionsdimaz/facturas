"use client";

import { useState, useEffect } from 'react';
import styles from '../invoices/page.module.css';
import { formatCurrency } from '@/lib/format';

interface Movement {
  id: string;
  amount: number;
  date: string;
  method: string;
  description: string;
  type: 'ENTRY' | 'EXIT';
  category: string;
  projectName?: string;
  project?: { name: string };
  client?: { name: string };
  invoice?: { number: string };
  isFacturado: boolean;
}

interface PendingItem {
  id: string;
  source: 'PROJECT_EXPENSE' | 'COMPANY_EXPENSE' | 'INVOICE';
  description: string;
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  date: string;
  dueDate: string | null;
  supplierName: string;
  projectName?: string;
}

export default function TreasuryClient() {
  const [activeTab, setActiveTab] = useState<'movements' | 'pending_payments' | 'pending_collections'>('movements');
  const [movements, setMovements] = useState<Movement[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<PendingItem[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<PendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state for new movement
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMov, setNewMov] = useState({
    amount: '',
    description: '',
    type: 'ENTRY' as 'ENTRY' | 'EXIT',
    category: 'OTROS',
    method: 'TRANSFERENCIA',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [movRes, treasuryRes, invRes] = await Promise.all([
        fetch('/api/movements'),
        fetch('/api/treasury'), // This still returns pending expenses
        fetch('/api/invoices?status=ISSUED,PARTIAL') // Need to check if this exists/is right
      ]);
      
      if (movRes.ok) setMovements(await movRes.json());
      if (treasuryRes.ok) setPendingExpenses(await treasuryRes.json());
      
      // For invoices, we might need a specific endpoint or filter
      const invData = await invRes.json();
      setPendingInvoices(invData.map((inv: any) => ({
        id: inv.id,
        source: 'INVOICE',
        description: `Factura ${inv.number}`,
        amount: inv.total,
        paidAmount: inv.paidAmount,
        pendingAmount: inv.total - inv.paidAmount,
        date: inv.issueDate,
        dueDate: inv.dueDate,
        supplierName: inv.client?.name || 'Cliente sin nombre',
        projectName: inv.project?.name
      })));

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMov)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewMov({ ...newMov, amount: '', description: '' });
        fetchAll();
      }
    } catch (error) {
      alert('Error al registrar movimiento');
    }
  };

  const handlePayExpense = async (item: PendingItem) => {
    try {
      const res = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: item.pendingAmount,
          type: 'EXIT',
          category: item.source === 'COMPANY_EXPENSE' ? 'ESTRUCTURA' : 'PAGO_PROVEEDOR',
          date: new Date().toISOString(),
          description: `Pago desde Tesorería: ${item.description}`,
          projectExpenseId: item.source === 'PROJECT_EXPENSE' ? item.id : undefined,
          companyExpenseId: item.source === 'COMPANY_EXPENSE' ? item.id : undefined
        })
      });
      if (res.ok) fetchAll();
    } catch (error) {
      alert('Error al registrar pago');
    }
  };

  const handleCollectInvoice = async (item: PendingItem) => {
    try {
      const res = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: item.pendingAmount,
          type: 'ENTRY',
          category: 'COBRO_FACTURA',
          date: new Date().toISOString(),
          description: `Cobro desde Tesorería: ${item.description}`,
          invoiceId: item.id
        })
      });
      if (res.ok) fetchAll();
    } catch (error) {
      alert('Error al registrar cobro');
    }
  };

  const handleDeleteMovement = async (id: string) => {
    if (!confirm('¿Eliminar este movimiento?')) return;
    try {
      const res = await fetch(`/api/movements/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAll();
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  const totalIn = movements.filter(m => m.type === 'ENTRY').reduce((sum, m) => sum + m.amount, 0);
  const totalOut = movements.filter(m => m.type === 'EXIT').reduce((sum, m) => sum + m.amount, 0);
  const cashOnHand = totalIn - totalOut;
  const totalDebt = pendingExpenses.reduce((sum, e) => sum + e.pendingAmount, 0);
  const totalToCollect = pendingInvoices.reduce((sum, i) => sum + i.pendingAmount, 0);

  if (isLoading && movements.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando datos financieros...</div>;
  }

  return (
    <div className={styles.invoicesPage}>
      {/* KPI Section */}
      <div className={styles.statsGrid}>
        <div className={`glass-panel ${styles.statCard}`} style={{ borderLeft: '4px solid #10b981' }}>
          <span className={styles.statLabel}>Saldo Real (Caja)</span>
          <span className={styles.statValue} style={{ color: '#10b981' }}>{formatCurrency(cashOnHand)}</span>
          <div style={{ fontSize: '11px', marginTop: '4px' }}>
            <span style={{ color: '#10b981' }}>+{formatCurrency(totalIn)}</span> / 
            <span style={{ color: '#ef4444' }}> -{formatCurrency(totalOut)}</span>
          </div>
        </div>
        <div className={`glass-panel ${styles.statCard}`} style={{ borderLeft: '4px solid #3b82f6' }}>
          <span className={styles.statLabel}>Pendiente de Cobro</span>
          <span className={styles.statValue} style={{ color: '#3b82f6' }}>{formatCurrency(totalToCollect)}</span>
        </div>
        <div className={`glass-panel ${styles.statCard}`} style={{ borderLeft: '4px solid #f59e0b' }}>
          <span className={styles.statLabel}>Pendiente de Pago</span>
          <span className={styles.statValue} style={{ color: '#f59e0b' }}>{formatCurrency(totalDebt)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
        <button 
          onClick={() => setActiveTab('movements')}
          style={{ 
            background: 'none', border: 'none', color: activeTab === 'movements' ? 'var(--accent-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'movements' ? '700' : '400', cursor: 'pointer', fontSize: '16px', position: 'relative'
          }}
        >
          Libro de Movimientos
          {activeTab === 'movements' && <div style={{ position: 'absolute', bottom: '-13px', left: 0, right: 0, height: '2px', background: 'var(--accent-primary)' }} />}
        </button>
        <button 
          onClick={() => setActiveTab('pending_payments')}
          style={{ 
            background: 'none', border: 'none', color: activeTab === 'pending_payments' ? 'var(--accent-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'pending_payments' ? '700' : '400', cursor: 'pointer', fontSize: '16px', position: 'relative'
          }}
        >
          Gastos Pendientes
          {activeTab === 'pending_payments' && <div style={{ position: 'absolute', bottom: '-13px', left: 0, right: 0, height: '2px', background: 'var(--accent-primary)' }} />}
        </button>
        <button 
          onClick={() => setActiveTab('pending_collections')}
          style={{ 
            background: 'none', border: 'none', color: activeTab === 'pending_collections' ? 'var(--accent-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'pending_collections' ? '700' : '400', cursor: 'pointer', fontSize: '16px', position: 'relative'
          }}
        >
          Cobros de Facturas
          {activeTab === 'pending_collections' && <div style={{ position: 'absolute', bottom: '-13px', left: 0, right: 0, height: '2px', background: 'var(--accent-primary)' }} />}
        </button>
        
        <button 
          className="btn-primary" 
          style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '13px' }}
          onClick={() => setShowAddModal(true)}
        >
          + Nuevo Movimiento
        </button>
      </div>

      {/* Content Area */}
      <div className={`glass-panel ${styles.tableContainer}`}>
        {activeTab === 'movements' && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto / Descripción</th>
                <th>Vínculo</th>
                <th>Método</th>
                <th style={{ textAlign: 'right' }}>Entrada</th>
                <th style={{ textAlign: 'right' }}>Salida</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id}>
                  <td>{new Date(m.date).toLocaleDateString()}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{m.description}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.category}</div>
                  </td>
                  <td>
                    {m.project && <div style={{ fontSize: '12px' }}>🏗️ {m.project.name || (m as any).project.name}</div>}
                    {m.invoice && <div style={{ fontSize: '12px' }}>📄 Factura {m.invoice.number}</div>}
                    {!m.project && !m.invoice && <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>-</span>}
                  </td>
                  <td><span className="badge" style={{ fontSize: '10px' }}>{m.method}</span></td>
                  <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{m.type === 'ENTRY' ? formatCurrency(m.amount) : ''}</td>
                  <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>{m.type === 'EXIT' ? formatCurrency(m.amount) : ''}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => handleDeleteMovement(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'pending_payments' && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Proveedor / Obra</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Pendiente</th>
                <th style={{ textAlign: 'center' }}>Vencimiento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pendingExpenses.map(e => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.supplierName}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{e.projectName || 'General'}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(e.amount)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{formatCurrency(e.pendingAmount)}</td>
                  <td style={{ textAlign: 'center' }}>{e.dueDate ? new Date(e.dueDate).toLocaleDateString() : '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      onClick={() => handlePayExpense(e)}
                    >
                      Registrar Pago
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'pending_collections' && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente / Obra</th>
                <th style={{ textAlign: 'right' }}>Total Factura</th>
                <th style={{ textAlign: 'right' }}>Pendiente</th>
                <th style={{ textAlign: 'center' }}>Vencimiento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pendingInvoices.map(inv => (
                <tr key={inv.id}>
                  <td>
                    <strong>{inv.supplierName}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{inv.description} {inv.projectName ? `- ${inv.projectName}` : ''}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(inv.amount)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#3b82f6' }}>{formatCurrency(inv.pendingAmount)}</td>
                  <td style={{ textAlign: 'center' }}>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      onClick={() => handleCollectInvoice(inv)}
                    >
                      Registrar Cobro
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Movement Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="glass-panel" style={{ padding: '30px', maxWidth: '500px', width: '100%' }}>
            <h3>Registrar Nuevo Movimiento</h3>
            <form onSubmit={handleAddMovement} style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="formGroup">
                  <label>Tipo</label>
                  <select className="input-modern" value={newMov.type} onChange={e => setNewMov({ ...newMov, type: e.target.value as any })}>
                    <option value="ENTRY">Entrada (Cobro)</option>
                    <option value="EXIT">Salida (Pago)</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label>Categoría</label>
                  <select className="input-modern" value={newMov.category} onChange={e => setNewMov({ ...newMov, category: e.target.value })}>
                    <option value="ANTICIPO">Anticipo</option>
                    <option value="COBRO_FACTURA">Cobro de Factura</option>
                    <option value="INGRESO_DIRECTO">Ingreso Directo</option>
                    <option value="PAGO_PROVEEDOR">Pago Proveedor</option>
                    <option value="ESTRUCTURA">Gasto Estructura</option>
                    <option value="OTROS">Otros / Ajustes</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '15px' }}>
                <div className="formGroup">
                  <label>Importe (€)</label>
                  <input type="number" step="0.01" className="input-modern" required value={newMov.amount} onChange={e => setNewMov({ ...newMov, amount: e.target.value })} />
                </div>
                <div className="formGroup">
                  <label>Fecha</label>
                  <input type="date" className="input-modern" required value={newMov.date} onChange={e => setNewMov({ ...newMov, date: e.target.value })} />
                </div>
              </div>
              <div className="formGroup">
                <label>Método de Pago</label>
                <select className="input-modern" value={newMov.method} onChange={e => setNewMov({ ...newMov, method: e.target.value })}>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="BIZUM">Bizum</option>
                  <option value="GIRO">Giro Bancario</option>
                </select>
              </div>
              <div className="formGroup">
                <label>Descripción / Concepto</label>
                <input type="text" className="input-modern" required value={newMov.description} onChange={e => setNewMov({ ...newMov, description: e.target.value })} />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Guardar</button>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
