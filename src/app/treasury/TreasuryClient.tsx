"use client";

import { useState, useEffect } from 'react';
import styles from '../invoices/page.module.css';
import { formatCurrency } from '@/lib/format';

interface PendingExpense {
  id: string;
  source: 'PROJECT' | 'COMPANY';
  description: string;
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  date: string;
  dueDate: string | null;
  category: string;
  projectName: string;
  projectId: string | null;
  supplierName: string;
  status: string;
}

export default function TreasuryClient() {
  const [data, setData] = useState<PendingExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/treasury');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterPayment = async (expense: PendingExpense, amountToAdd: number) => {
    const totalNewPaid = Math.round((expense.paidAmount + amountToAdd) * 100) / 100;
    if (totalNewPaid > expense.amount) {
      alert('El importe pagado no puede superar el total del gasto.');
      return;
    }

    setUpdatingId(expense.id);
    try {
      const res = await fetch(`/api/treasury/${expense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidAmount: totalNewPaid,
          source: expense.source
        })
      });

      if (res.ok) {
        // Refresh or update locally
        await fetchData();
        setPaymentAmount('');
      } else {
        alert('Error al registrar el pago');
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredData = data.filter(e => 
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.projectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPending = data.reduce((sum, e) => sum + e.pendingAmount, 0);
  const totalAmount = data.reduce((sum, e) => sum + e.amount, 0);

  if (isLoading && data.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loader">Cargando tesorería...</div>
      </div>
    );
  }

  return (
    <div className={styles.invoicesPage}>
      <div className={styles.controlsSection}>
        <div className={styles.statsGrid}>
          <div className={`glass-panel ${styles.statCard}`}>
            <span className={styles.statLabel}>Total Facturado (Pendiente)</span>
            <span className={styles.statValue}>{formatCurrency(totalAmount)}</span>
          </div>
          <div className={`glass-panel ${styles.statCard}`} style={{ borderLeft: '4px solid #ff4444' }}>
            <span className={styles.statLabel}>Saldo Pendiente de Pago</span>
            <span className={styles.statValue} style={{ color: '#ff4444' }}>{formatCurrency(totalPending)}</span>
          </div>
          <div className={`glass-panel ${styles.statCard}`}>
            <span className={styles.statLabel}>Gastos con Deuda</span>
            <span className={styles.statValue}>{data.length}</span>
          </div>
        </div>

        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <label>Buscar</label>
            <input 
              type="text" 
              className={styles.inputModern} 
              placeholder="Proveedor, obra, concepto..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={`glass-panel ${styles.tableContainer}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proveedor / Concepto</th>
              <th>Origen / Obra</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'right' }}>Pagado</th>
              <th style={{ textAlign: 'right' }}>Pendiente</th>
              <th style={{ textAlign: 'center' }}>Vencimiento</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                  {searchTerm ? 'No se han encontrado resultados.' : '¡Enhorabuena! No hay pagos pendientes en este momento.'}
                </td>
              </tr>
            ) : filteredData.map((e) => {
              const isOverdue = e.dueDate && new Date(e.dueDate) < new Date();
              
              return (
                <tr key={e.id} className={styles.tableRow}>
                  <td className={styles.cellDate}>{new Date(e.date).toLocaleDateString()}</td>
                  <td>
                    <div style={{ fontWeight: '600' }}>{e.supplierName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{e.description}</div>
                  </td>
                  <td>
                    <span className={`badge badge-${e.source === 'PROJECT' ? 'info' : 'warning'}`} style={{ fontSize: '10px', marginBottom: '4px' }}>
                      {e.source === 'PROJECT' ? 'OBRA' : 'EMPRESA'}
                    </span>
                    <div style={{ fontSize: '13px' }}>{e.projectName}</div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: '500' }}>{formatCurrency(e.amount)}</td>
                  <td style={{ textAlign: 'right', color: '#10b981' }}>{formatCurrency(e.paidAmount)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '700', color: '#ff4444' }}>{formatCurrency(e.pendingAmount)}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {e.dueDate ? (
                      <span style={{ color: isOverdue ? '#ff4444' : 'inherit', fontWeight: isOverdue ? '700' : 'normal' }}>
                        {new Date(e.dueDate).toLocaleDateString()}
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <input 
                        type="number" 
                        step="0.01" 
                        className={styles.inputModern} 
                        style={{ width: '80px', padding: '4px 8px', fontSize: '13px' }}
                        placeholder="Abonar"
                        onChange={(ev) => setPaymentAmount(ev.target.value)}
                        onBlur={(ev) => {
                          const val = parseFloat(ev.target.value);
                          if (!isNaN(val) && val > 0) {
                            handleRegisterPayment(e, val);
                            ev.target.value = '';
                          }
                        }}
                      />
                      <button 
                        className="btn-primary" 
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => handleRegisterPayment(e, e.pendingAmount)}
                        disabled={updatingId === e.id}
                      >
                        Pagar Todo
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
