"use client";

import { useState, useEffect } from 'react';
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
import GanttChart from '@/components/GanttChart';

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
  const [activeTab, setActiveTab] = useState<'budget' | 'expenses' | 'analysis' | 'invoices' | 'estimates' | 'certifications' | 'diario' | 'documents' | 'planificacion'>('budget');
  
  // Site Journal & Documents
  const [logs, setLogs] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  
  // Certification Editing
  const [editingCert, setEditingCert] = useState<any | null>(null);
  
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const [isFetchingDocs, setIsFetchingDocs] = useState(false);
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [newLogContent, setNewLogContent] = useState('');
  const [newLogWeather, setNewLogWeather] = useState('Soleado');
  const [newLogIncidents, setNewLogIncidents] = useState('');
  const [isSavingLog, setIsSavingLog] = useState(false);
  
  // Budget management state
  const [isSavingLine, setIsSavingLine] = useState(false);
  const [isAddingLine, setIsAddingLine] = useState(false);
  const [newLineName, setNewLineName] = useState('');
  const [newLineAmount, setNewLineAmount] = useState('');
  const [newLineDesc, setNewLineDesc] = useState('');

  // Reset adding states when changing tabs to prevent UI leaks
  useEffect(() => {
    setIsAddingLine(false);
    setIsAddingExpense(false);
    setIsAddingCert(false);
    setIsAddingLog(false);
    setIsAddingDoc(false);
  }, [activeTab]);

  // Expenses management state
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpDate, setNewExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [newExpCategory, setNewExpCategory] = useState('Materiales');
  const [newExpClientId, setNewExpClientId] = useState('');
  const [newExpStatus, setNewExpStatus] = useState('PENDIENTE');
  const [newExpBudgetLineId, setNewExpBudgetLineId] = useState('');
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  
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

  const fetchLogs = async () => {
    setIsFetchingLogs(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/logs`);
      if (res.ok) setLogs(await res.json());
    } catch (e) { console.error(e); }
    setIsFetchingLogs(false);
  };

  const fetchDocs = async () => {
    setIsFetchingDocs(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/documents`);
      if (res.ok) setDocuments(await res.json());
    } catch (e) { console.error(e); }
    setIsFetchingDocs(false);
  };

  useEffect(() => {
    if (activeTab === 'diario') {
      fetchLogs();
    } else if (activeTab === 'documents') {
      fetchDocs();
    }
  }, [activeTab]);

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

  const handleUpdateBudgetLineDates = async (lineId: string, field: 'startDate' | 'endDate', value: string) => {
    try {
      const res = await fetch(`/api/projects/budget/${lineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value || null })
      });
      if (!res.ok) throw new Error('Failed to update dates');
      const updatedLine = await res.json();
      setProject({
        ...project,
        budgetLines: project.budgetLines.map((l: any) => l.id === lineId ? updatedLine : l)
      });
    } catch (error) {
      console.error(error);
      alert('Error al actualizar la fecha');
    }
  };

  const handleDeleteCertification = async (certId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta certificación? Los importes certificados se restarán automáticamente de las partidas de la obra.')) return;

    try {
      const res = await fetch(`/api/projects/certifications/${certId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete certification');
      }

      setProject({
        ...project,
        certifications: project.certifications.filter((c: any) => c.id !== certId)
      });
      
      // Refresh project data to get updated budget line amounts
      const updatedProjectRes = await fetch(`/api/projects/${project.id}`);
      if (updatedProjectRes.ok) {
        const updatedProject = await updatedProjectRes.json();
        setProject(updatedProject);
      }

      alert('Certificación eliminada correctamente');
    } catch (error: any) {
      console.error(error);
      alert(`Error al eliminar la certificación: ${error.message}`);
    }
  };

  const handleUpdateCertification = async () => {
    if (!editingCert) return;
    
    try {
      const res = await fetch(`/api/projects/certifications/${editingCert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: editingCert.number,
          date: editingCert.date,
          period: editingCert.period
        })
      });

      if (!res.ok) throw new Error('Failed to update certification');
      
      const updated = await res.json();
      setProject({
        ...project,
        certifications: project.certifications.map((c: any) => c.id === updated.id ? { ...c, ...updated } : c)
      });
      setEditingCert(null);
    } catch (error) {
      console.error(error);
      alert('Error al actualizar la certificación');
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
            totalToDate: l.totalToDate || (l.previous + l.current),
            percentage: l.percentage || (((l.previous + l.current) / (l.estimated || 1)) * 100)
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
          clientId: newExpClientId || null,
          budgetLineId: newExpBudgetLineId || null,
          status: newExpStatus
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
      setNewExpClientId('');
      setNewExpStatus('PENDIENTE');
      setNewExpCategory('Materiales');
      setNewExpBudgetLineId('');
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
          <button
            onClick={() => setActiveTab('planificacion')}
            style={{
              padding: '16px 24px',
              color: activeTab === 'planificacion' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'planificacion' ? '2px solid var(--accent-primary)' : 'none',
              background: 'none',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            📅 Planificación
          </button>
          <button
            onClick={() => setActiveTab('diario')}
            style={{
              padding: '16px 24px',
              color: activeTab === 'diario' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'diario' ? '2px solid var(--accent-primary)' : 'none',
              background: 'none',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            Diario de Obra
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            style={{
              padding: '16px 24px',
              color: activeTab === 'documents' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'documents' ? '2px solid var(--accent-primary)' : 'none',
              background: 'none',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            Documentación
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {activeTab === 'planificacion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>Cronograma de la Obra (Gantt)</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Las barras muestran el periodo de ejecución y el relleno indica el avance certificado.
                </div>
              </div>
              <GanttChart budgetLines={project.budgetLines} />
              
              <div className="glass-panel" style={{ padding: '20px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  💡 **Consejo:** Para cambiar las fechas de una partida, ve a la pestaña de **Presupuesto** y usa los selectores de fecha en la columna "Inicio / Fin".
                </p>
              </div>
            </div>
          )}

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
                    <th>Inicio / Fin</th>
                    <th style={{ textAlign: 'right' }}>Presupuestado</th>
                    <th style={{ textAlign: 'right' }}>Certificado</th>
                    <th style={{ textAlign: 'right' }}>Gastado (Real)</th>
                    <th style={{ width: '100px' }}>% Avance</th>
                    <th style={{ width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {project.budgetLines.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No hay partidas definidas. Comienza añadiendo una presupuestada.</td></tr>
                  ) : project.budgetLines.map((line: any) => {
                    const progress = line.estimatedAmount > 0 ? (line.certifiedAmount / line.estimatedAmount) * 100 : 0;
                    const lineExpenses = project.expenses
                      .filter((exp: any) => exp.budgetLineId === line.id)
                      .reduce((sum: number, exp: any) => sum + exp.amount, 0);
                    const isOverBudget = lineExpenses > line.estimatedAmount;
                    
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
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(255,255,255,0.05)',
                              color: getStatusColor(line.status),
                              fontSize: '11px',
                              outline: 'none',
                              width: '100px'
                            }}
                          >
                            <option value="PENDING">Pendiente</option>
                            <option value="IN_PROGRESS">En curso</option>
                            <option value="COMPLETED">Finalizada</option>
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <input 
                              type="date" 
                              value={line.startDate ? new Date(line.startDate).toISOString().split('T')[0] : ''} 
                              onChange={(e) => handleUpdateBudgetLineDates(line.id, 'startDate', e.target.value)}
                              style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '2px 4px', outline: 'none' }}
                            />
                            <input 
                              type="date" 
                              value={line.endDate ? new Date(line.endDate).toISOString().split('T')[0] : ''} 
                              onChange={(e) => handleUpdateBudgetLineDates(line.id, 'endDate', e.target.value)}
                              style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '2px 4px', outline: 'none' }}
                            />
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          {formatCurrency(line.estimatedAmount)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '500' }}>
                          {formatCurrency(line.certifiedAmount || 0)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: isOverBudget ? '#ff4444' : 'var(--text-primary)' }}>
                          {formatCurrency(lineExpenses)}
                          {isOverBudget && <div style={{ fontSize: '9px', fontWeight: '400' }}>¡EXCESO!</div>}
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
                <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px', border: '1px solid var(--accent-primary)' }}>
                  <form onSubmit={handleAddExpense}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 140px 1fr auto', gap: '16px', alignItems: 'flex-start' }}>
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
                          <option value="Maquinaria">Maquinaria</option>
                          <option value="Subcontrata">Subcontrata</option>
                          <option value="Otros">Otros</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Proveedor / Subcontrata</label>
                        <select 
                          className="input-modern" 
                          value={newExpClientId}
                          onChange={e => setNewExpClientId(e.target.value)}
                        >
                          <option value="">(Sin asignar / Varios)</option>
                          {clients
                            .filter(c => c.category !== 'CLIENTE' || c.category === 'MIXTO')
                            .map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.category})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Estado Cobro</label>
                        <select 
                          className="input-modern" 
                          value={newExpStatus}
                          onChange={e => setNewExpStatus(e.target.value)}
                        >
                          <option value="PENDIENTE">PENDIENTE</option>
                          <option value="PAGADO">PAGADO</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Vincular a Partida</label>
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
                        <button type="submit" className="btn-primary" disabled={isSavingExpense}>
                          {isSavingExpense ? '...' : 'OK'}
                        </button>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label>Importe Bruto (€) *</label>
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
                        <label>Fecha de Factura / Gasto</label>
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

              <div className={`glass-panel ${invStyles.tableContainer}`} style={{ marginTop: '24px' }}>
                <table className={invStyles.table}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Concepto / Proveedor</th>
                      <th>Categoría</th>
                      <th style={{ textAlign: 'right' }}>Importe</th>
                      <th style={{ textAlign: 'center' }}>Cobro</th>
                      <th style={{ width: '80px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.expenses.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No hay gastos registrados. Anota el primer gasto para controlar la rentabilidad.</td></tr>
                    ) : project.expenses.map((exp: any) => (
                      <tr key={exp.id}>
                        <td>{new Date(exp.date).toLocaleDateString()}</td>
                        <td>
                          <div style={{ fontWeight: '600' }}>{exp.description}</div>
                          <div style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>
                            {exp.client ? exp.client.name : 'Varios / Otros'}
                          </div>
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
                            {exp.category}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: '#ff4444' }}>
                          {formatCurrency(exp.amount)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge badge-${exp.status === 'PAGADO' ? 'success' : 'warning'}`} style={{ fontSize: '10px' }}>
                            {exp.status || 'PENDIENTE'}
                          </span>
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
                          {formatCurrency(totalExpenses)}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
                              const sName = exp.client?.name || 'Varios / Sin asignar';
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
                    <th style={{ textAlign: 'right' }}>Total a Origen</th>
                    <th style={{ textAlign: 'right' }}>Líquido Mes</th>
                    <th style={{ textAlign: 'right' }}>Retención</th>
                    <th style={{ textAlign: 'right' }}>Neto</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                    <th>Factura</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {!project.certifications || project.certifications.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No hay certificaciones emitidas.</td></tr>
                  ) : project.certifications.map((cert: any) => {
                    const totalAOrigen = cert.lines.reduce((sum: number, l: any) => sum + (l.totalToDate || 0), 0);
                    
                    return (
                      <tr key={cert.id}>
                        <td><strong>{cert.number}</strong></td>
                        <td>{new Date(cert.date).toLocaleDateString()}</td>
                        <td>{cert.period}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px' }}>
                          {formatCurrency(totalAOrigen)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '500' }}>
                          {formatCurrency(cert.totalAmount)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#ff4444', fontSize: '13px' }}>
                          -{formatCurrency(cert.retentionAmount)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--accent-primary)' }}>
                          {formatCurrency(cert.netAmount)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge badge-${cert.status === 'ISSUED' ? 'success' : 'warning'}`}>
                            {cert.status === 'ISSUED' ? 'EMITIDA' : cert.status}
                          </span>
                        </td>
                        <td>
                          {cert.invoiceId ? (
                            <Link href={`/invoices/${cert.invoiceId}`} className="text-accent" style={{ fontSize: '12px' }}>Ver Factura</Link>
                          ) : (
                            <button 
                              className="btn-primary" 
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => handleGenerateInvoice(cert)}
                            >
                              Facturar
                            </button>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              {cert.status === 'DRAFT' && !cert.invoiceId && (
                                <>
                                  <button 
                                    className="btn-secondary" 
                                    style={{ padding: '4px 8px', fontSize: '12px' }}
                                    onClick={() => setEditingCert(cert)}
                                    title="Editar datos básicos"
                                  >
                                    ✏️
                                  </button>
                                  <button 
                                    className="btn-secondary" 
                                    style={{ padding: '4px 8px', fontSize: '12px', background: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', borderColor: 'rgba(255, 68, 68, 0.2)' }}
                                    onClick={() => handleDeleteCertification(cert.id)}
                                    title="Eliminar certificación"
                                  >
                                    🗑️
                                  </button>
                                </>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'estimates' ? (
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
        ) : activeTab === 'diario' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>Diario de Obra (Actividades Diario)</div>
              <button 
                className="btn-primary" 
                onClick={() => setIsAddingLog(!isAddingLog)} 
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                {isAddingLog ? 'Cancelar' : '+ Nueva Entrada'}
              </button>
            </div>

            {isAddingLog && (
              <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px', border: '1px solid var(--accent-primary)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Actividad / Avances del día</label>
                    <textarea 
                      className="input-modern" 
                      style={{ width: '100%', minHeight: '100px', padding: '12px' }}
                      placeholder="Ej: Hormigonado de pilares planta 1, recepción de materiales..."
                      value={newLogContent}
                      onChange={(e) => setNewLogContent(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Incidencias / Notas</label>
                    <textarea 
                      className="input-modern" 
                      style={{ width: '100%', minHeight: '100px', padding: '12px', border: '1px solid #ff444466' }}
                      placeholder="Retrasos, roturas, cambios de diseño..."
                      value={newLogIncidents}
                      onChange={(e) => setNewLogIncidents(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <div style={{ width: '200px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Clima</label>
                    <select 
                      className="input-modern" 
                      style={{ width: '100%', padding: '8px' }}
                      value={newLogWeather}
                      onChange={(e) => setNewLogWeather(e.target.value)}
                    >
                      <option value="Soleado">Soleado ☀️</option>
                      <option value="Nublado">Nublado ☁️</option>
                      <option value="Lluvia">Lluvia 🌧️</option>
                      <option value="Viento">Viento 💨</option>
                      <option value="Nieve">Nieve ❄️</option>
                    </select>
                  </div>
                  <button 
                    className="btn-primary" 
                    style={{ marginTop: '24px', padding: '10px 24px' }}
                    disabled={isSavingLog || !newLogContent}
                    onClick={async () => {
                      setIsSavingLog(true);
                      try {
                        const res = await fetch(`/api/projects/${project.id}/logs`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ content: newLogContent, weather: newLogWeather, incidents: newLogIncidents })
                        });
                        if (res.ok) {
                          setNewLogContent('');
                          setNewLogIncidents('');
                          setIsAddingLog(false);
                          fetchLogs();
                        }
                      } catch (e) { console.error(e); }
                      setIsSavingLog(false);
                    }}
                  >
                    {isSavingLog ? 'Guardando...' : 'Registrar Hoy'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {isFetchingLogs && logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando actividades...</div>
              ) : logs.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No hay registros en el diario todavía. Empieza a documentar el día a día de la obra.
                </div>
              ) : logs.map((log: any) => (
                <div key={log.id} className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--accent-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '16px' }}>{new Date(log.date).toLocaleDateString()}</span>
                      <span className="badge badge-info">{log.weather}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '15px', lineHeight: '1.6', color: 'var(--text-main)', marginBottom: log.incidents ? '12px' : '0' }}>
                    {log.content}
                  </div>
                  {log.incidents && (
                    <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '6px', fontSize: '14px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                      <strong style={{ color: '#ef4444' }}>Incidencia:</strong> {log.incidents}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'documents' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>Gestión Documental (Planos y Contratos)</div>
              <button 
                className="btn-primary" 
                onClick={() => setIsAddingDoc(!isAddingDoc)} 
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                {isAddingDoc ? 'Cancelar' : '+ Añadir Archivo'}
              </button>
            </div>

            {isAddingDoc && (
              <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px', border: '1px solid var(--accent-primary)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Nombre del Documento</label>
                    <input id="doc-name" type="text" className="input-modern" placeholder="Ej: Plano de Instalaciones Rev 2" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Categoría</label>
                    <select id="doc-cat" className="input-modern" style={{ width: '100%', padding: '10px' }}>
                      <option value="PLANO">Plano / Técnico</option>
                      <option value="CONTRATO">Contrato / Legal</option>
                      <option value="SEGURO">Seguros / Otros</option>
                      <option value="OTROS">Otros</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Enlace / URL del archivo</label>
                    <input id="doc-url" type="text" className="input-modern" placeholder="https://..." />
                  </div>
                </div>
                <button 
                  className="btn-primary" 
                  style={{ marginTop: '20px', padding: '10px 24px' }}
                  onClick={async () => {
                    const name = (document.getElementById('doc-name') as HTMLInputElement).value;
                    const url = (document.getElementById('doc-url') as HTMLInputElement).value;
                    const category = (document.getElementById('doc-cat') as HTMLSelectElement).value;
                    if (!name || !url) return alert("Indica nombre y enlace");
                    
                    try {
                      const res = await fetch(`/api/projects/${project.id}/documents`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, url, category })
                      });
                      if (res.ok) {
                        setIsAddingDoc(false);
                        fetchDocs();
                      }
                    } catch (e) { console.error(e); }
                  }}
                >
                  Guardar Documento
                </button>
              </div>
            )}

            <div className={`glass-panel ${invStyles.tableContainer}`}>
              <table className={invStyles.table}>
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Categoría</th>
                    <th>Fecha Subida</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isFetchingDocs && documents.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px' }}>Cargando documentos...</td></tr>
                  ) : documents.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No hay documentos asociados a esta obra.</td></tr>
                  ) : documents.map((doc: any) => (
                    <tr key={doc.id}>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '20px' }}>{doc.category === 'PLANO' ? '📐' : '📄'}</span>
                          <strong>{doc.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${doc.category === 'PLANO' ? 'info' : 'secondary'}`}>
                          {doc.category}
                        </span>
                      </td>
                      <td>{new Date(doc.createdAt).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>
                          Ver Archivo ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Pestaña no disponible.
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
                    <th style={{ textAlign: 'right' }}>Anterior</th>
                    <th style={{ textAlign: 'center', width: '100px' }}>% Avance</th>
                    <th style={{ textAlign: 'right' }}>A Origen (€)</th>
                    <th style={{ textAlign: 'right' }}>Certificar Ahora</th>
                  </tr>
                </thead>
                <tbody>
                  {certLines.map((line, idx) => {
                    const currentPercentage = line.estimated > 0 ? ((line.previous + (line.current || 0)) / line.estimated) * 100 : 0;
                    
                    return (
                      <tr key={line.budgetLineId}>
                        <td style={{ fontWeight: '500' }}>{line.name}</td>
                        <td style={{ textAlign: 'right', fontSize: '12px' }}>{formatCurrency(line.estimated)}</td>
                        <td style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)' }}>{formatCurrency(line.previous)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="number" 
                            className="input-modern" 
                            style={{ width: '70px', textAlign: 'center', padding: '4px' }}
                            value={((line.totalToDate || (line.previous + line.current)) / line.estimated * 100).toFixed(1)}
                            onChange={(e) => {
                              const pct = parseFloat(e.target.value) || 0;
                              const newLines = [...certLines];
                              const newTotal = (pct / 100) * line.estimated;
                              newLines[idx].totalToDate = newTotal;
                              newLines[idx].current = Math.max(0, newTotal - line.previous);
                              newLines[idx].percentage = pct;
                              setCertLines(newLines);
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <input 
                            type="number" 
                            className="input-modern" 
                            style={{ width: '110px', textAlign: 'right', padding: '4px 8px', fontWeight: '600' }}
                            value={(line.totalToDate || (line.previous + line.current)).toFixed(2)}
                            onChange={(e) => {
                              const total = parseFloat(e.target.value) || 0;
                              const newLines = [...certLines];
                              newLines[idx].totalToDate = total;
                              newLines[idx].current = Math.max(0, total - line.previous);
                              newLines[idx].percentage = line.estimated > 0 ? (total / line.estimated) * 100 : 100;
                              setCertLines(newLines);
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--accent-primary)' }}>
                          {formatCurrency(line.current)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', background: 'rgba(59, 130, 246, 0.05)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', textAlign: 'right' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Bruto Certificado</div>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>
                    {formatCurrency(certLines.reduce((sum, l) => sum + l.current, 0))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Retención Garantía ({certRetention}%)</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#ff4444' }}>
                    -{formatCurrency(certLines.reduce((sum, l) => sum + l.current, 0) * (certRetention / 100))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>Líquido a Percibir</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                    {formatCurrency(certLines.reduce((sum, l) => sum + l.current, 0) * (1 - certRetention / 100))}
                  </div>
                </div>
              </div>
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
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Importe del Modificado (€)</label>
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

      {/* Edit Certification Modal */}
      {editingCert && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
            <h3 style={{ marginBottom: '20px' }}>Editar Certificación</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-muted)' }}>Número</label>
                <input 
                  type="text" 
                  className={invStyles.inputModern} 
                  value={editingCert.number}
                  onChange={(e) => setEditingCert({ ...editingCert, number: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-muted)' }}>Fecha</label>
                <input 
                  type="date" 
                  className={invStyles.inputModern} 
                  value={new Date(editingCert.date).toISOString().split('T')[0]}
                  onChange={(e) => setEditingCert({ ...editingCert, date: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-muted)' }}>Periodo</label>
                <input 
                  type="text" 
                  className={invStyles.inputModern} 
                  value={editingCert.period}
                  onChange={(e) => setEditingCert({ ...editingCert, period: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setEditingCert(null)}>Cancelar</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={handleUpdateCertification}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
