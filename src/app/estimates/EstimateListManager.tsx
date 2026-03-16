"use client";

import { useState } from 'react';
import Link from 'next/link';
import styles from '../invoices/page.module.css';
import ConfirmationModal from '@/components/ConfirmationModal';

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
};

export default function EstimateListManager({ initialEstimates }: { initialEstimates: Estimate[] }) {
  const [estimates, setEstimates] = useState(initialEstimates);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterQuarter, setFilterQuarter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
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
    if (startDate || endDate) {
      if (startDate && date < new Date(startDate)) return false;
      if (endDate && date > new Date(endDate)) return false;
      return true;
    }
    
    // Fallback filter: Year/Quarter
    const yearMatch = filterYear === 'all' || date.getFullYear().toString() === filterYear;
    const quarterMatch = filterQuarter === 'all' || (Math.floor(date.getMonth() / 3) + 1).toString() === filterQuarter;
    return yearMatch && quarterMatch;
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
            <select 
              className={styles.selectModern} 
              value={filterYear}
              onChange={(e) => {
                setFilterYear(e.target.value);
                setStartDate('');
                setEndDate('');
              }}
            >
              <option value="all">Todos los años</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Filtrar por Trimestre</label>
            <select 
              className={styles.selectModern} 
              value={filterQuarter}
              onChange={(e) => {
                setFilterQuarter(e.target.value);
                setStartDate('');
                setEndDate('');
              }}
            >
              <option value="all">Todos los trimestres</option>
              {[1, 2, 3, 4].filter(q => {
                if (filterYear === 'all') return true;
                const now = new Date();
                const currentYear = now.getFullYear();
                const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
                
                if (parseInt(filterYear) < currentYear) return true;
                if (parseInt(filterYear) === currentYear) return q <= currentQuarter;
                return true;
              }).map(q => (
                <option key={q} value={q.toString()}>
                  {q}º Trimestre (T{q})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Desde</label>
            <input 
              type="date" 
              className={styles.inputModern} 
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setFilterYear('all');
                setFilterQuarter('all');
              }}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Hasta</label>
            <input 
              type="date" 
              className={styles.inputModern} 
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setFilterYear('all');
                setFilterQuarter('all');
              }}
            />
          </div>
          {(startDate || endDate || filterYear !== 'all' || filterQuarter !== 'all') && (
            <div className={styles.filterGroup}>
              <label>&nbsp;</label>
              <button 
                className="btn-secondary" 
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => {
                  setFilterYear('all');
                  setFilterQuarter('all');
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Limpiar
              </button>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className={styles.statsGrid}>
          <div className={`glass-panel ${styles.statCard}`}>
            <span className={styles.statLabel}>Subtotal Presupuestado</span>
            <span className={styles.statValue}>{totals.subtotal.toFixed(2)} €</span>
          </div>
          <div className={`glass-panel ${styles.statCard}`}>
            <span className={styles.statLabel}>IVA Estimado (21%)</span>
            <span className={styles.statValue}>{totals.taxAmount.toFixed(2)} €</span>
          </div>
          <div className={`glass-panel ${styles.statCard}`}>
            <span className={styles.statLabel}>Total Presupuestado</span>
            <span className={`${styles.statValue} ${styles.total}`}>{totals.total.toFixed(2)} €</span>
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
