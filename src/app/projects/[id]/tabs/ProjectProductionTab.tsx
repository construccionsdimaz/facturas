"use client";

import { useState, useEffect } from 'react';
import styles from '@/app/invoices/page.module.css';
import { formatCurrency } from '@/lib/format';

type ProductionLog = {
  id: string;
  date: string;
  actor: string;
  familyCode: string;
  activityId: string;
  actualHours: number;
  actualQuantity: number;
  actualUnit: string;
  progressPercent: number;
  notes: string;
};

export default function ProjectProductionTab({ 
  projectId, 
  activities = [],
  controlProjection
}: { 
  projectId: string;
  activities?: any[];
  controlProjection?: any;
}) {
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    familyCode: '',
    activityId: '',
    actualHours: '',
    actualQuantity: '',
    actualUnit: 'ud',
    progressPercent: '',
    notes: '',
    actor: 'Responsable'
  });

  useEffect(() => {
    fetchLogs();
  }, [projectId]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/production`);
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/production`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          actualHours: Number(formData.actualHours),
          actualQuantity: Number(formData.actualQuantity),
          progressPercent: Number(formData.progressPercent)
        }),
      });
      if (res.ok) {
        setIsAdding(false);
        setFormData({
          date: new Date().toISOString().split('T')[0],
          familyCode: '',
          activityId: '',
          actualHours: '',
          actualQuantity: '',
          actualUnit: 'ud',
          progressPercent: '',
          notes: '',
          actor: 'Responsable'
        });
        fetchLogs();
      }
    } catch (e) {
      console.error(e);
      alert('Error guardando el parte');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando historial de producción...</div>;

  const actuals = controlProjection?.actuals || {};
  const laborDeviations = controlProjection?.deviationLines?.filter((l: any) => l.type === 'LABOR') || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* KPIs de Producción */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
            {actuals.actualLaborHours || 0} h
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Mano de Obra Real</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>
            {actuals.averageRealProgress || 0}%
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Progreso Observado</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {logs.length}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Partes Registrados</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: laborDeviations.some((l: any) => (l.deltaPercent || 0) > 10) ? '#ef4444' : 'inherit' }}>
            {laborDeviations.length > 0 ? `${Math.round(laborDeviations.reduce((acc: number, l: any) => acc + (l.deltaPercent || 0), 0) / laborDeviations.length)}%` : '0%'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Desviación Laboral Media</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>🏗️ Registro de Producción y Actuals</h3>
        <button className="btn-primary" onClick={() => setIsAdding(true)}>
          + Nuevo Parte de Producción
        </button>
      </div>

      {isAdding && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h4 style={{ margin: '0 0 20px 0' }}>🚀 Nuevo Reporte de Campo</h4>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div className="formGroup">
              <label>Fecha</label>
              <input type="date" className="input-modern" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
            </div>
            <div className="formGroup">
              <label>Actividad / Frente</label>
              <select className="input-modern" value={formData.activityId} onChange={e => {
                const act = activities.find(a => a.key === e.target.value);
                setFormData({...formData, activityId: e.target.value, familyCode: act?.bucketCode || ''});
              }} required>
                <option value="">Seleccionar actividad...</option>
                {activities.map((a: any) => (
                  <option key={a.key} value={a.key}>[{a.key}] {a.name}</option>
                ))}
              </select>
            </div>
            <div className="formGroup">
              <label>Familia (Auto)</label>
              <input type="text" className="input-modern" value={formData.familyCode} readOnly style={{ opacity: 0.7 }} />
            </div>
            <div className="formGroup">
              <label>Horas Reales (Mano de Obra)</label>
              <input type="number" step="0.5" className="input-modern" value={formData.actualHours} onChange={e => setFormData({...formData, actualHours: e.target.value})} required />
            </div>
            <div className="formGroup">
              <label>Cantidad Ejecutada</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" step="0.01" className="input-modern" value={formData.actualQuantity} onChange={e => setFormData({...formData, actualQuantity: e.target.value})} required />
                <select className="input-modern" style={{ width: '80px' }} value={formData.actualUnit} onChange={e => setFormData({...formData, actualUnit: e.target.value})}>
                  <option value="ud">ud</option>
                  <option value="m2">m2</option>
                  <option value="ml">ml</option>
                  <option value="pt">pt</option>
                </select>
              </div>
            </div>
            <div className="formGroup">
              <label>Progreso (%) de la actividad</label>
              <input type="number" min="0" max="100" className="input-modern" value={formData.progressPercent} onChange={e => setFormData({...formData, progressPercent: e.target.value})} required />
            </div>
            <div className="formGroup" style={{ gridColumn: 'span 2' }}>
              <label>Notas / Incidencias / Observaciones</label>
              <textarea className="input-modern" rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Ej: Retraso por falta de material, jornada intensiva..." />
            </div>
            <div className="formGroup">
              <label>Actor / Informante</label>
              <input type="text" className="input-modern" value={formData.actor} onChange={e => setFormData({...formData, actor: e.target.value})} />
            </div>
            <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="btn-secondary" onClick={() => setIsAdding(false)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Registrar Producción'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Historial de Producción */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h4 style={{ margin: '0 0 16px 0' }}>📋 Historial de Partes de Producción</h4>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Familia</th>
                <th>Actividad</th>
                <th>Horas</th>
                <th>Producción</th>
                <th>Avance</th>
                <th>Notas</th>
                <th>Actor</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No hay registros de producción todavía. Pulsa el botón superior para añadir el primero.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.date).toLocaleDateString()}</td>
                    <td>
                      <span className="badge-modern" style={{ fontSize: '10px' }}>{log.familyCode}</span>
                    </td>
                    <td style={{ fontSize: '12px', fontWeight: '500' }}>
                      {activities.find(a => a.key === log.activityId)?.name || log.activityId}
                    </td>
                    <td style={{ fontWeight: '600' }}>{log.actualHours} h</td>
                    <td>{log.actualQuantity} {log.actualUnit}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'var(--accent-primary)', width: `${log.progressPercent}%` }}></div>
                        </div>
                        <span style={{ fontSize: '11px' }}>{log.progressPercent}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.notes}>
                      {log.notes || '-'}
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.actor}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
