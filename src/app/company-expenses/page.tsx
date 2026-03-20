import { db } from "@/lib/db";
import styles from "../projects/page.module.css";
import CompanyExpensesClient from "./CompanyExpensesClient";

export const dynamic = 'force-dynamic';

export default async function CompanyExpensesPage() {
  const expenses = await (db as any).companyExpense.findMany({
    include: {
      imputations: {
        include: {
          project: true
        }
      }
    },
    orderBy: {
      date: 'desc'
    }
  });

  const projects = await db.project.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { name: 'asc' }
  });

  return (
    <div className={styles.projectsPage}>
      <div className={styles.header}>
        <div>
          <h1 className="text-gradient">Gastos de Estructura</h1>
          <p className={styles.subtitle}>Gestión de gastos generales de empresa e imputación a obras.</p>
        </div>
      </div>

      <CompanyExpensesClient initialExpenses={expenses} activeProjects={projects} />
    </div>
  );
}
