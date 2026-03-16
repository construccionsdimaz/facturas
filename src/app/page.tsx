import { db } from "@/lib/db";
import styles from "./page.module.css";
import Link from "next/link";
import { RevenueChart, StatusDistributionChart } from "@/components/DashboardCharts";

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

  // Calculate monthly revenue for the last 7 months
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const now = new Date();
  
  // Create an array of the last 7 months in chronological order
  const last7Months = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last7Months.push({
      date: d,
      name: `${months[d.getMonth()]} ${d.getFullYear() % 100}`,
      total: 0,
      month: d.getMonth(),
      year: d.getFullYear()
    });
  }

  allInvoices.forEach((inv: any) => {
    const invDate = new Date(inv.issueDate || inv.createdAt);
    const m = invDate.getMonth();
    const y = invDate.getFullYear();
    
    const monthData = last7Months.find(d => d.month === m && d.year === y);
    if (monthData) {
      monthData.total += inv.total;
    }
  });

  const monthlyData = last7Months.map(({ name, total }) => ({ name, total }));

  // Calculate MoM growth using the last two items in our chronological array
  const currentMonthData = last7Months[last7Months.length - 1];
  const prevMonthData = last7Months[last7Months.length - 2];
  
  const currentMonthRevenue = currentMonthData.total;
  const prevMonthRevenue = prevMonthData.total;
  const growth = prevMonthRevenue > 0 
    ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 
    : 0;

  const recentInvoices = allInvoices.slice(0, 5);
  const totalRevenue = allInvoices.reduce((sum: number, inv: any) => sum + inv.total, 0);
  const pendingInvoicesCount = allInvoices.filter((inv: any) => inv.status !== 'PAID').length;
  const pendingInvoicesTotal = allInvoices
    .filter((inv: any) => inv.status !== 'PAID')
    .reduce((sum: number, inv: any) => sum + inv.total, 0);

  // Status distribution for the bar chart
  const statusCounts = allInvoices.reduce((acc: any, inv: any) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {});

  const statusDistribution = [
    { name: 'Pagado', value: statusCounts['PAID'] || 0, color: '#10b981' },
    { name: 'Pendiente', value: (statusCounts['PENDING'] || 0) + (statusCounts['SENT'] || 0), color: '#f59e0b' },
    { name: 'Vencido', value: statusCounts['OVERDUE'] || 0, color: '#ef4444' }
  ];

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className="text-gradient">Resumen Financiero</h1>
          <p className={styles.subtitle}>Esto es lo que está pasando hoy.</p>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Ingresos Últimos 7 Meses</span>
            <span className={growth >= 0 ? styles.trendUp : styles.trendDown}>
              {growth >= 0 ? '+' : ''}{growth.toFixed(1)}% MoM
            </span>
          </div>
          <div className={styles.metricValue}>{currentMonthRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
          <div className={styles.metricChartPlaceholder}>
            <RevenueChart monthlyData={monthlyData} />
          </div>
        </div>

        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Estado de Facturas</span>
            <span className={styles.trendUp}>Distribución</span>
          </div>
          <div className={styles.metricValue}>
            {pendingInvoicesCount} <span className={styles.muted}>pendientes</span>
          </div>
          <div className={styles.metricChartPlaceholder}>
             <StatusDistributionChart data={statusDistribution} />
             <p className={styles.progressLabel} style={{ marginTop: '8px' }}>
                Total: {pendingInvoicesTotal.toLocaleString('es-ES')} € por cobrar
             </p>
          </div>
        </div>

        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Total Clientes</span>
            {clientsCount > 0 && <span className={styles.trendUp}>Activos</span>}
          </div>
          <div className={styles.metricValue}>{clientsCount}</div>
          <div style={{ marginTop: 'auto' }}>
            <Link href="/clients">
              <button className={`btn-primary ${styles.quickAdd}`} style={{ width: '100%' }}>Gestionar Clientes</button>
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.bottomSection}>
        <div className={`glass-panel ${styles.recentInvoices}`}>
          <div className={styles.sectionHeader}>
            <h3>Facturas Recientes</h3>
            <Link href="/invoices">
              <button className={styles.textBtn}>Ver Todas →</button>
            </Link>
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
                        {inv.status === 'PAID' ? 'PAGADA' : inv.status === 'SENT' ? 'ENVIADA' : inv.status === 'OVERDUE' ? 'VENCIDA' : 'BORRADOR'}
                      </span>
                    </td>
                    <td className={styles.cellDate}>{new Date(inv.issueDate || inv.createdAt).toLocaleDateString()}</td>
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
