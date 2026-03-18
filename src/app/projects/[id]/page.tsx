import { db } from "@/lib/db";
import styles from "../page.module.css";
import Link from "next/link";
import ProjectDetailClient from "@/app/projects/[id]/ProjectDetailClient";


export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await (db as any).project.findUnique({
    where: { id },
    include: {
      client: true,
      invoices: {
        orderBy: { createdAt: 'desc' }
      },
      estimates: {
        orderBy: { createdAt: 'desc' }
      },
      budgetLines: {
        orderBy: { createdAt: 'asc' }
      },
      expenses: {
        orderBy: { date: 'desc' }
      },
      certifications: {
        include: {
          lines: true
        },
        orderBy: { date: 'desc' }
      }
    }
  });

  const clients = await db.client.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className={styles.projectsPage}>
       <div className={styles.header}>
        <div>
          <h1 className="text-gradient">{project.name}</h1>
          <p className={styles.subtitle}>Detalles de la obra y documentos asociados.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/projects">
              <button className="btn-secondary">Volver</button>
            </Link>
        </div>
      </div>

      <ProjectDetailClient project={project as any} clients={clients} />
    </div>
  );
}
