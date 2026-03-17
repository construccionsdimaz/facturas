import { db } from "@/lib/db";
import styles from "../invoices/page.module.css";
import Link from "next/link";
import EstimateListManager from "@/app/estimates/EstimateListManager";

export const dynamic = 'force-dynamic';

export default async function EstimatesPage() {
  const estimates = await (db.estimate as any).findMany({
    include: {
      client: true,
      project: true
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
  const serializedEstimates = estimates.map((est: any) => ({
    ...est,
    createdAt: est.createdAt.toISOString(),
    issueDate: est.issueDate ? est.issueDate.toISOString() : est.createdAt.toISOString(),
    validUntil: est.validUntil ? est.validUntil.toISOString() : null
  }));

  return (
    <div className={styles.invoicesPage}>
      <div className={styles.header}>
        <div>
          <h1 className="text-gradient">Presupuestos</h1>
          <p className={styles.subtitle}>Gestiona tus presupuestos y propuestas comerciales.</p>
        </div>
        <Link href="/estimates/new">
          <button className="btn-primary">+ Nuevo Presupuesto</button>
        </Link>
      </div>

      <EstimateListManager initialEstimates={serializedEstimates} allProjects={projects as any[]} />
    </div>
  );
}
