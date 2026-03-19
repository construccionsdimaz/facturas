"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/format';
import InvoiceStatusToggle from '../InvoiceStatusToggle';

interface InvoiceData {
  id: string;
  number: string;
  issueDate: string;
  dueDate: string | null;
  status: string;
  isSent: boolean;
  paidAmount: number;
  clientName: string;
  clientAddress: string;
  clientTaxId: string;
  items: { description: string; quantity: number; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyZip: string;
  companyProvince: string;
  companyTaxId: string;
  companyLogo: string;
  logoZoom?: number;
  logoX?: number;
  logoY?: number;
  paymentMethod: string;
  bankAccount: string;
  dataProtection: string;
}

export default function InvoiceDetailClient({ invoice }: { invoice: InvoiceData }) {
  const router = useRouter();
  const [isSent, setIsSent] = useState(invoice.isSent);
  const [paidAmount, setPaidAmount] = useState(invoice.paidAmount);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newPayment, setNewPayment] = useState(0);

  const handlePrint = () => {
    window.open(`/invoices/${invoice.id}/print`, '_blank');
  };

  const handleToggleSent = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSent: !isSent })
      });
      if (res.ok) setIsSent(!isSent);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddPayment = async () => {
    if (newPayment <= 0) return;
    setIsUpdating(true);
    const updatedPaid = paidAmount + newPayment;
    
    // Automatically determine if it's fully paid or partial
    let newStatus = invoice.status;
    if (updatedPaid >= invoice.total) {
      newStatus = 'PAID';
    } else if (updatedPaid > 0) {
      newStatus = 'PARTIAL';
    }

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paidAmount: updatedPaid,
          status: newStatus
        })
      });
      if (res.ok) {
        setPaidAmount(updatedPaid);
        setNewPayment(0);
        router.refresh();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const remaining = Math.max(0, invoice.total - paidAmount);
  const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && remaining > 0;

  return (
    <div className="invoice-detail-container">
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn-primary"
            onClick={handlePrint}
            style={{ padding: '8px 24px' }}
          >
            📄 Imprimir / Descargar PDF
          </button>
          
          <button
            className={`btn-${isSent ? 'success' : 'secondary'}`}
            onClick={handleToggleSent}
            disabled={isUpdating}
            style={{ padding: '8px 24px' }}
          >
            {isSent ? '✅ Enviada' : '✉️ Marcar como Enviada'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Estado Base:</span>
          <InvoiceStatusToggle invoiceId={invoice.id} currentStatus={invoice.status} />
        </div>
      </div>

      <div className="grid no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Gestión de Cobro</h3>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Factura:</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(invoice.total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Cobrado:</span>
              <span style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(paidAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontWeight: 600 }}>Pendiente:</span>
              <span style={{ fontWeight: 700, color: remaining > 0 ? '#ef4444' : '#10b981' }}>{formatCurrency(remaining)}</span>
            </div>
          </div>

          {remaining > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="number" 
                className="input-modern" 
                placeholder="Importe pago..."
                value={newPayment || ''}
                onChange={e => setNewPayment(parseFloat(e.target.value) || 0)}
                style={{ flex: 1 }}
              />
              <button 
                className="btn-success" 
                onClick={handleAddPayment}
                disabled={isUpdating || newPayment <= 0}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Añadir Pago
              </button>
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            {isOverdue ? (
              <div style={{ color: '#ef4444' }}>
                <span style={{ fontSize: '32px', display: 'block' }}>⚠️ VENCIDA</span>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  Fecha vencimiento: {new Date(invoice.dueDate!).toLocaleDateString('es-ES')}
                </p>
              </div>
            ) : (
              <div style={{ color: remaining === 0 ? '#10b981' : '#3b82f6' }}>
                <span style={{ fontSize: '32px', display: 'block' }}>
                  {remaining === 0 ? '✔️ COBRADA' : '📅 AL DÍA'}
                </span>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  {invoice.dueDate ? `Vence el: ${new Date(invoice.dueDate).toLocaleDateString('es-ES')}` : 'Sin fecha de vencimiento'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '20px' }} className="no-print">
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Usa los controles superiores para gestionar el ciclo de vida de la factura.
        </p>
      </div>
    </div>
  );
}
