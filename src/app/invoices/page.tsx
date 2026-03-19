import { db } from "@/lib/db";
import styles from "./page.module.css";
import Link from "next/link";
import InvoiceListManager from "./InvoiceListManager";

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const invoices = await (db.invoice as any).findMany({
    include: {
      client: true,
      project: true,
      certifications: true,
      estimate: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const projects = await (db as any).project.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  // Convert dates to ISO strings for client component
  const serializedInvoices = invoices.map((inv: any) => ({
    ...inv,
    createdAt: inv.createdAt.toISOString(),
    issueDate: inv.issueDate ? inv.issueDate.toISOString() : inv.createdAt.toISOString()
  }));

  return (
    <div className={styles.invoicesPage}>
      <div className={styles.header}>
        <div>
          <h1 className="text-gradient">Facturas <span style={{ fontSize: '12px', opacity: 0.5 }}>v1.1</span></h1>
          <p className={styles.subtitle}>Gestiona todas tus facturas emitidas.</p>
        </div>
        <Link href="/invoices/new">
          <button className="btn-primary">+ Nueva Factura</button>
        </Link>
      </div>

      <InvoiceListManager initialInvoices={serializedInvoices} allProjects={projects as any[]} />
    </div>
  );
}
