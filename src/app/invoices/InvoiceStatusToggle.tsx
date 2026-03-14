"use client";

import { useState } from 'react';

const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: 'DRAFT', label: 'Borrador', color: 'warning' },
  { value: 'PENDING', label: 'Pendiente', color: 'warning' },
  { value: 'PAID', label: 'Pagada', color: 'success' },
  { value: 'OVERDUE', label: 'Vencida', color: 'danger' },
];

export default function InvoiceStatusToggle({ invoiceId, currentStatus }: { invoiceId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setStatus(newStatus);
      }
    } catch (err) {
      console.error('Error updating status', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const current = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[1];

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isUpdating}
      className={`badge badge-${current.color}`}
      style={{
        cursor: 'pointer',
        border: 'none',
        outline: 'none',
        appearance: 'none',
        WebkitAppearance: 'none',
        padding: '4px 12px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        textAlign: 'center',
        background: status === 'PAID' ? 'rgba(16, 185, 129, 0.15)' :
                    status === 'OVERDUE' ? 'rgba(239, 68, 68, 0.15)' :
                    'rgba(245, 158, 11, 0.15)',
        color: status === 'PAID' ? '#10b981' :
               status === 'OVERDUE' ? '#ef4444' :
               '#f59e0b',
      }}
    >
      {STATUS_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value} style={{ background: '#1a1a2e', color: '#fff' }}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
