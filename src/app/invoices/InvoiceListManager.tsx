"use client";

import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import InvoiceStatusToggle from './InvoiceStatusToggle';
import ConfirmationModal from '@/components/ConfirmationModal';

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
              <option value="1">1er Trimestre (T1)</option>
              <option value="2">2do Trimestre (T2)</option>
              <option value="3">3er Trimestre (T3)</option>
              <option value="4">4to Trimestre (T4)</option>
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
