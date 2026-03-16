import { db } from "@/lib/db";
import styles from "../invoices/page.module.css";
import Link from "next/link";
import EstimateListManager from "@/app/estimates/EstimateListManager";

export const dynamic = 'force-dynamic';

export default async function EstimatesPage() {
  const estimates = await db.estimate.findMany({
    include: {
      client: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Convert dates to ISO strings for client component
  const serializedEstimates = estimates.map((est: any) => ({
    ...est,
    createdAt: est.createdAt.toISOString(),
    issueDate: est.issueDate.toISOString(),
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

      <EstimateListManager initialEstimates={serializedEstimates} />
    </div>
  );
}
