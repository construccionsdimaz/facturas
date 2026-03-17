import { db } from "@/lib/db";
import styles from "../page.module.css";
import Link from "next/link";
import ProjectDetailClient from "@/app/projects/[id]/ProjectDetailClient";


export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const project = await db.project.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      invoices: {
        orderBy: { createdAt: 'desc' }
      },
      estimates: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!project) return <div>Obra no encontrada</div>;

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

      <ProjectDetailClient project={project as any} />
    </div>
  );
}
