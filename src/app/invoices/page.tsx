import { db } from "@/lib/db";
import styles from "./page.module.css";
import Link from "next/link";
import InvoiceListManager from "./InvoiceListManager";

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

  // Convert dates to ISO strings for client component
  const serializedInvoices = invoices.map((inv: any) => ({
    ...inv,
    createdAt: inv.createdAt.toISOString()
  }));

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

      <InvoiceListManager initialInvoices={serializedInvoices} />
    </div>
  );
}
