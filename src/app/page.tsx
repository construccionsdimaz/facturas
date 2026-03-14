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
          <h1 className="text-gradient">Financial Overview</h1>
          <p className={styles.subtitle}>Here is what's happening today.</p>
        </div>
        <div className={styles.dateSelector}>
          <select className={`input-modern ${styles.select}`}>
            <option>Last 30 Days</option>
            <option>This Quarter</option>
            <option>This Year</option>
          </select>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Monthly Recurring Revenue</span>
            <span className={styles.trendUp}>+12.5%</span>
          </div>
          <div className={styles.metricValue}>${mrr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
            <span className={styles.metricTitle}>Pending Invoices</span>
            <span className={styles.trendDown}>Needs Action</span>
          </div>
          <div className={styles.metricValue}>
            {pendingInvoicesCount} <span className={styles.muted}>/ ${pendingInvoicesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className={styles.metricChartPlaceholder}>
             <div className={styles.progressTrack}>
               <div className={styles.progressFill} style={{ width: allInvoices.length > 0 ? `${((allInvoices.length - pendingInvoicesCount) / allInvoices.length) * 100}%` : '0%' }}></div>
             </div>
             <p className={styles.progressLabel}>
               {allInvoices.length > 0 ? Math.round(((allInvoices.length - pendingInvoicesCount) / allInvoices.length) * 100) : 0}% collected globally
             </p>
          </div>
        </div>

        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Total Clients</span>
            {clientsCount > 0 && <span className={styles.trendUp}>Active</span>}
          </div>
          <div className={styles.metricValue}>{clientsCount}</div>
          <Link href="/clients">
            <button className={`btn-primary ${styles.quickAdd}`}>Manage Clients</button>
          </Link>
        </div>
      </div>

      <div className={styles.bottomSection}>
        <div className={`glass-panel ${styles.recentInvoices}`}>
          <div className={styles.sectionHeader}>
            <h3>Recent Invoices</h3>
            <button className={styles.textBtn}>View All →</button>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No invoices created yet.
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
                    <td className={styles.cellAmount}>${inv.total.toFixed(2)}</td>
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
