"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
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
  const [activeTab, setActiveTab] = useState<'budget' | 'expenses' | 'analysis' | 'invoices' | 'estimates'>('budget');
  
  // Budget management state
  const [isAddingLine, setIsAddingLine] = useState(false);
  const [newLineName, setNewLineName] = useState('');
  const [newLineAmount, setNewLineAmount] = useState('');
  const [newLineDesc, setNewLineDesc] = useState('');
  const [isSavingLine, setIsSavingLine] = useState(false);

  // Expenses management state
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpDate, setNewExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [newExpCategory, setNewExpCategory] = useState('Materiales');
  const [newExpSupplierId, setNewExpSupplierId] = useState('');
  const [newExpBudgetLineId, setNewExpBudgetLineId] = useState('');
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  
  // Suppliers management
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);

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

  useState(() => {
    fetch('/api/suppliers').then(r => r.json()).then(setSuppliers);
    return () => {};
  });

  const totalInvoiced = project.invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalExpenses = project.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalBudgeted = project.budgetLines.reduce((sum, l) => sum + l.estimatedAmount, 0);
  const netResult = totalInvoiced - totalExpenses;
  const marginPercentage = totalInvoiced > 0 ? (netResult / totalInvoiced) * 100 : 0;
  const pendingToInvoice = Math.max(0, totalBudgeted - totalInvoiced);

  // Chart Data
  const budgetData = [
    { name: 'Ejecución Económica', Presupuestado: totalBudgeted, Facturado: totalInvoiced }
  ];

  const profitData = [
    { name: 'Rentabilidad Real', Ingresos: totalInvoiced, Gastos: totalExpenses }
  ];

  const expenseByCategory = project.expenses.reduce((acc: any, exp: any) => {
    const cat = exp.category || 'Otros';
    acc[cat] = (acc[cat] || 0) + exp.amount;
    return acc;
  }, {});

  const pieData = Object.keys(expenseByCategory).map(key => ({
    name: key,
    value: expenseByCategory[key]
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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

  const handleDeleteBudgetLine = async (lineId: string) => {
    if (!confirm('¿Seguro que quieres eliminar esta partida?')) return;
    try {
      const res = await fetch(`/api/projects/budget/${lineId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete');
      setProject({
        ...project,
        budgetLines: project.budgetLines.filter((l: any) => l.id !== lineId)
      });
    } catch (error) {
      alert('Error al eliminar la partida');
    }
  };

  const handleUpdateBudgetLineStatus = async (lineId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/projects/budget/${lineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update');
      const updatedLine = await res.json();
      setProject({
        ...project,
        budgetLines: project.budgetLines.map((l: any) => l.id === lineId ? updatedLine : l)
      });
    } catch (error) {
      alert('Error al actualizar el estado de la partida');
    }
  };

  const handleAddBudgetLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLineName) return;
    setIsSavingLine(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLineName,
          description: newLineDesc,
          estimatedAmount: newLineAmount
        })
      });
      if (!res.ok) throw new Error('Failed to add');
      const newLine = await res.json();
      setProject({
        ...project,
        budgetLines: [...project.budgetLines, newLine]
      });
      setIsAddingLine(false);
      setNewLineName('');
      setNewLineAmount('');
      setNewLineDesc('');
    } catch (error) {
      alert('Error al añadir la partida');
    } finally {
      setIsSavingLine(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpDesc || !newExpAmount) return;
    setIsSavingExpense(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newExpDesc,
          amount: newExpAmount,
          date: newExpDate,
          category: newExpCategory,
          supplierId: newExpSupplierId || null,
          budgetLineId: newExpBudgetLineId || null
        })
      });
      if (!res.ok) throw new Error('Failed to add');
      const newExp = await res.json();
      setProject({
        ...project,
        expenses: [newExp, ...project.expenses]
      });
      setIsAddingExpense(false);
      setNewExpDesc('');
      setNewExpAmount('');
      setNewExpCategory('Materiales');
    } catch (error) {
      alert('Error al añadir el gasto');
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expId: string) => {
    if (!confirm('¿Seguro que quieres eliminar este gasto?')) return;
    try {
      const res = await fetch(`/api/projects/expenses/${expId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete');
      setProject({
        ...project,
        expenses: project.expenses.filter((e: any) => e.id !== expId)
      });
    } catch (error) {
      alert('Error al eliminar el gasto');
    }
  };
  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName) return;
    setIsSavingSupplier(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSupplierName })
      });
      if (!res.ok) throw new Error('Failed to add');
      const added = await res.json();
      setSuppliers([...suppliers, added]);
      setNewExpSupplierId(added.id); // Auto-select for convenience
      setIsAddingSupplier(false);
      setNewSupplierName('');
    } catch (error) {
      alert('Error al añadir el proveedor');
    } finally {
      setIsSavingSupplier(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#10b981';
      case 'IN_PROGRESS': return '#3b82f6';
      default: return 'var(--text-muted)';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Finalizada';
      case 'IN_PROGRESS': return 'En curso';
      default: return 'Pendiente';
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
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>CLIENTE</div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>{project.client.name}</div>
            {project.address && (
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>📍 {project.address}</div>
            )}
          </div>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>FACTURADO</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-primary)' }}>
              {totalInvoiced.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #ff4444' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>GASTOS REALES</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#ff4444' }}>
              {totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>MARGEN ESTIMADO</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: netResult >= 0 ? '#10b981' : '#ff4444' }}>
              {netResult.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
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
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', overflowX: 'auto' }}>
          <button
            onClick={() => setActiveTab('budget')}
            style={{
              padding: '16px 24px',
              color: activeTab === 'budget' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'budget' ? '2px solid var(--accent-primary)' : 'none',
              background: 'none',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            Presupuesto ({project.budgetLines.length})
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            style={{
              padding: '16px 24px',
              color: activeTab === 'expenses' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'expenses' ? '2px solid var(--accent-primary)' : 'none',
              background: 'none',
              fontWeight: '600',
              whiteSpace: 'nowrap'
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
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            📊 Análisis y Control
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            style={{
              padding: '16px 24px',
              color: activeTab === 'invoices' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'invoices' ? '2px solid var(--accent-primary)' : 'none',
              background: 'none',
              fontWeight: '600',
              whiteSpace: 'nowrap'
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
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            Presupuestos ({project.estimates.length})
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {activeTab === 'budget' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>Partidas del Proyecto</div>
                <button className="btn-primary" onClick={() => setIsAddingLine(true)} style={{ padding: '8px 16px', fontSize: '14px' }}>
                  + Añadir Partida
                </button>
              </div>

              {isAddingLine && (
                <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', border: '1px solid var(--accent-primary)' }}>
                  <form onSubmit={handleAddBudgetLine}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '16px', alignItems: 'flex-start' }}>
                      <div className={styles.formGroup}>
                        <label>Concepto / Partida *</label>
                        <input 
                          type="text" 
                          className="input-modern" 
                          placeholder="Ej: Demolición y Desescombro" 
                          value={newLineName}
                          onChange={e => setNewLineName(e.target.value)}
                          required
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Importe Estimado (€)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          className="input-modern" 
                          placeholder="0.00" 
                          value={newLineAmount}
                          onChange={e => setNewLineAmount(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
                        <button type="button" className="btn-secondary" onClick={() => setIsAddingLine(false)} disabled={isSavingLine}>
                          Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSavingLine}>
                          {isSavingLine ? '...' : 'Añadir'}
                        </button>
                      </div>
                    </div>
                    <div className={styles.formGroup} style={{ marginTop: '12px' }}>
                      <label>Descripción (Opcional)</label>
                      <input 
                        type="text" 
                        className="input-modern" 
                        placeholder="Breve descripción de los trabajos..." 
                        value={newLineDesc}
                        onChange={e => setNewLineDesc(e.target.value)}
                      />
                    </div>
                  </form>
                </div>
              )}

              <table className={invStyles.table}>
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Estado</th>
                    <th>Descripción</th>
                    <th style={{ textAlign: 'right' }}>Presupuestado</th>
                    <th style={{ width: '80px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {project.budgetLines.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No hay partidas definidas. Comienza añadiendo una presupuestada.</td></tr>
                  ) : project.budgetLines.map((line: any) => (
                    <tr key={line.id}>
                      <td style={{ fontWeight: '600' }}>{line.name}</td>
                      <td>
                        <select
                          value={line.status}
                          onChange={(e) => handleUpdateBudgetLineStatus(line.id, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.05)',
                            color: getStatusColor(line.status),
                            border: `1px solid ${getStatusColor(line.status)}`,
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          <option value="PENDING">Pendiente</option>
                          <option value="IN_PROGRESS">En curso</option>
                          <option value="COMPLETED">Finalizada</option>
                        </select>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{line.description || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700' }}>
                        {line.estimatedAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={() => handleDeleteBudgetLine(line.id)}
                          style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '18px' }}
                          title="Eliminar partida"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                  {project.budgetLines.length > 0 && (
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <td colSpan={2} style={{ textAlign: 'right', fontWeight: '700', padding: '16px' }}>TOTAL PRESUPUESTADO:</td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--accent-primary)', fontSize: '18px', padding: '16px' }}>
                        {totalBudgeted.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'expenses' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>Registro de Gastos</div>
                <button className="btn-primary" onClick={() => setIsAddingExpense(true)} style={{ padding: '8px 16px', fontSize: '14px' }}>
                  + Anotar Gasto
                </button>
              </div>

              {isAddingExpense && (
                <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', border: '1px solid #ff4444' }}>
                  <form onSubmit={handleAddExpense}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '16px', alignItems: 'flex-start' }}>
                      <div className={styles.formGroup}>
                        <label>Descripción / Concepto *</label>
                        <input 
                          type="text" 
                          className="input-modern" 
                          placeholder="Ej: Factura BricoDepot" 
                          value={newExpDesc}
                          onChange={e => setNewExpDesc(e.target.value)}
                          required
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Categoría</label>
                        <select 
                          className="input-modern" 
                          value={newExpCategory}
                          onChange={e => setNewExpCategory(e.target.value)}
                        >
                          <option value="Materiales">Materiales</option>
                          <option value="Mano de Obra">Mano de Obra</option>
                          <option value="Herramientas">Herramientas</option>
                          <option value="Subcontrata">Subcontrata</option>
                          <option value="Otros">Otros</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Proveedor</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select 
                            className="input-modern" 
                            value={newExpSupplierId}
                            onChange={e => setNewExpSupplierId(e.target.value)}
                          >
                            <option value="">(Sin proveedor)</option>
                            {suppliers.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                          <button 
                            type="button" 
                            onClick={(e) => { e.preventDefault(); setIsAddingSupplier(true); }}
                            className="btn-secondary" 
                            style={{ padding: '0 12px' }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Partida de Obra</label>
                        <select 
                          className="input-modern" 
                          value={newExpBudgetLineId}
                          onChange={e => setNewExpBudgetLineId(e.target.value)}
                        >
                          <option value="">(Gasto general)</option>
                          {project.budgetLines.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
                        <button type="button" className="btn-secondary" onClick={() => setIsAddingExpense(false)} disabled={isSavingExpense}>
                          ×
                        </button>
                        <button type="submit" className="btn-primary" style={{ background: '#ff4444' }} disabled={isSavingExpense}>
                          {isSavingExpense ? '...' : 'OK'}
                        </button>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label>Importe (€) *</label>
                        <input 
                          type="number" 
                          step="0.01"
                          className="input-modern" 
                          placeholder="0.00" 
                          value={newExpAmount}
                          onChange={e => setNewExpAmount(e.target.value)}
                          required
                        />
                      </div>
                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label>Fecha</label>
                        <input 
                          type="date" 
                          className="input-modern" 
                          value={newExpDate}
                          onChange={e => setNewExpDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {isAddingSupplier && (
                <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', border: '1px solid var(--accent-primary)' }}>
                  <form onSubmit={handleAddSupplier}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label>Nombre del Nuevo Proveedor</label>
                        <input 
                          type="text" 
                          className="input-modern" 
                          value={newSupplierName}
                          onChange={e => setNewSupplierName(e.target.value)}
                          placeholder="Ej: Carpintería Juan"
                          required
                        />
                      </div>
                      <button type="button" className="btn-secondary" onClick={() => setIsAddingSupplier(false)}>Cancelar</button>
                      <button type="submit" className="btn-primary" disabled={isSavingSupplier}>
                        {isSavingSupplier ? '...' : 'Añadir'}
                      </button>
                    </div>
                  </form>
                </div>
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
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No hay gastos registrados. Anota el primer gasto para controlar la rentabilidad.</td></tr>
                  ) : project.expenses.map((exp: any) => (
                    <tr key={exp.id}>
                      <td>{new Date(exp.date).toLocaleDateString()}</td>
                      <td style={{ fontWeight: '500' }}>{exp.description}</td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
                          {exp.category}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: '#ff4444' }}>
                        {exp.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={() => handleDeleteExpense(exp.id)}
                          style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '18px' }}
                          title="Eliminar gasto"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                  {project.expenses.length > 0 && (
                    <tr style={{ background: 'rgba(255, 68, 68, 0.05)' }}>
                      <td colSpan={3} style={{ textAlign: 'right', fontWeight: '700', padding: '16px' }}>TOTAL GASTOS:</td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: '#ff4444', fontSize: '18px', padding: '16px' }}>
                        {totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'analysis' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h4 style={{ marginBottom: '20px' }}>Ejecución vs Presupuesto</h4>
                  <div style={{ height: '300px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={budgetData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="var(--text-muted)" />
                        <YAxis stroke="var(--text-muted)" />
                        <Tooltip 
                          contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        />
                        <Legend />
                        <Bar dataKey="Presupuestado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Facturado" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ marginTop: '20px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Pendiente de Facturar:</span>
                      <span style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>{pendingToInvoice.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                    </div>
                    <div className="progress-bar-bg" style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          height: '100%', 
                          width: `${Math.min(100, (totalInvoiced / totalBudgeted) * 100)}%`, 
                          background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                          transition: 'width 0.5s ease-in-out'
                        }} 
                      />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '11px', marginTop: '4px', color: 'var(--text-muted)' }}>
                      {((totalInvoiced / totalBudgeted) * 100 || 0).toFixed(1)}% ejecutado
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h4 style={{ marginBottom: '20px' }}>Rentabilidad Real</h4>
                  <div style={{ height: '300px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={profitData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="var(--text-muted)" />
                        <YAxis stroke="var(--text-muted)" />
                        <Tooltip 
                          contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        />
                        <Legend />
                        <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Gastos" fill="#ff4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ marginTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px' }}>Margen sobre Ingresos:</span>
                      <span style={{ fontSize: '20px', fontWeight: '800', color: marginPercentage >= 0 ? '#10b981' : '#ff4444' }}>
                        {marginPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {pieData.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h4 style={{ marginBottom: '20px' }}>Distribución por Categoría</h4>
                    <div style={{ height: '250px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h4 style={{ marginBottom: '20px' }}>Gastos por Proveedor</h4>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      <table className={invStyles.table} style={{ fontSize: '13px' }}>
                        <thead>
                          <tr>
                            <th>Proveedor</th>
                            <th style={{ textAlign: 'right' }}>Importe</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const bySupplier = project.expenses.reduce((acc: any, exp: any) => {
                              const sName = exp.supplier?.name || 'Varios / Sin asignar';
                              acc[sName] = (acc[sName] || 0) + exp.amount;
                              return acc;
                            }, {});
                            return Object.entries(bySupplier)
                              .sort((a: any, b: any) => b[1] - a[1])
                              .map(([name, amount]: any) => (
                                <tr key={name}>
                                  <td>{name}</td>
                                  <td style={{ textAlign: 'right', fontWeight: '700' }}>
                                    {amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                  </td>
                                </tr>
                              ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              <div className="glass-panel" style={{ padding: '24px' }}>
                <h4 style={{ marginBottom: '20px' }}>Seguimiento del Presupuesto (Partida a Partida)</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table className={invStyles.table} style={{ fontSize: '14px' }}>
                    <thead>
                      <tr>
                        <th>Partida</th>
                        <th style={{ textAlign: 'right' }}>Presupuestado</th>
                        <th style={{ textAlign: 'right' }}>Gastado Real</th>
                        <th style={{ textAlign: 'right' }}>Diferencia</th>
                        <th style={{ width: '150px' }}>% Desviación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.budgetLines.map((line: any) => {
                        const lineExpenses = project.expenses
                          .filter((exp: any) => exp.budgetLineId === line.id)
                          .reduce((sum: number, exp: any) => sum + exp.amount, 0);
                        const diff = line.estimatedAmount - lineExpenses;
                        const percent = line.estimatedAmount > 0 ? (lineExpenses / line.estimatedAmount) * 100 : 0;
                        
                        return (
                          <tr key={line.id}>
                            <td style={{ fontWeight: '600' }}>{line.name}</td>
                            <td style={{ textAlign: 'right' }}>{line.estimatedAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                            <td style={{ textAlign: 'right', color: '#ff4444' }}>{lineExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                            <td style={{ textAlign: 'right', fontWeight: '700', color: diff >= 0 ? '#10b981' : '#ff4444' }}>
                              {diff.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ 
                                    height: '100%', 
                                    width: `${Math.min(100, percent)}%`, 
                                    background: percent > 100 ? '#ef4444' : percent > 80 ? '#f59e0b' : '#3b82f6' 
                                  }} />
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: '700' }}>{percent.toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Expenses not linked to any line */}
                      {(() => {
                        const generalExpenses = project.expenses
                          .filter((exp: any) => !exp.budgetLineId)
                          .reduce((sum: number, exp: any) => sum + exp.amount, 0);
                        if (generalExpenses === 0) return null;
                        return (
                          <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <td style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Gastos Generales / No asignados</td>
                            <td style={{ textAlign: 'right' }}>-</td>
                            <td style={{ textAlign: 'right', color: '#ff4444' }}>{generalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                            <td style={{ textAlign: 'right' }}>-</td>
                            <td></td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'invoices' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Link href={`/invoices/new?projectId=${project.id}`} className="btn-primary" style={{ fontSize: '14px' }}>
                  + Nueva Factura
                </Link>
              </div>
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
          </div>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Link href={`/estimates/new?projectId=${project.id}`} className="btn-primary" style={{ fontSize: '14px' }}>
                  + Nuevo Presupuesto
                </Link>
              </div>
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
