import { db } from "@/lib/db";
import styles from "./page.module.css";
import Link from "next/link";
import { RevenueChart, StatusDistributionChart } from "@/components/DashboardCharts";
import { formatCurrency } from "@/lib/format";

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

  const projects = await db.project.findMany({
    include: {
      client: true,
      budgetLines: true,
      expenses: true,
      certifications: true
    }
  });

  const activeProjects = projects.filter(p => p.status === 'ACTIVE');

  // Construction KPIs
  const pendingToCertify = projects.reduce((sum, p) => 
    sum + p.budgetLines.reduce((lSum, l) => lSum + Math.max(0, l.estimatedAmount - l.certifiedAmount), 0)
  , 0);

  const pendingToInvoice = projects.reduce((sum, p) => 
    sum + p.certifications
      .filter(c => !c.invoiceId && c.status === 'ISSUED')
      .reduce((cSum, c) => cSum + c.netAmount, 0)
  , 0);

  const pendingToCollect = allInvoices
    .filter(inv => inv.status !== 'PAID')
    .reduce((sum, inv) => sum + inv.total, 0);

  // Calculate monthly revenue for the last 7 months
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const now = new Date();
  
  const last7Months: { date: Date, name: string, total: number, month: number, year: number }[] = [];
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

  // Growth calculations for Revenue Chart
  const currentMonthRevenue = last7Months[last7Months.length - 1].total;
  const prevMonthRevenue = last7Months[last7Months.length - 2].total;
  const growth = prevMonthRevenue > 0 
    ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 
    : (currentMonthRevenue > 0 ? 100 : 0);

  const growthLabel = prevMonthRevenue === 0 && currentMonthRevenue > 0 
    ? 'Nuevo' 
    : `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% vs mes ant.`;

  // Status distribution for "Cartera de Producción"
  const statusDistribution = [
    { name: 'Pendiente Certificar', value: pendingToCertify, color: '#3b82f6' },
    { name: 'Certificado s/Facturar', value: pendingToInvoice, color: '#f59e0b' },
    { name: 'Facturado s/Cobrar', value: pendingToCollect, color: '#ef4444' }
  ];

  const recentProjects = activeProjects.slice(0, 5);

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className="text-gradient">Panel de Control de Obras</h1>
          <p className={styles.subtitle}>Resumen de producción y estado financiero de tus proyectos.</p>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Producción s/Certificar</span>
            <span className={styles.trendUp}>Cartera</span>
          </div>
          <div className={styles.metricValue}>{formatCurrency(pendingToCertify)}</div>
          <div style={{ marginTop: 'auto', fontSize: '13px', color: 'var(--text-muted)' }}>
            Trabajo realizado pendiente de aprobación por cliente.
          </div>
        </div>

        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Certificado s/Facturar</span>
            <span className={styles.trendUp}>Aprobado</span>
          </div>
          <div className={styles.metricValue}>{formatCurrency(pendingToInvoice)}</div>
          <div style={{ marginTop: 'auto', fontSize: '13px', color: 'var(--text-muted)' }}>
            Certificaciones emitidas que no tienen factura vinculada.
          </div>
        </div>

        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Facturado s/Cobrar</span>
            <span className={styles.trendDown}>Deuda</span>
          </div>
          <div className={styles.metricValue} style={{ color: '#ef4444' }}>{formatCurrency(pendingToCollect)}</div>
          <div style={{ marginTop: 'auto', fontSize: '13px', color: 'var(--text-muted)' }}>
            Total de facturas emitidas pendientes de cobro real.
          </div>
        </div>

        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Obras Activas</span>
            <span className={styles.trendUp}>Total</span>
          </div>
          <div className={styles.metricValue}>{activeProjects.length}</div>
          <div style={{ marginTop: 'auto' }}>
            <Link href="/projects">
              <button className={`btn-primary ${styles.quickAdd}`} style={{ width: '100%', fontSize: '13px' }}>Ver Panel de Obras</button>
            </Link>
          </div>
        </div>
      </div>

      <div className={`glass-panel ${styles.metricCard}`} style={{ marginBottom: '24px' }}>
        <div className={styles.metricHeader}>
          <span className={styles.metricTitle}>Histórico de Facturación (Últimos 7 Meses)</span>
          <span className={growth >= 0 ? styles.trendUp : styles.trendDown}>
            {growthLabel}
          </span>
        </div>
        <div style={{ height: '220px', width: '100%', marginTop: '20px' }}>
          <RevenueChart monthlyData={monthlyData} />
        </div>
      </div>

      <div className={styles.bottomSection} style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        <div className={`glass-panel ${styles.recentInvoices}`}>
          <div className={styles.sectionHeader}>
            <h3>Obras en Curso</h3>
            <Link href="/projects">
              <button className={styles.textBtn}>Ver Centro de Costes →</button>
            </Link>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Obra / Cliente</th>
                  <th style={{ textAlign: 'right' }}>Presupuesto</th>
                  <th style={{ textAlign: 'right' }}>Gasto Real</th>
                  <th style={{ textAlign: 'right' }}>% Certif.</th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No hay obras activas.
                    </td>
                  </tr>
                ) : recentProjects.map((proj) => {
                  const totalBudgeted = proj.budgetLines.reduce((s: number, l: any) => s + l.estimatedAmount, 0);
                  const totalExpenses = proj.expenses.reduce((s: number, e: any) => s + e.amount, 0);
                  const totalCertified = proj.budgetLines.reduce((s: number, l: any) => s + l.certifiedAmount, 0);
                  const certifiedPercent = totalBudgeted > 0 ? (totalCertified / totalBudgeted) * 100 : 0;
                  const expensePercent = totalBudgeted > 0 ? (totalExpenses / totalBudgeted) * 100 : 0;

                  return (
                    <tr key={proj.id}>
                      <td className={styles.cellClient}>
                        <div>
                          <strong>{proj.name}</strong>
                          <div className={styles.muted} style={{ fontSize: '12px' }}>{proj.client.name}</div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(totalBudgeted)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ color: expensePercent > 90 ? '#ef4444' : expensePercent > certifiedPercent ? '#f59e0b' : '#3b82f6' }}>
                          {formatCurrency(totalExpenses)}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                         <span style={{ fontWeight: 700 }}>{certifiedPercent.toFixed(1)}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`glass-panel ${styles.metricCard}`} style={{ height: 'fit-content' }}>
          <div className={styles.metricHeader}>
             <span className={styles.metricTitle}>Cartera de Producción</span>
          </div>
          <div style={{ height: '200px' }}>
             <StatusDistributionChart data={statusDistribution} />
          </div>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
             {statusDistribution.map(item => (
               <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                 <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }}></div>
                    {item.name}
                 </span>
                 <span style={{ fontWeight: 600 }}>{formatCurrency(item.value)}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
