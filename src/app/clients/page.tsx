import { db } from '@/lib/db';
import styles from './page.module.css';
import ClientManager from './ClientManager';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const clients = await db.client.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      _count: {
        select: { invoices: true }
      }
    }
  });

  return (
    <div className={styles.clientsPage}>
      <div className={styles.header}>
        <div>
          <h1 className="text-gradient">Clients Management</h1>
          <p className={styles.subtitle}>Manage your customer relationships and billing details.</p>
        </div>
      </div>

      <ClientManager initialClients={clients} />
    </div>
  );
}
