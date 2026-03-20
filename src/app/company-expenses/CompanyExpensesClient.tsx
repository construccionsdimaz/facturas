"use client";

import { useState } from 'react';
import styles from '../projects/page.module.css';
import invStyles from '../invoices/page.module.css';
import { formatCurrency } from '@/lib/format';

interface CompanyExpensesClientProps {
  initialExpenses: any[];
  activeProjects: any[];
}

export default function CompanyExpensesClient({ initialExpenses, activeProjects }: CompanyExpensesClientProps) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // New Expense State
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('Oficina');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

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
          date: newDate
        })
      });
      if (!res.ok) throw new Error('Failed to add');
      const saved = await res.json();
      setExpenses([saved, ...expenses]);
      setIsAdding(false);
      setNewDesc('');
      setNewAmount('');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cerrar' : '+ Nuevo Gasto de Estructura'}
        </button>
      </div>

      {isAdding && (
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--accent-primary)' }}>
          <form onSubmit={handleAddExpense}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '16px', alignItems: 'flex-end' }}>
              <div className={styles.formGroup}>
                <label>Descripción / Concepto</label>
                <input 
                  type="text" className="input-modern" value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)} required 
                />
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
                <label>Importe (€)</label>
                <input 
                  type="number" step="0.01" className="input-modern" 
                  value={newAmount} onChange={e => setNewAmount(e.target.value)} required 
                />
              </div>
              <button type="submit" className="btn-primary" disabled={isSaving} style={{ height: '42px' }}>
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '24px' }}>
        <table className={invStyles.table}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Categoría</th>
              <th style={{ textAlign: 'right' }}>Importe Total</th>
              <th style={{ textAlign: 'right' }}>Imputado</th>
              <th style={{ textAlign: 'right' }}>Remanente</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No hay gastos registrados.</td></tr>
            ) : expenses.map(exp => {
              const totalImputed = exp.imputations?.reduce((sum: number, i: any) => sum + i.amount, 0) || 0;
              const remaining = exp.amount - totalImputed;
              
              return (
                <tr key={exp.id}>
                  <td>{new Date(exp.date).toLocaleDateString()}</td>
                  <td><strong>{exp.description}</strong></td>
                  <td><span className="badge" style={{ background: 'rgba(255,255,255,0.05)' }}>{exp.category}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: '700' }}>{formatCurrency(exp.amount)}</td>
                  <td style={{ textAlign: 'right', color: '#3b82f6' }}>{formatCurrency(totalImputed)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '700', color: remaining > 0 ? '#10b981' : '#ff4444' }}>
                    {formatCurrency(remaining)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      onClick={() => setImputeToCert(exp.id)}
                    >
                      Imputar a Obra
                    </button>
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
    </div>
  );
}
