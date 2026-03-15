"use client";

import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import InvoiceStatusToggle from './InvoiceStatusToggle';
import ConfirmationModal from '@/components/ConfirmationModal';

type Invoice = {
  id: string;
  number: string;
  total: number;
  status: string;
  createdAt: string | Date;
  client: {
    name: string;
  };
};

export default function InvoiceListManager({ initialInvoices }: { initialInvoices: Invoice[] }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
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

  return (
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
          {invoices.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                No hay facturas todavía. ¡Crea tu primera factura!
              </td>
            </tr>
          ) : invoices.map((inv) => (
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
                  {new Date(inv.createdAt).toLocaleDateString('es-ES')}
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

      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        title="Eliminar Factura"
        message={`¿Estás seguro de que deseas eliminar la factura "${modalConfig.number}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />
    </div>
  );
}
