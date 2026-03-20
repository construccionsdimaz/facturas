"use client";

import { useState } from 'react';
import styles from '../projects/page.module.css';
import invStyles from '../invoices/page.module.css';
import { formatCurrency } from '@/lib/format';

interface CompanyExpensesClientProps {
  initialExpenses: any[];
  activeProjects: any[];
  clients: any[];
}

export default function CompanyExpensesClient({ initialExpenses, activeProjects, clients }: CompanyExpensesClientProps) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [localClients, setLocalClients] = useState(clients);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // New Expense State
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('Oficina');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSupplierId, setNewSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [newPaidAmount, setNewPaidAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Quick create supplier state
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState('');
  const [quickSupplierCategory, setQuickSupplierCategory] = useState<'PROVEEDOR' | 'SUBCONTRATA' | 'MIXTO'>('PROVEEDOR');
  const [isSavingQuickSupplier, setIsSavingQuickSupplier] = useState(false);

  // Imputation State
  const [imputeToCert, setImputeToCert] = useState<string | null>(null);
  const [imputeProjectId, setImputeProjectId] = useState('');
  const [imputeAmount, setImputeAmount] = useState('');
  const [isImputing, setIsImputing] = useState(false);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc || !newAmount) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/company-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newDesc,
          amount: parseFloat(newAmount),
          category: newCategory,
          date: newDate,
          dueDate: newDueDate || null,
          paidAmount: newPaidAmount || 0,
          clientId: newSupplierId || null
        })
      });
      if (!res.ok) throw new Error('Failed to add');
      const saved = await res.json();
      setExpenses([saved, ...expenses]);
      setIsAdding(false);
      setNewDesc('');
      setNewAmount('');
      setNewSupplierId('');
      setSupplierSearch('');
      setNewPaidAmount('');
      setNewDueDate('');
    } catch (e) {
      alert('Error al añadir gasto');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImpute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imputeToCert || !imputeProjectId || !imputeAmount) return;
    setIsImputing(true);
    try {
      const res = await fetch(`/api/company-expenses/${imputeToCert}/imputations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: imputeProjectId,
          amount: parseFloat(imputeAmount),
          date: new Date().toISOString()
        })
      });
      if (!res.ok) throw new Error('Failed to impute');
      const saved = await res.json();
      
      // Update local state
      setExpenses(expenses.map(exp => {
        if (exp.id === imputeToCert) {
          return {
            ...exp,
            imputations: [saved, ...(exp.imputations || [])]
          };
        }
        return exp;
      }));
      
      setImputeToCert(null);
      setImputeProjectId('');
      setImputeAmount('');
    } catch (e) {
      alert('Error al imputar gasto');
    } finally {
      setIsImputing(false);
    }
  };

  const handleRegisterPayment = async (expense: any, amountToAdd: number) => {
    if (amountToAdd <= 0) return;

    setUpdatingId(expense.id);
    try {
      const res = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amountToAdd * 100) / 100,
          type: 'EXIT',
          category: 'PAGO_ESTRUCTURA',
          date: new Date().toISOString(),
          description: `Pago de gasto de estructura: ${expense.description}`,
          companyExpenseId: expense.id
        })
      });

      if (res.ok) {
        const movement = await res.json();
        // Reflect change in local state
        setExpenses(expenses.map(e => 
          e.id === expense.id 
            ? { 
                ...e, 
                paidAmount: Math.round(((e.paidAmount || 0) + amountToAdd) * 100) / 100,
                status: ((e.paidAmount || 0) + amountToAdd) >= e.amount ? 'PAGADO' : 'PARCIAL'
              } 
            : e
        ));
      } else {
        const error = await res.json();
        alert(error.error || 'Error al registrar el pago');
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleQuickCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSupplierName) return;
    setIsSavingQuickSupplier(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickSupplierName,
          category: quickSupplierCategory
        })
      });
      if (!res.ok) throw new Error('Failed to create');
      const newSupplier = await res.json();
      
      setLocalClients([...localClients, newSupplier]);
      setNewSupplierId(newSupplier.id);
      setSupplierSearch(newSupplier.name);
      setShowQuickCreateModal(false);
      setQuickSupplierName('');
    } catch (error) {
      console.error(error);
      alert('Error al crear el proveedor');
    } finally {
      setIsSavingQuickSupplier(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={() => {
          setIsAdding(!isAdding);
          setSupplierSearch('');
          setNewSupplierId('');
        }}>
          {isAdding ? 'Cerrar' : '+ Nuevo Gasto de Estructura'}
        </button>
      </div>

      {isAdding && (
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--accent-primary)' }}>
          <form onSubmit={handleAddExpense}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
              <div className={styles.formGroup}>
                <label>Descripción / Concepto</label>
                <input 
                  type="text" className="input-modern" value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)} required 
                />
              </div>
              <div className={styles.formGroup} style={{ position: 'relative' }}>
                <label>Proveedor / Entidad</label>
                <input
                  type="text"
                  className="input-modern"
                  placeholder="Buscar o crear..."
                  value={supplierSearch}
                  onChange={e => {
                    setSupplierSearch(e.target.value);
                    setShowSupplierDropdown(true);
                    if (!e.target.value) setNewSupplierId('');
                  }}
                  onFocus={() => setShowSupplierDropdown(true)}
                />
                {showSupplierDropdown && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 110,
                    background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                  }}>
                    {localClients
                      .filter(c => c.name.toLowerCase().includes(supplierSearch.toLowerCase()))
                      .map(c => (
                        <div
                          key={c.id}
                          onMouseDown={() => {
                            setNewSupplierId(c.id);
                            setSupplierSearch(c.name);
                            setShowSupplierDropdown(false);
                          }}
                          style={{
                            padding: '10px 14px', cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{c.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{c.category}</div>
                        </div>
                      ))}
                    <div
                      onMouseDown={() => {
                        setQuickSupplierName(supplierSearch);
                        setShowQuickCreateModal(true);
                        setShowSupplierDropdown(false);
                      }}
                      style={{
                        padding: '12px 14px', cursor: 'pointer',
                        background: 'rgba(59,130,246,0.1)',
                        color: 'var(--accent-primary)',
                        fontWeight: '700',
                        fontSize: '13px',
                        textAlign: 'center',
                        borderTop: '1px solid rgba(59,130,246,0.2)'
                      }}
                    >
                      + Registrar "{supplierSearch || 'nuevo'}"
                    </div>
                  </div>
                )}
                {newSupplierId && (
                  <div style={{ fontSize: '10px', color: '#10b981', marginTop: '2px', position: 'absolute' }}>
                    ✓ Seleccionado
                  </div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label>Categoría</label>
                <select className="input-modern" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                  <option value="Oficina">Oficina / Local</option>
                  <option value="Gestoría">Gestoría / Asesoría</option>
                  <option value="Seguros">Seguros</option>
                  <option value="Software">Software / IT</option>
                  <option value="Suministros">Suministros (Agua, Luz)</option>
                  <option value="Marketing">Marketing / Publicidad</option>
                  <option value="Vehículos">Vehículos / Renting</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Fecha</label>
                <input type="date" className="input-modern" value={newDate} onChange={e => setNewDate(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Vencimiento</label>
                <input type="date" className="input-modern" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Total (€)</label>
                <input 
                  type="number" step="0.01" className="input-modern" 
                  value={newAmount} onChange={e => setNewAmount(e.target.value)} required 
                />
              </div>
              <div className={styles.formGroup}>
                <label>Pagado (€)</label>
                <input 
                  type="number" step="0.01" className="input-modern" 
                  value={newPaidAmount} onChange={e => setNewPaidAmount(e.target.value)} 
                />
              </div>
              <button type="submit" className="btn-primary" disabled={isSaving} style={{ height: '42px' }}>
                {isSaving ? '...' : 'OK'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={`glass-panel ${invStyles.tableContainer}`}>
        <table className={invStyles.table}>
          <thead>
            <tr>
              <th>Fecha / Venc.</th>
              <th>Proveedor</th>
              <th>Descripción / Categoría</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'right' }}>Pagado</th>
              <th style={{ textAlign: 'right' }}>Pendiente</th>
              <th style={{ textAlign: 'right' }}>Imputado</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No hay gastos registrados.</td></tr>
            ) : expenses.map(exp => {
              const totalImputed = exp.imputations?.reduce((sum: number, i: any) => sum + i.amount, 0) || 0;
              const pending = exp.amount - (exp.paidAmount || 0);
              
              return (
                <tr key={exp.id}>
                  <td>
                    <div style={{ fontSize: '13px' }}>{new Date(exp.date).toLocaleDateString()}</div>
                    {exp.dueDate && (
                      <div style={{ fontSize: '11px', color: new Date(exp.dueDate) < new Date() ? '#ff4444' : 'var(--text-muted)' }}>
                        Vence: {new Date(exp.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td>
                    {exp.client ? (
                      <div>
                        <strong>{exp.client.name}</strong>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>(Sin proveedor)</span>
                    )}
                  </td>
                  <td>
                    <strong>{exp.description}</strong>
                    <div><span className="badge" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '10px' }}>{exp.category}</span></div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: '700' }}>{formatCurrency(exp.amount)}</td>
                  <td style={{ textAlign: 'right', color: '#10b981' }}>{formatCurrency(exp.paidAmount || 0)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '700', color: pending > 0 ? '#ff4444' : 'var(--text-muted)' }}>
                    {formatCurrency(pending)}
                  </td>
                  <td style={{ textAlign: 'right', color: '#3b82f6' }}>{formatCurrency(totalImputed)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {(exp.paidAmount || 0) < exp.amount && (
                        <button 
                          className="btn-primary" 
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => handleRegisterPayment(exp, pending)}
                          disabled={updatingId === exp.id}
                        >
                          💰
                        </button>
                      )}
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => setImputeToCert(exp.id)}
                      >
                        Imputar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {imputeToCert && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <h3>Imputar Gasto a Obra</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Asigna una parte de este gasto a una obra específica para el cálculo de rentabilidad real.
            </p>
            <form onSubmit={handleImpute}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className={styles.formGroup}>
                  <label>Seleccionar Obra *</label>
                  <select 
                    className="input-modern" 
                    value={imputeProjectId} 
                    onChange={e => setImputeProjectId(e.target.value)}
                    required
                  >
                    <option value="">Seleccione una obra...</option>
                    {activeProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Importe a Imputar (€) *</label>
                  <input 
                    type="number" step="0.01" className="input-modern"
                    value={imputeAmount}
                    onChange={e => setImputeAmount(e.target.value)}
                    placeholder="Ej: 50.00"
                    required
                  />
                  <p style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-muted)' }}>
                    El remanente de este gasto se reducirá según este importe.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setImputeToCert(null)}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={isImputing}>
                    {isImputing ? 'Guardando...' : 'Confirmar Imputación'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {showQuickCreateModal && (
        <div className="modal-backdrop" style={{ zIndex: 2000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '450px' }}>
            <h3>Registrar Nueva Entidad / Proveedor</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Añade rápidamente un nuevo proveedor para este gasto estructural.
            </p>
            <form onSubmit={handleQuickCreateSupplier}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className={styles.formGroup}>
                  <label>Nombre Fiscal / Comercial *</label>
                  <input
                    type="text"
                    className="input-modern"
                    value={quickSupplierName}
                    onChange={e => setQuickSupplierName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Categoría Principal</label>
                  <select
                    className="input-modern"
                    value={quickSupplierCategory}
                    onChange={e => setQuickSupplierCategory(e.target.value as any)}
                  >
                    <option value="PROVEEDOR">Proveedor (General)</option>
                    <option value="SUBCONTRATA">Subcontrata</option>
                    <option value="MIXTO">Mixto</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowQuickCreateModal(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={isSavingQuickSupplier}>
                    {isSavingQuickSupplier ? 'Guardando...' : 'Crear y Seleccionar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
