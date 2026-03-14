import { db } from "@/lib/db";
import styles from "./page.module.css";
import Link from "next/link";
import InvoiceStatusToggle from "./InvoiceStatusToggle";

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const invoices = await db.invoice.findMany({
    include: {
      client: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return (
    <div className={styles.invoicesPage}>
      <div className={styles.header}>
        <div>
          <h1 className="text-gradient">Facturas</h1>
          <p className={styles.subtitle}>Gestiona todas tus facturas emitidas.</p>
        </div>
        <Link href="/invoices/new">
          <button className="btn-primary">+ Nueva Factura</button>
        </Link>
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
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
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
                  <InvoiceStatusToggle invoiceId={inv.id} currentStatus={inv.status} />
                </td>
                <td className={styles.cellDate}>
                  <Link href={`/invoices/${inv.id}`} className={styles.rowLink}>
                    {new Date(inv.createdAt).toLocaleDateString('es-ES')}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
