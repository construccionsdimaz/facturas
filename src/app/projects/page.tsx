import { db } from "@/lib/db";
import styles from "./page.module.css";
import Link from "next/link";
import ProjectsListClient from "@/app/projects/ProjectsListClient";


export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const projects = await db.project.findMany({
    include: {
      client: true,
      _count: {
        select: {
          invoices: true,
          estimates: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return (
    <div className={styles.projectsPage}>
      <div className={styles.header}>
        <div>
          <h1 className="text-gradient">Obras / Proyectos</h1>
          <p className={styles.subtitle}>Gestiona tus proyectos y documentos asociados.</p>
        </div>
        <Link href="/projects/new">
          <button className="btn-primary">+ Nueva Obra</button>
        </Link>
      </div>

      <ProjectsListClient initialProjects={projects as any} />
    </div>
  );
}
