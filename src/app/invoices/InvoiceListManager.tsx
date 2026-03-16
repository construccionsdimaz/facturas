"use client";

import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import InvoiceStatusToggle from './InvoiceStatusToggle';
import ConfirmationModal from '@/components/ConfirmationModal';
import CustomSelect from '@/components/CustomSelect';

type Invoice = {
  id: string;
  number: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  status: string;
  createdAt: string | Date;
  issueDate?: string | Date;
  client: {
    name: string;
  };
};

export default function InvoiceListManager({ initialInvoices }: { initialInvoices: Invoice[] }) {
  const [invoices, setInvoices] = useState(initialInvoices);
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
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete invoice');

      setInvoices(invoices.filter(inv => inv.id !== id));
    } catch (error) {
      console.error(error);
      alert('Error al eliminar la factura.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleApplyFilters = () => {
    setAppliedYear(stagedYear);
    setAppliedQuarter(stagedQuarter);
    setAppliedStartDate(stagedStartDate);
    setAppliedEndDate(stagedEndDate);
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
  };

  // Helper to get year from date
  const getYear = (dateStr: string | Date) => new Date(dateStr).getFullYear().toString();
  
  // Helper to get quarter from date
  const getQuarter = (dateStr: string | Date) => {
    const month = new Date(dateStr).getMonth();
    return Math.floor(month / 3) + 1;
  };

  // Get available years for the dropdown
  const availableYears = Array.from(new Set(initialInvoices.map(inv => getYear(inv.issueDate || inv.createdAt)))).sort().reverse();

  // Filter logic
  const filteredInvoices = invoices.filter(inv => {
    const date = new Date(inv.issueDate || inv.createdAt);
    
    // Primary filter: Manual Date Range
    if (appliedStartDate || appliedEndDate) {
      if (appliedStartDate && date < new Date(appliedStartDate)) return false;
      if (appliedEndDate && date > new Date(appliedEndDate)) return false;
      return true;
    }
    
    // Fallback filter: Year/Quarter
    const yearMatch = appliedYear === 'all' || date.getFullYear().toString() === appliedYear;
    const quarterMatch = appliedQuarter === 'all' || (Math.floor(date.getMonth() / 3) + 1).toString() === appliedQuarter;
    return yearMatch && quarterMatch;
  });

  // Calculate totals for the filtered set
  const totals = filteredInvoices.reduce((acc, inv) => ({
    subtotal: acc.subtotal + (inv.subtotal || 0),
    taxAmount: acc.taxAmount + (inv.taxAmount || 0),
    total: acc.total + inv.total
  }), { subtotal: 0, taxAmount: 0, total: 0 });

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
              {(stagedYear !== 'all' || stagedQuarter !== 'all' || stagedStartDate || stagedEndDate || appliedYear !== 'all' || appliedQuarter !== 'all' || appliedStartDate || appliedEndDate) && (
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
            <span className={styles.statValue}>{totals.subtotal.toFixed(2)} €</span>
          </div>
          <div className={`glass-panel ${styles.statCard}`}>
            <span className={styles.statLabel}>Total IVA (21%)</span>
            <span className={styles.statValue}>{totals.taxAmount.toFixed(2)} €</span>
          </div>
          <div className={`glass-panel ${styles.statCard}`}>
            <span className={styles.statLabel}>Total Facturado</span>
            <span className={`${styles.statValue} ${styles.total}`}>{totals.total.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      <div className={`glass-panel ${styles.tableContainer}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nº Factura</th>
              <th>Cliente</th>
              <th>Importe</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                  {invoices.length === 0 
                    ? "No hay facturas todavía. ¡Crea tu primera factura!" 
                    : "No se han encontrado facturas para el periodo seleccionado."}
                </td>
              </tr>
            ) : filteredInvoices.map((inv) => (
              <tr key={inv.id} className={styles.tableRow}>
                <td className={styles.cellNumber}>
                  <Link href={`/invoices/${inv.id}`} className={styles.rowLink}>
                    <strong>{inv.number}</strong>
                  </Link>
                </td>
                <td className={styles.cellClient}>
                  <Link href={`/invoices/${inv.id}`} className={styles.rowLink}>
                    <div className={styles.clientAvatar}>
                      {inv.client.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{inv.client.name}</span>
                  </Link>
                </td>
                <td className={styles.cellAmount}>
                  <Link href={`/invoices/${inv.id}`} className={styles.rowLink}>
                    {inv.total.toFixed(2)} €
                  </Link>
                </td>
                <td>
                  <InvoiceStatusToggle invoiceId={inv.id} currentStatus={inv.status as any} />
                </td>
                <td className={styles.cellDate}>
                  <Link href={`/invoices/${inv.id}`} className={styles.rowLink}>
                    {new Date(inv.issueDate || inv.createdAt).toLocaleDateString('es-ES')}
                  </Link>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button 
                    className={styles.deleteBtn}
                    onClick={() => handleDeleteClick(inv.id, inv.number)}
                    disabled={isDeleting === inv.id}
                    title="Eliminar factura"
                  >
                    {isDeleting === inv.id ? '...' : '🗑️'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        title="Eliminar Factura"
        message={`¿Estás seguro de que deseas eliminar la factura "${modalConfig.number}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />
    </>
  );
}
