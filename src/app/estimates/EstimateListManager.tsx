"use client";

import { useState } from 'react';
import Link from 'next/link';
import styles from '../invoices/page.module.css';
import ConfirmationModal from '@/components/ConfirmationModal';
import CustomSelect from '@/components/CustomSelect';
import { formatCurrency } from '@/lib/format';

type Estimate = {
  id: string;
  number: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  status: string;
  issueDate: string | Date;
  client: {
    name: string;
  };
  projectId?: string | null;
  project?: {
    name: string;
  } | null;
};

export default function EstimateListManager({ initialEstimates, allProjects = [] }: { initialEstimates: Estimate[], allProjects?: { id: string, name: string }[] }) {
  const [estimates, setEstimates] = useState(initialEstimates);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Staged filters (what the user sees in the inputs)
  const [stagedYear, setStagedYear] = useState<string>('all');
  const [stagedQuarter, setStagedQuarter] = useState<string>('all');
  const [stagedStartDate, setStagedStartDate] = useState<string>('');
  const [stagedEndDate, setStagedEndDate] = useState<string>('');
  
  // Applied filters (what actually filters the list)
  const [appliedYear, setAppliedYear] = useState<string>('all');
  const [appliedQuarter, setAppliedQuarter] = useState<string>('all');
  const [appliedStartDate, setAppliedStartDate] = useState<string>('');
  const [appliedEndDate, setAppliedEndDate] = useState<string>('');
  const [appliedProject, setAppliedProject] = useState<string>('all');
  const [stagedProject, setStagedProject] = useState<string>('all');
  
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; id: string; number: string }>({
    isOpen: false,
    id: '',
    number: ''
  });

  const handleDeleteClick = (id: string, number: string) => {
    setModalConfig({ isOpen: true, id, number });
  };

  const confirmDelete = async () => {
    const { id } = modalConfig;
    setModalConfig({ ...modalConfig, isOpen: false });

    setIsDeleting(id);
    try {
      const res = await fetch(`/api/estimates/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete estimate');

      setEstimates(estimates.filter(est => est.id !== id));
    } catch (error) {
      console.error(error);
      alert('Error al eliminar el presupuesto.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleApplyFilters = () => {
    setAppliedYear(stagedYear);
    setAppliedQuarter(stagedQuarter);
    setAppliedStartDate(stagedStartDate);
    setAppliedEndDate(stagedEndDate);
    setAppliedProject(stagedProject);
  };

  const handleClearFilters = () => {
    setStagedYear('all');
    setStagedQuarter('all');
    setStagedStartDate('');
    setStagedEndDate('');
    setAppliedYear('all');
    setAppliedQuarter('all');
    setAppliedStartDate('');
    setAppliedEndDate('');
    setAppliedProject('all');
    setStagedProject('all');
  };

  // Helper to get year from date
  const getYear = (dateStr: string | Date) => new Date(dateStr).getFullYear().toString();
  
  // Helper to get quarter from date
  const getQuarter = (dateStr: string | Date) => {
    const month = new Date(dateStr).getMonth();
    return Math.floor(month / 3) + 1;
  };

  // Get available years for the dropdown
  const availableYears = Array.from(new Set(initialEstimates.map(est => getYear(est.issueDate)))).sort().reverse();

  // Filter logic
  const filteredEstimates = estimates.filter(est => {
    const date = new Date(est.issueDate);
    
    // Primary filter: Manual Date Range
    if (appliedStartDate || appliedEndDate) {
      if (appliedStartDate && date < new Date(appliedStartDate)) return false;
      if (appliedEndDate && date > new Date(appliedEndDate)) return false;
      return true;
    }
    
    // Fallback filter: Year/Quarter
    const yearMatch = appliedYear === 'all' || date.getFullYear().toString() === appliedYear;
    const quarterMatch = appliedQuarter === 'all' || (Math.floor(date.getMonth() / 3) + 1).toString() === appliedQuarter;
    const projectMatch = appliedProject === 'all' || est.projectId === appliedProject;
    return yearMatch && quarterMatch && projectMatch;
  });

  // Calculate totals for the filtered set
  const totals = filteredEstimates.reduce((acc, est) => ({
    subtotal: acc.subtotal + (est.subtotal || 0),
    taxAmount: acc.taxAmount + (est.taxAmount || 0),
    total: acc.total + est.total
  }), { subtotal: 0, taxAmount: 0, total: 0 });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'Borrador';
      case 'SENT': return 'Enviado';
      case 'ACCEPTED': return 'Aceptado';
      case 'REJECTED': return 'Rechazado';
      case 'CONVERTED': return 'Convertido';
      default: return status;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'badge-warning';
      case 'ACCEPTED': return 'badge-success';
      case 'REJECTED': return 'badge-danger';
      case 'CONVERTED': return 'badge-success';
      default: return 'badge-warning';
    }
  };

  return (
    <>
      <div className={styles.controlsSection}>
        {/* Filter Bar */}
        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <label>Filtrar por Año</label>
            <CustomSelect
              value={stagedYear}
              onChange={(val) => {
                setStagedYear(val);
                setStagedStartDate('');
                setStagedEndDate('');
              }}
              options={[
                { value: 'all', label: 'Todos los años' },
                ...availableYears.map(year => ({ value: year, label: year }))
              ]}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Filtrar por Trimestre</label>
            <CustomSelect
              value={stagedQuarter}
              onChange={(val) => {
                setStagedQuarter(val);
                setStagedStartDate('');
                setStagedEndDate('');
              }}
              options={[
                { value: 'all', label: 'Todos los trimestres' },
                ...[1, 2, 3, 4].filter(q => {
                  if (stagedYear === 'all') return true;
                  const now = new Date();
                  const currentYear = now.getFullYear();
                  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
                  
                  if (parseInt(stagedYear) < currentYear) return true;
                  if (parseInt(stagedYear) === currentYear) return q <= currentQuarter;
                  return true;
                }).map(q => ({
                  value: q.toString(),
                  label: `${q}º Trimestre (T${q})`
                }))
              ]}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Filtrar por Obra</label>
            <CustomSelect
              value={stagedProject}
              onChange={(val) => setStagedProject(val)}
              options={[
                { value: 'all', label: 'Todas las obras' },
                ...allProjects.map(p => ({ value: p.id, label: p.name }))
              ]}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Desde</label>
            <input 
              type="date" 
              className={styles.inputModern} 
              value={stagedStartDate}
              onChange={(e) => {
                setStagedStartDate(e.target.value);
                setStagedYear('all');
                setStagedQuarter('all');
              }}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Hasta</label>
            <input 
              type="date" 
              className={styles.inputModern} 
              value={stagedEndDate}
              onChange={(e) => {
                setStagedEndDate(e.target.value);
                setStagedYear('all');
                setStagedQuarter('all');
              }}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>&nbsp;</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn-primary" 
                style={{ padding: '9px 24px', fontSize: '14px', fontWeight: '600' }}
                onClick={handleApplyFilters}
              >
                🔍 Filtrar
              </button>
              {(stagedYear !== 'all' || stagedQuarter !== 'all' || stagedStartDate || stagedEndDate || stagedProject !== 'all' || appliedYear !== 'all' || appliedQuarter !== 'all' || appliedStartDate || appliedEndDate || appliedProject !== 'all') && (
                <button 
                  className="btn-secondary" 
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={handleClearFilters}
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className={styles.statsGrid}>
          <div className={`glass-panel ${styles.statCard}`}>
            <span className={styles.statLabel}>Total Base Imponible</span>
            <span className={styles.statValue}>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className={`glass-panel ${styles.statCard}`}>
            <span className={styles.statLabel}>Total IVA (21%)</span>
            <span className={styles.statValue}>{formatCurrency(totals.taxAmount)}</span>
          </div>
          <div className={`glass-panel ${styles.statCard} ${styles.totalCard}`}>
            <span className={styles.statLabel}>Importe Total</span>
            <span className={styles.statValue}>{formatCurrency(totals.total)}</span>
          </div>
        </div>
      </div>

      <div className={`glass-panel ${styles.tableContainer}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nº Presupuesto</th>
              <th>Cliente</th>
              <th>Importe</th>
              <th>Estado</th>
              <th>Obra</th>
              <th>Fecha</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredEstimates.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                  {estimates.length === 0 
                  ? "No hay presupuestos todavía. ¡Crea tu primer presupuesto!" 
                  : "No se han encontrado presupuestos para el periodo seleccionado."}
                </td>
              </tr>
            ) : filteredEstimates.map((est) => (
              <tr key={est.id} className={styles.tableRow}>
                <td className={styles.cellNumber}>
                  <Link href={`/estimates/${est.id}`} className={styles.rowLink}>
                    <strong>{est.number}</strong>
                  </Link>
                </td>
                <td className={styles.cellClient}>
                  <Link href={`/estimates/${est.id}`} className={styles.rowLink}>
                    <div className={styles.clientAvatar}>
                      {est.client.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{est.client.name}</span>
                  </Link>
                </td>
                <td className={styles.cellAmount}>
                  <Link href={`/estimates/${est.id}`} className={styles.rowLink}>
                    {est.total.toFixed(2)} €
                  </Link>
                </td>
                <td>
                  <span className={`badge ${getStatusBadgeClass(est.status)}`}>
                    {getStatusLabel(est.status)}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: '13px', color: est.project ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                    {est.project ? est.project.name : '—'}
                  </span>
                </td>
                <td className={styles.cellDate}>
                  <Link href={`/estimates/${est.id}`} className={styles.rowLink}>
                    {new Date(est.issueDate).toLocaleDateString('es-ES')}
                  </Link>
                </td>
                <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <Link href={`/estimates/${est.id}`}>
                        <button className={styles.editBtn} title="Ver presupuesto">✏️</button>
                      </Link>
                      <button 
                      className={styles.deleteBtn}
                      onClick={() => handleDeleteClick(est.id, est.number)}
                      disabled={isDeleting === est.id}
                      title="Eliminar presupuesto"
                      >
                      {isDeleting === est.id ? '...' : '🗑️'}
                      </button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        title="Eliminar Presupuesto"
        message={`¿Estás seguro de que deseas eliminar el presupuesto "${modalConfig.number}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />
    </>
  );
}
