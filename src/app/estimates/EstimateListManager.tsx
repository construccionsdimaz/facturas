"use client";

import { useState } from 'react';
import Link from 'next/link';
import styles from '../invoices/page.module.css';
import ConfirmationModal from '@/components/ConfirmationModal';

type Estimate = {
  id: string;
  number: string;
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
          {estimates.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                No hay presupuestos todavía. ¡Crea tu primer presupuesto!
              </td>
            </tr>
          ) : estimates.map((est) => (
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

      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        title="Eliminar Presupuesto"
        message={`¿Estás seguro de que deseas eliminar el presupuesto "${modalConfig.number}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />
    </div>
  );
}
