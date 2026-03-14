import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import styles from "./page.module.css";
import Link from "next/link";
import InvoiceDetailClient from "./InvoiceDetailClient";

export const dynamic = 'force-dynamic';

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      items: true,
      user: true,
    }
  });

  if (!invoice) return notFound();

  const statusLabels: Record<string, string> = {
    DRAFT: 'Borrador',
    PENDING: 'Pendiente',
    PAID: 'Pagada',
    OVERDUE: 'Vencida',
  };

  return (
    <div className={styles.detailPage}>
      <div className={styles.header}>
        <div>
          <Link href="/invoices" className={styles.backLink}>← Volver a Facturas</Link>
          <h1 className="text-gradient">Factura {invoice.number}</h1>
        </div>
        <div className={styles.actions}>
          <span className={`badge badge-${invoice.status === 'PAID' ? 'success' : invoice.status === 'OVERDUE' ? 'danger' : 'warning'}`}
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            {statusLabels[invoice.status] || invoice.status}
          </span>
          {invoice.status === 'DRAFT' && (
            <Link href={`/invoices/${id}/edit`}>
              <button className="btn-secondary" style={{ padding: '8px 20px' }}>
                ✏️ Editar
              </button>
            </Link>
          )}
          <InvoiceDetailClient invoice={{
            number: invoice.number,
            issueDate: invoice.createdAt.toISOString(),
            clientName: invoice.client.name,
            clientAddress: invoice.client.address || '',
            clientTaxId: invoice.client.taxId || '',
            items: invoice.items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              price: item.price,
            })),
            subtotal: invoice.subtotal,
            tax: invoice.taxAmount,
            total: invoice.total,
            companyName: invoice.user?.companyName || '',
            companyAddress: invoice.user?.companyAddress || '',
            companyTaxId: invoice.user?.companyTaxId || '',
          }} />
        </div>
      </div>

      <div className={styles.grid}>
        {/* Invoice Info */}
        <div className={`glass-panel ${styles.card}`}>
          <h3>Datos de la Factura</h3>
          <div className={styles.infoGrid}>
            <div>
              <span className={styles.label}>Nº Factura</span>
              <span className={styles.value}>{invoice.number}</span>
            </div>
            <div>
              <span className={styles.label}>Fecha Emisión</span>
              <span className={styles.value}>{new Date(invoice.createdAt).toLocaleDateString('es-ES')}</span>
            </div>
            <div>
              <span className={styles.label}>Total</span>
              <span className={styles.value} style={{ fontSize: '24px', fontWeight: 700 }}>
                {invoice.total.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className={`glass-panel ${styles.card}`}>
          <h3>Cliente</h3>
          <div className={styles.infoGrid}>
            <div>
              <span className={styles.label}>Nombre / Razón Social</span>
              <span className={styles.value}>{invoice.client.name}</span>
            </div>
            {invoice.client.taxId && (
              <div>
                <span className={styles.label}>DNI / NIE / CIF</span>
                <span className={styles.value}>{invoice.client.taxId}</span>
              </div>
            )}
            {invoice.client.email && (
              <div>
                <span className={styles.label}>Email</span>
                <span className={styles.value}>{invoice.client.email}</span>
              </div>
            )}
            {invoice.client.address && (
              <div>
                <span className={styles.label}>Dirección</span>
                <span className={styles.value}>{invoice.client.address}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className={`glass-panel ${styles.card}`}>
        <h3>Conceptos</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Descripción</th>
              <th style={{ textAlign: 'right' }}>Cant.</th>
              <th style={{ textAlign: 'right' }}>Precio</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>{item.price.toFixed(2)} €</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{(item.quantity * item.price).toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <span>Subtotal</span>
            <span>{invoice.subtotal.toFixed(2)} €</span>
          </div>
          <div className={styles.totalRow}>
            <span>IVA (21%)</span>
            <span>{invoice.taxAmount.toFixed(2)} €</span>
          </div>
          <div className={`${styles.totalRow} ${styles.grandTotal}`}>
            <span>Total</span>
            <span className="text-gradient">{invoice.total.toFixed(2)} €</span>
          </div>
        </div>
      </div>
    </div>
  );
}
