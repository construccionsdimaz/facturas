"use client";
// 

import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function ProjectsListClient({ initialProjects }: { initialProjects: any[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [search, setSearch] = useState('');

  const filtered = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.client.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalActive = projects.filter(p => p.status === 'ACTIVE').length;

  return (
    <>
      <div className="metricsGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Total Obras</div>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>{projects.length}</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Obras Activas</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success-main)' }}>{totalActive}</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Obras Finalizadas</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--warning-main)' }}>{projects.length - totalActive}</div>
        </div>
      </div>

      <div className={styles.controlsSection}>
        <div className={styles.filterBar}>
          <div className={styles.filterGroup} style={{ flex: 1 }}>
            <label>Buscar Obra o Cliente</label>
            <input 
              type="text" 
              className={styles.inputModern} 
              placeholder="🔍 Ej: Reforma Calle Mayor..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      <div className={`glass-panel ${styles.tableContainer}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Obra / Proyecto</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Documentos</th>
              <th>Fecha Inicio</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                  {projects.length === 0 
                    ? "No hay obras registradas todavía. ¡Crea tu primera obra!" 
                    : "No se han encontrado obras para esta búsqueda."}
                </td>
              </tr>
            ) : filtered.map((p) => (
              <tr key={p.id} className={styles.tableRow}>
                <td>
                  <Link href={`/projects/${p.id}`} className={styles.rowLink}>
                    <strong>{p.name}</strong>
                  </Link>
                </td>
                <td>{p.client.name}</td>
                <td>
                  <span className={`badge badge-${p.status === 'ACTIVE' ? 'success' : 'warning'}`}>
                    {p.status === 'ACTIVE' ? 'ACTIVA' : 'FINALIZADA'}
                  </span>
                </td>
                <td>
                   <div style={{ fontSize: '13px' }}>
                     📄 {p._count.invoices} facturas <br/>
                     📝 {p._count.estimates} presupuestos
                   </div>
                </td>
                <td>{new Date(p.createdAt).toLocaleDateString('es-ES')}</td>
                <td style={{ textAlign: 'right' }}>
                  <Link href={`/projects/${p.id}`}>
                    <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Ver Detalle</button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
