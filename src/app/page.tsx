import { db } from "@/lib/db";
import styles from "./page.module.css";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch real data from the database
  const clientsCount = await db.client.count();
  
  const allInvoices = await db.invoice.findMany({
    include: {
      client: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const recentInvoices = allInvoices.slice(0, 5);
  const totalRevenue = allInvoices.reduce((sum: number, inv: any) => sum + inv.total, 0);
  const pendingInvoicesCount = allInvoices.filter((inv: any) => inv.status !== 'PAID').length;
  const pendingInvoicesTotal = allInvoices
    .filter((inv: any) => inv.status !== 'PAID')
    .reduce((sum: number, inv: any) => sum + inv.total, 0);

  // Simplified MRR Mock calculation based on total revenue for demo
  const mrr = totalRevenue > 0 ? totalRevenue / 12 : 0;
  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className="text-gradient">Resumen Financiero</h1>
          <p className={styles.subtitle}>Esto es lo que está pasando hoy.</p>
        </div>
        <div className={styles.dateSelector}>
          <select className={`input-modern ${styles.select}`}>
            <option>Últimos 30 Días</option>
            <option>Este Trimestre</option>
            <option>Este Año</option>
          </select>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Ingresos Recurrentes Mensuales</span>
            <span className={styles.trendUp}>+12.5%</span>
          </div>
          <div className={styles.metricValue}>{mrr.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
          <div className={styles.metricChartPlaceholder}>
            <div className={styles.barContainer}>
              {[40, 60, 45, 80, 50, 90, 75].map((height, i) => (
                <div key={i} className={styles.bar} style={{ height: `${height}%` }}></div>
              ))}
            </div>
          </div>
        </div>

        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Facturas Pendientes</span>
            <span className={styles.trendDown}>Requiere Acción</span>
          </div>
          <div className={styles.metricValue}>
            {pendingInvoicesCount} <span className={styles.muted}>/ {pendingInvoicesTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
          </div>
          <div className={styles.metricChartPlaceholder}>
             <div className={styles.progressTrack}>
               <div className={styles.progressFill} style={{ width: allInvoices.length > 0 ? `${((allInvoices.length - pendingInvoicesCount) / allInvoices.length) * 100}%` : '0%' }}></div>
             </div>
             <p className={styles.progressLabel}>
               {allInvoices.length > 0 ? Math.round(((allInvoices.length - pendingInvoicesCount) / allInvoices.length) * 100) : 0}% cobrado globalmente
             </p>
          </div>
        </div>

        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Total Clientes</span>
            {clientsCount > 0 && <span className={styles.trendUp}>Activos</span>}
          </div>
          <div className={styles.metricValue}>{clientsCount}</div>
          <Link href="/clients">
            <button className={`btn-primary ${styles.quickAdd}`}>Gestionar Clientes</button>
          </Link>
        </div>
      </div>

      <div className={styles.bottomSection}>
        <div className={`glass-panel ${styles.recentInvoices}`}>
          <div className={styles.sectionHeader}>
            <h3>Facturas Recientes</h3>
            <button className={styles.textBtn}>Ver Todas →</button>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Importe</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No hay facturas creadas todavía.
                    </td>
                  </tr>
                ) : recentInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className={styles.cellClient}>
                      <div className={styles.clientAvatar}>
                        {inv.client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div>{inv.client.name}</div>
                        <div className={styles.muted} style={{ fontSize: '12px' }}>{inv.number}</div>
                      </div>
                    </td>
                    <td className={styles.cellAmount}>{inv.total.toFixed(2)} €</td>
                    <td>
                      <span className={`badge badge-${inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'danger' : 'warning'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className={styles.cellDate}>{new Date(inv.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
