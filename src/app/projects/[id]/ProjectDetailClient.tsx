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
import { formatCurrency } from '@/lib/format';

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
    certifications: any[];
  };
  clients: any[];
}

export default function ProjectDetailClient({ project: initialProject, clients }: ProjectDetailClientProps) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [activeTab, setActiveTab] = useState<'budget' | 'expenses' | 'analysis' | 'invoices' | 'estimates' | 'certifications'>('budget');
  
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

  // Certifications state
  const [isAddingCert, setIsAddingCert] = useState(false);
  const [newCertNumber, setNewCertNumber] = useState('');
  const [newCertPeriod, setNewCertPeriod] = useState('');
  const [certLines, setCertLines] = useState<any[]>([]); // Current progress entries
  const [isSavingCert, setIsSavingCert] = useState(false);
  const [certRetention, setCertRetention] = useState(5); // Default 5%

  useState(() => {
    fetch('/api/suppliers').then(r => r.json()).then(setSuppliers);
    return () => {};
  });

  const totalInvoiced = project.invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalExpenses = project.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalBudgeted = project.budgetLines.reduce((sum, l) => sum + l.estimatedAmount, 0);
  const totalCertified = project.budgetLines.reduce((sum, l) => sum + (l.certifiedAmount || 0), 0);
  const netResult = totalInvoiced - totalExpenses;
  const marginPercentage = totalInvoiced > 0 ? (netResult / totalInvoiced) * 100 : 0;
  const pendingToInvoice = Math.max(0, totalBudgeted - totalInvoiced);
  const pendingToCertify = Math.max(0, totalBudgeted - totalCertified);

  // Chart Data
  const budgetData = [
    { name: 'Ejecución Económica', Presupuestado: totalBudgeted, Certificado: totalCertified, Facturado: totalInvoiced }
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

  const handleGenerateInvoice = async (cert: any) => {
    if (!confirm(`¿Generar factura para la certificación ${cert.number}?`)) return;
    
    try {
      const res = await fetch(`/api/projects/certifications/${cert.id}/invoice`, {
        method: 'POST'
      });
      
      if (!res.ok) throw new Error('Failed to generate invoice');
      const invoice = await res.json();
      
      // Update local state: certification now has an invoiceId
      setProject({
        ...project,
        certifications: project.certifications.map((c: any) => 
          c.id === cert.id ? { ...c, invoiceId: invoice.id } : c
        ),
        invoices: [invoice, ...project.invoices]
      });
      
      alert('Factura generada con éxito. Puedes verla en la pestaña de Facturas.');
    } catch (error) {
      console.error(error);
      alert('Error al generar la factura');
    }
  };

  const handleCreateCertification = async () => {
    if (!newCertNumber) {
      alert("Por favor indica un número de certificación.");
      return;
    }

    const bruto = certLines.reduce((sum, l) => sum + l.current, 0);
    if (bruto <= 0) {
      alert("La certificación debe tener un importe mayor que 0.");
      return;
    }

    setIsSavingCert(true);
    try {
      const retencion = bruto * (certRetention / 100);
      const neto = bruto - retencion;

      const res = await fetch(`/api/projects/${project.id}/certifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: newCertNumber,
          date: new Date().toISOString(),
          period: newCertPeriod,
          totalAmount: bruto,
          retentionAmount: retencion,
          netAmount: neto,
          lines: certLines.map(l => ({
            budgetLineId: l.budgetLineId,
            previousAmount: l.previous,
            currentAmount: l.current,
            totalToDate: l.previous + l.current,
            percentage: ((l.previous + l.current) / l.estimated) * 100
          }))
        })
      });

      if (!res.ok) throw new Error('Failed to create certification');
      const newCert = await res.json();

      // Update local state: add new cert and update budget line certified amounts
      setProject({
        ...project,
        certifications: [newCert, ...(project.certifications || [])],
        budgetLines: project.budgetLines.map(l => {
          const lineUpdate = certLines.find(cl => cl.budgetLineId === l.id);
          if (lineUpdate) {
            return { ...l, certifiedAmount: (l.certifiedAmount || 0) + lineUpdate.current };
          }
          return l;
        })
      });

      setIsAddingCert(false);
      alert('Certificación emitida con éxito');
    } catch (error) {
      console.error(error);
      alert('Error al emitir la certificación');
    } finally {
      setIsSavingCert(false);
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
          <button
            onClick={() => setActiveTab('certifications')}
            style={{
              padding: '16px 24px',
              color: activeTab === 'certifications' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'certifications' ? '2px solid var(--accent-primary)' : 'none',
              background: 'none',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            Certificaciones ({project.certifications?.length || 0})
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
                    <th style={{ textAlign: 'right' }}>Presupuestado</th>
                    <th style={{ textAlign: 'right' }}>Certificado (Acum.)</th>
                    <th style={{ width: '120px' }}>% Avance</th>
                    <th style={{ width: '80px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {project.budgetLines.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No hay partidas definidas. Comienza añadiendo una presupuestada.</td></tr>
                  ) : project.budgetLines.map((line: any) => {
                    const progress = line.estimatedAmount > 0 ? (line.certifiedAmount / line.estimatedAmount) * 100 : 0;
                    return (
                      <tr key={line.id}>
                        <td style={{ fontWeight: '600' }}>
                          <div>{line.name}</div>
                          {line.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '400' }}>{line.description}</div>}
                        </td>
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
                        <td style={{ textAlign: 'right' }}>{line.estimatedAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: progress >= 100 ? '#10b981' : 'var(--text-primary)' }}>
                          {(line.certifiedAmount || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(100, progress)}%`, background: progress >= 100 ? '#10b981' : '#3b82f6' }} />
                            </div>
                            <span style={{ fontSize: '11px' }}>{progress.toFixed(0)}%</span>
                          </div>
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
                    );
                  })}
                  {project.budgetLines.length > 0 && (
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <td colSpan={2} style={{ textAlign: 'right', fontWeight: '700', padding: '16px' }}>TOTAL PRESUPUESTADO:</td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--accent-primary)', fontSize: '18px', padding: '16px' }}>
                        {totalBudgeted.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                      </td>
                      <td colSpan={3}></td>
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
                      <span>Pendiente de Certificar:</span>
                      <span style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>{formatCurrency(pendingToCertify)}</span>
                    </div>
                    <div className="progress-bar-bg" style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          height: '100%', 
                          width: `${Math.min(100, (totalCertified / totalBudgeted) * 100)}%`, 
                          background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                          transition: 'width 0.5s ease-in-out'
                        }} 
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Pendiente de Facturar:</span>
                      <span style={{ fontWeight: '700', color: '#f59e0b' }}>{formatCurrency(pendingToInvoice)}</span>
                    </div>
                    <div className="progress-bar-bg" style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          height: '100%', 
                          width: `${Math.min(100, (totalInvoiced / totalBudgeted) * 100)}%`, 
                          background: 'linear-gradient(90deg, #10b981, #f59e0b)',
                          transition: 'width 0.5s ease-in-out'
                        }} 
                      />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '11px', marginTop: '4px', color: 'var(--text-muted)' }}>
                      {((totalInvoiced / totalBudgeted) * 100 || 0).toFixed(1)}% facturado
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
                          <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
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
                                    {formatCurrency(amount)}
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
                            <td style={{ textAlign: 'right' }}>{formatCurrency(line.estimatedAmount)}</td>
                            <td style={{ textAlign: 'right', color: '#ff4444' }}>{formatCurrency(lineExpenses)}</td>
                            <td style={{ textAlign: 'right', fontWeight: '700', color: diff >= 0 ? '#10b981' : '#ff4444' }}>
                              {formatCurrency(diff)}
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
        ) : activeTab === 'certifications' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>Certificaciones de Obra</div>
              <button 
                className="btn-primary" 
                onClick={() => {
                  setNewCertNumber(`CERT-${(project.certifications?.length || 0) + 1}`.padStart(3, '0'));
                  setNewCertPeriod(new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' }));
                  // Initialize lines with 0 current progress
                  setCertLines(project.budgetLines.map(l => ({
                    budgetLineId: l.id,
                    name: l.name,
                    estimated: l.estimatedAmount,
                    previous: l.certifiedAmount || 0,
                    current: 0
                  })));
                  setIsAddingCert(true);
                }}
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                + Nueva Certificación
              </button>
            </div>

            <div className={`glass-panel ${invStyles.tableContainer}`}>
              <table className={invStyles.table}>
                <thead>
                  <tr>
                    <th>Nº</th>
                    <th>Fecha</th>
                    <th>Periodo</th>
                    <th style={{ textAlign: 'right' }}>Total (Bruto)</th>
                    <th style={{ textAlign: 'right' }}>Retención (5%)</th>
                    <th style={{ textAlign: 'right' }}>Neto</th>
                    <th>Estado</th>
                    <th>Factura</th>
                  </tr>
                </thead>
                <tbody>
                  {!project.certifications || project.certifications.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No hay certificaciones emitidas.</td></tr>
                  ) : project.certifications.map((cert: any) => (
                    <tr key={cert.id}>
                      <td><strong>{cert.number}</strong></td>
                      <td>{new Date(cert.date).toLocaleDateString()}</td>
                      <td>{cert.period}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(cert.totalAmount)}</td>
                      <td style={{ textAlign: 'right', color: '#ff4444' }}>-{formatCurrency(cert.retentionAmount)}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--accent-primary)' }}>{formatCurrency(cert.netAmount)}</td>
                      <td>
                        <span className={`badge badge-${cert.status === 'ISSUED' ? 'success' : 'warning'}`}>
                          {cert.status}
                        </span>
                      </td>
                      <td>
                        {cert.invoiceId ? (
                          <Link href={`/invoices/${cert.invoiceId}`} className="text-accent">Ver Factura</Link>
                        ) : (
                          <button 
                            className="btn-primary" 
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => handleGenerateInvoice(cert)}
                          >
                            Facturar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

      {isAddingCert && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }}>
            <h2 className="text-gradient">Nueva Certificación de Obra</h2>
            <p className={styles.subtitle}>Indica el avance de cada partida para este periodo.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', margin: '20px 0' }}>
              <div className={styles.formGroup}>
                <label>Número de Certificación</label>
                <input 
                  type="text" 
                  className="input-modern" 
                  value={newCertNumber}
                  onChange={e => setNewCertNumber(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Periodo / Mes</label>
                <input 
                  type="text" 
                  className="input-modern" 
                  value={newCertPeriod}
                  onChange={e => setNewCertPeriod(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>% Retención</span>
                  <button 
                    onClick={() => setCertRetention(0)} 
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '10px' }}
                  >
                    (Poner a 0%)
                  </button>
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  className="input-modern" 
                  value={certRetention}
                  onChange={e => setCertRetention(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className={invStyles.tableContainer} style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
              <table className={invStyles.table}>
                <thead>
                  <tr>
                    <th>Partida</th>
                    <th style={{ textAlign: 'right' }}>Presupuestado</th>
                    <th style={{ textAlign: 'right' }}>Ant. Certificado</th>
                    <th style={{ textAlign: 'right' }}>Certificar Ahora (€)</th>
                    <th style={{ textAlign: 'right' }}>Total (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {certLines.map((line, idx) => (
                    <tr key={line.budgetLineId}>
                      <td>{line.name}</td>
                      <td style={{ textAlign: 'right' }}>{line.estimated.toFixed(2)} €</td>
                      <td style={{ textAlign: 'right' }}>{line.previous.toFixed(2)} €</td>
                      <td style={{ textAlign: 'right' }}>
                        <input 
                          type="number" 
                          className="input-modern" 
                          style={{ width: '120px', textAlign: 'right', padding: '4px 8px' }}
                          value={line.current}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const newLines = [...certLines];
                            newLines[idx].current = val;
                            setCertLines(newLines);
                          }}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {line.estimated > 0 ? (((line.previous + line.current) / line.estimated) * 100).toFixed(1) : '100'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick Add Extra Line */}
            <div style={{ padding: '16px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Añadir Concepto Extra (Anticipo, Modificado, etc.)</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Concepto</label>
                  <input id="quick-line-name" type="text" className="input-modern" placeholder="Ej: Entrega a cuenta inicial" style={{ padding: '6px 12px' }} />
                </div>
                <div style={{ width: '150px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Importe (€)</label>
                  <input id="quick-line-amount" type="number" className="input-modern" placeholder="0.00" style={{ padding: '6px 12px' }} />
                </div>
                <button 
                  className="btn-secondary" 
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={async () => {
                    const name = (document.getElementById('quick-line-name') as HTMLInputElement).value;
                    const amount = parseFloat((document.getElementById('quick-line-amount') as HTMLInputElement).value) || 0;
                    if (!name || amount <= 0) return alert("Indica nombre e importe");
                    
                    try {
                      // 1. Create the budget line
                      const res = await fetch(`/api/projects/${project.id}/budget-lines`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, estimatedAmount: amount, description: 'Partida añadida desde certificación' })
                      });
                      if (!res.ok) throw new Error('Failed to add line');
                      const newLine = await res.json();
                      
                      // 2. Update parent state
                      setProject({
                        ...project,
                        budgetLines: [...project.budgetLines, newLine]
                      });
                      
                      // 3. Update local certLines
                      setCertLines([...certLines, {
                        budgetLineId: newLine.id,
                        name: newLine.name,
                        estimated: newLine.estimatedAmount,
                        previous: 0,
                        current: amount
                      }]);
                      
                      // Clear inputs
                      (document.getElementById('quick-line-name') as HTMLInputElement).value = '';
                      (document.getElementById('quick-line-amount') as HTMLInputElement).value = '';
                    } catch (e) {
                      alert("Error al añadir concepto");
                    }
                  }}
                >
                  + Añadir
                </button>
              </div>
            </div>

            {(() => {
              const bruto = certLines.reduce((sum, l) => sum + l.current, 0);
              const retencion = bruto * (certRetention / 100);
              const neto = bruto - retencion;
              return (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Total Bruto Certificado (este periodo):</span>
                    <span style={{ fontWeight: '600' }}>{bruto.toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#ff4444' }}>
                    <span>Retención de Garantía ({certRetention}%):</span>
                    <span>-{retencion.toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700', color: 'var(--accent-primary)' }}>
                    <span>Líquido a Percibir:</span>
                    <span>{neto.toFixed(2)} €</span>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setIsAddingCert(false)} disabled={isSavingCert}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleCreateCertification} disabled={isSavingCert}>
                {isSavingCert ? "Guardando..." : "Emitir Certificación"}
              </button>
            </div>
          </div>
        </div>
      )}

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
