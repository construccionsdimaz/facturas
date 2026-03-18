"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import invStyles from '@/app/invoices/page.module.css';
import styles from '../page.module.css';
import ConfirmationModal from '@/components/ConfirmationModal';

interface ProjectDetailClientProps {
  project: {
    id: string;
    clientId: string;
    name: string;
    description: string | null;
    address: string | null;
    status: string;
    client: { name: string };
    invoices: any[];
    estimates: any[];
    budgetLines: any[];
    expenses: any[];
  };
  clients: any[];
}

export default function ProjectDetailClient({ project: initialProject, clients }: ProjectDetailClientProps) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [activeTab, setActiveTab] = useState<'invoices' | 'estimates' | 'budget' | 'expenses' | 'analysis'>('invoices');

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(project.name);
  const [editedDescription, setEditedDescription] = useState(project.description || '');
  const [editedAddress, setEditedAddress] = useState(project.address || '');
  const [editedClientId, setEditedClientId] = useState(project.clientId);
  const [isSaving, setIsSaving] = useState(false);

  // Search state
  const [clientSearch, setClientSearch] = useState(project.client.name);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // New forms state
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetFormData, setBudgetFormData] = useState({ name: '', description: '', estimatedAmount: '' });
  
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'Materiales' });

  // Calculations
  const totalInvoiced = project.invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalBudgeted = project.budgetLines.reduce((sum, line) => sum + line.estimatedAmount, 0);
  const totalExpenses = project.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const profit = totalInvoiced - totalExpenses;
  const marginPercentage = totalInvoiced > 0 ? (profit / totalInvoiced) * 100 : 0;

  const handleUpdate = async () => {
    if (!editedName || !editedClientId) {
      alert("Por favor rellena el nombre y selecciona un cliente.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editedName,
          description: editedDescription,
          address: editedAddress,
          status: project.status,
          clientId: editedClientId
        })
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();

      // Update local state with the new client data that might come back from API
      // Or just refresh the page since it's cleaner to get the full include data
      router.refresh();
      setProject({ ...project, ...updated });
      setIsEditing(false);
    } catch (error) {
      alert('Error al actualizar la obra');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = project.status === 'ACTIVE' ? 'COMPLETED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus
        })
      });
      if (!res.ok) throw new Error('Failed to update status');
      setProject({ ...project, status: newStatus });
    } catch (error) {
      alert('Error al cambiar el estado');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/projects');
    } catch (error) {
      alert('Error al eliminar la obra');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleAddBudgetLine = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetFormData)
      });
      if (!res.ok) throw new Error('Error al añadir partida');
      const newLine = await res.json();
      setProject({ ...project, budgetLines: [...project.budgetLines, newLine] });
      setBudgetFormData({ name: '', description: '', estimatedAmount: '' });
      setShowBudgetForm(false);
    } catch (error) {
      alert('Error al añadir partida');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseFormData)
      });
      if (!res.ok) throw new Error('Error al añadir gasto');
      const newExpense = await res.json();
      setProject({ ...project, expenses: [newExpense, ...project.expenses] });
      setExpenseFormData({ description: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'Materiales' });
      setShowExpenseForm(false);
    } catch (error) {
      alert('Error al añadir gasto');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBudgetLine = async (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar esta partida?')) return;
    try {
      const res = await fetch(`/api/projects/budget/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error');
      setProject({ ...project, budgetLines: project.budgetLines.filter(l => l.id !== id) });
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar este gasto?')) return;
    try {
      const res = await fetch(`/api/projects/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error');
      setProject({ ...project, expenses: project.expenses.filter(e => e.id !== id) });
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        {!isEditing ? (
          <>
            <button className="btn-secondary" onClick={() => setIsEditing(true)}>✏️ Editar Obra</button>
            <button className="btn-secondary" onClick={handleToggleStatus}>
              {project.status === 'ACTIVE' ? '✅ Finalizar Obra' : '🚀 Reactivar Obra'}
            </button>
            <button className="btn-secondary" style={{ color: '#ff4444' }} onClick={() => setShowDeleteModal(true)}>🗑️ Eliminar</button>
          </>
        ) : (
          <>
            <button className="btn-secondary" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancelar</button>
            <button className="btn-primary" onClick={handleUpdate} disabled={isSaving}>
              {isSaving ? 'Guardando...' : '💾 Guardar Cambios'}
            </button>
          </>
        )}
      </div>

      {isEditing ? (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3>Editar Información de la Obra</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div className={styles.formGroup}>
              <label>Cliente Vinculado *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-modern"
                  placeholder="🔍 Buscar por nombre, DNI, teléfono..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                    if (!e.target.value) setEditedClientId('');
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                  required={!editedClientId}
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
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                      background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                    }}>
                      {filtered.map(c => (
                        <div
                          key={c.id}
                          onMouseDown={() => {
                            setEditedClientId(c.id);
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
                          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{c.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {[c.taxId, c.phone, c.email].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}
                {editedClientId && (
                  <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                    ✓ Cliente seleccionado: {clients.find(c => c.id === editedClientId)?.name}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Nombre de la Obra *</label>
              <input
                type="text"
                className="input-modern"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Dirección / Localización</label>
              <input
                type="text"
                className="input-modern"
                value={editedAddress}
                onChange={(e) => setEditedAddress(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Descripción / Notas</label>
              <textarea
                className="input-modern"
                style={{ minHeight: '100px', resize: 'vertical' }}
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="metricsGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>CLIENTE</div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>{project.client.name}</div>
            {project.address && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>📍 {project.address}</div>
            )}
          </div>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>TOTAL PRESUPUESTADO</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {totalBudgeted.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>TOTAL FACTURADO</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-primary)' }}>
              {totalInvoiced.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>TOTAL GASTOS</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#ff4444' }}>
              {totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>MARGEN (BENEFICIO)</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: profit >= 0 ? '#10b981' : '#ff4444' }}>
              {profit.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € 
              <span style={{ fontSize: '12px', fontWeight: '400', marginLeft: '6px' }}>({marginPercentage.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      )}

      {!isEditing && project.description && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>DESCRIPCIÓN</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{project.description}</div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '0' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => setActiveTab('invoices')}
            style={{
              padding: '16px 24px',
              color: activeTab === 'invoices' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'invoices' ? '2px solid var(--accent-primary)' : 'none',
              background: 'none',
              fontWeight: '600'
            }}
          >
            Facturas ({project.invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('estimates')}
            style={{
              padding: '16px 24px',
              color: activeTab === 'estimates' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'estimates' ? '2px solid var(--accent-primary)' : 'none',
              background: 'none',
              fontWeight: '600'
            }}
          >
            Presupuestos ({project.estimates.length})
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            style={{
              padding: '16px 24px',
              color: activeTab === 'budget' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'budget' ? '2px solid var(--accent-primary)' : 'none',
              background: 'none',
              fontWeight: '600'
            }}
          >
            Partidas ({project.budgetLines.length})
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            style={{
              padding: '16px 24px',
              color: activeTab === 'expenses' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'expenses' ? '2px solid var(--accent-primary)' : 'none',
              background: 'none',
              fontWeight: '600'
            }}
          >
            Gastos ({project.expenses.length})
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            style={{
              padding: '16px 24px',
              color: activeTab === 'analysis' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'analysis' ? '2px solid var(--accent-primary)' : 'none',
              background: 'none',
              fontWeight: '600'
            }}
          >
            📊 Análisis
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {activeTab === 'invoices' ? (
            <table className={invStyles.table}>
              <thead>
                <tr>
                  <th>Nº Factura</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {project.invoices.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No hay facturas vinculadas.</td></tr>
                ) : project.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td><Link href={`/invoices/${inv.id}`} className={styles.rowLink}>{inv.number}</Link></td>
                    <td>{new Date(inv.issueDate).toLocaleDateString()}</td>
                    <td>{inv.total.toFixed(2)} €</td>
                    <td>
                      <span className={`badge badge-${inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'danger' : 'warning'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'estimates' ? (
            <table className={invStyles.table}>
              <thead>
                <tr>
                  <th>Nº Presupuesto</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {project.estimates.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No hay presupuestos vinculados.</td></tr>
                ) : project.estimates.map((est) => (
                  <tr key={est.id}>
                    <td><Link href={`/estimates/${est.id}`} className={styles.rowLink}>{est.number}</Link></td>
                    <td>{new Date(est.issueDate).toLocaleDateString()}</td>
                    <td>{est.total.toFixed(2)} €</td>
                    <td>
                      <span className={`badge badge-${est.status === 'ACCEPTED' ? 'success' : 'warning'}`}>
                        {est.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'budget' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Partidas / Presupuesto Estimado</h3>
                <button className="btn-primary" onClick={() => setShowBudgetForm(!showBudgetForm)}>
                  {showBudgetForm ? 'Cancelar' : '+ Añadir Partida'}
                </button>
              </div>

              {showBudgetForm && (
                <form onSubmit={handleAddBudgetLine} className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 100px', gap: '16px', alignItems: 'end' }}>
                    <div className={styles.formGroup}>
                      <label>Nombre *</label>
                      <input type="text" className="input-modern" placeholder="Ej: Albañilería" value={budgetFormData.name} onChange={e => setBudgetFormData({...budgetFormData, name: e.target.value})} required />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Descripción</label>
                      <input type="text" className="input-modern" placeholder="Detalles..." value={budgetFormData.description} onChange={e => setBudgetFormData({...budgetFormData, description: e.target.value})} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Importe *</label>
                      <input type="number" step="0.01" className="input-modern" placeholder="0.00" value={budgetFormData.estimatedAmount} onChange={e => setBudgetFormData({...budgetFormData, estimatedAmount: e.target.value})} required />
                    </div>
                    <button type="submit" className="btn-primary" disabled={isSaving}>Añadir</button>
                  </div>
                </form>
              )}

              <table className={invStyles.table}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th style={{ textAlign: 'right' }}>Estimado</th>
                    <th style={{ width: '80px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {project.budgetLines.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No hay partidas definidas.</td></tr>
                  ) : project.budgetLines.map(line => (
                    <tr key={line.id}>
                      <td style={{ fontWeight: 600 }}>{line.name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{line.description}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{line.estimatedAmount.toLocaleString('es-ES')} €</td>
                      <td>
                        <button onClick={() => handleDeleteBudgetLine(line.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'expenses' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Gastos de Obra</h3>
                <button className="btn-primary" onClick={() => setShowExpenseForm(!showExpenseForm)}>
                  {showExpenseForm ? 'Cancelar' : '+ Registrar Gasto'}
                </button>
              </div>

              {showExpenseForm && (
                <form onSubmit={handleAddExpense} className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px', gap: '16px', alignItems: 'end' }}>
                    <div className={styles.formGroup}>
                      <label>Descripción / Proveedor *</label>
                      <input type="text" className="input-modern" placeholder="Ej: Factura Azulejos S.A." value={expenseFormData.description} onChange={e => setExpenseFormData({...expenseFormData, description: e.target.value})} required />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Categoría</label>
                      <select className="input-modern" value={expenseFormData.category} onChange={e => setExpenseFormData({...expenseFormData, category: e.target.value})}>
                        <option value="Materiales">Materiales</option>
                        <option value="Mano de Obra">Mano de Obra</option>
                        <option value="Subcontrata">Subcontrata</option>
                        <option value="Varios">Varios</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Fecha</label>
                      <input type="date" className="input-modern" value={expenseFormData.date} onChange={e => setExpenseFormData({...expenseFormData, date: e.target.value})} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Importe *</label>
                      <input type="number" step="0.01" className="input-modern" placeholder="0.00" value={expenseFormData.amount} onChange={e => setExpenseFormData({...expenseFormData, amount: e.target.value})} required />
                    </div>
                    <button type="submit" className="btn-primary" disabled={isSaving}>Log</button>
                  </div>
                </form>
              )}

              <table className={invStyles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Categoría</th>
                    <th style={{ textAlign: 'right' }}>Importe</th>
                    <th style={{ width: '80px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {project.expenses.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No hay gastos registrados.</td></tr>
                  ) : project.expenses.map(exp => (
                    <tr key={exp.id}>
                      <td>{new Date(exp.date).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>{exp.description}</td>
                      <td><span className="badge badge-warning" style={{ background: 'rgba(255,165,0,0.1)', color: '#ffa500' }}>{exp.category}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#ff4444' }}>-{exp.amount.toLocaleString('es-ES')} €</td>
                      <td>
                        <button onClick={() => handleDeleteExpense(exp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <h3>📈 Análisis de Rentabilidad</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h4 style={{ marginBottom: '16px' }}>Control de Presupuesto (Ingresos)</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Facturado vs Presupuestado</span>
                    <span>{((totalInvoiced / (totalBudgeted || 1)) * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${Math.min((totalInvoiced / (totalBudgeted || 1)) * 100, 100)}%`, 
                      background: 'var(--accent-primary)',
                      transition: 'width 0.5s ease-out'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <span>Facturado: {totalInvoiced.toLocaleString()} €</span>
                    <span>Meta: {totalBudgeted.toLocaleString()} €</span>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h4 style={{ marginBottom: '16px' }}>Balance de Costes (Rentabilidad)</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Gastos vs Ingresos</span>
                    <span>{((totalExpenses / (totalInvoiced || 1)) * 100).toFixed(1)}% del total</span>
                  </div>
                  <div style={{ height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${Math.min((totalExpenses / (totalInvoiced || 1)) * 100, 100)}%`, 
                      background: '#ff4444',
                      transition: 'width 0.5s ease-out'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <span>Gastos: {totalExpenses.toLocaleString()} €</span>
                    <span>Margen: {profit.toLocaleString()} € ({marginPercentage.toFixed(1)}%)</span>
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>ESTADO DE LA OBRA</div>
                <div style={{ fontSize: '32px', fontWeight: '800', color: profit >= 0 ? '#10b981' : '#ff4444' }}>
                  {profit >= 0 ? 'Positivo' : 'Negativo'} ({profit.toLocaleString()} €)
                </div>
                <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>
                  {profit >= 0 
                    ? 'Esta obra está generando beneficios. Sigue así!' 
                    : 'Los gastos superan los ingresos facturados. Revisa las partidas o emite nuevas facturas.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        title="¿Eliminar Obra?"
        message="Esta acción no se puede deshacer. Los documentos asociados (facturas y presupuestos) no se borrarán, pero dejarán de estar vinculados a esta obra."
        confirmLabel={isDeleting ? "Eliminando..." : "Sí, Eliminar"}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
