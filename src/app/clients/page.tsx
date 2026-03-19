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
          <h1 className="text-gradient">Gestión de Clientes</h1>
          <p className={styles.subtitle}>Administra tus clientes y sus datos de facturación de forma centralizada.</p>
        </div>
      </div>

      <ClientManager initialClients={clients} />
    </div>
  );
}
