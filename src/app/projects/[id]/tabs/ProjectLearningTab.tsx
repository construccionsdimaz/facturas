"use client";

import { useEffect, useState } from 'react';
import styles from '@/app/invoices/page.module.css';

type LearningResponse = {
  summary: {
    costDeviations: number;
    scheduleDeviations: number;
    procurementDeviations: number;
    pendingSuggestions: number;
    notices: string[];
  };
  deviations: any[];
  suggestions: any[];
};

export default function ProjectLearningTab({ projectId }: { projectId: string }) {
  const [data, setData] = useState<LearningResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const fetchLearning = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/learning${refresh ? '?refresh=1' : ''}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLearning();
  }, [projectId]);

  const handleRebuild = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/learning`, {
        method: 'POST',
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateSuggestion = async (suggestionId: string, status: 'APPROVED' | 'REJECTED' | 'APPLIED') => {
    setReviewingId(suggestionId);
    try {
      const res = await fetch(`/api/projects/${projectId}/learning/suggestions/${suggestionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchLearning();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setReviewingId(null);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Analizando desviaciones reales de la obra...</div>;
  }

  const deviations = data?.deviations || [];
  const suggestions = data?.suggestions || [];
  const topDeviations = deviations.slice(0, 12);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{data?.summary.costDeviations || 0}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Desvios de coste</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>{data?.summary.scheduleDeviations || 0}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Desvios de plazo</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>{data?.summary.procurementDeviations || 0}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Desvios de compras</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', borderColor: (data?.summary.pendingSuggestions || 0) > 0 ? '#ef4444' : 'transparent' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: (data?.summary.pendingSuggestions || 0) > 0 ? '#ef4444' : 'inherit' }}>{data?.summary.pendingSuggestions || 0}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sugerencias pendientes</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={handleRebuild} disabled={isRefreshing}>
          {isRefreshing ? 'Recalculando...' : 'Recalcular aprendizaje'}
        </button>
      </div>

      {data?.summary.notices?.length ? (
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
          <h3 style={{ margin: '0 0 12px 0' }}>Cobertura y limites actuales</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)' }}>
            {data.summary.notices.map((notice, index) => (
              <div key={`${notice}-${index}`}>• {notice}</div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 20px 0' }}>Desvios detectados</h3>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Objetivo</th>
                <th>Estimado</th>
                <th>Real</th>
                <th>Desvio</th>
                <th>Evidencia</th>
              </tr>
            </thead>
            <tbody>
              {topDeviations.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Aun no hay datos suficientes para detectar desvios relevantes.</td></tr>
              ) : topDeviations.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{item.category}</div>
                    <div style={{ fontSize: '11px', color: item.severity === 'CRITICA' ? '#ef4444' : item.severity === 'ALTA' ? '#f59e0b' : '#94a3b8' }}>
                      {item.dimension} · {item.severity}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.targetName || item.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.title}</div>
                  </td>
                  <td>{item.estimatedValue ?? '-'}</td>
                  <td>{item.actualValue ?? '-'}</td>
                  <td>
                    <div style={{ fontWeight: 700, color: (item.deltaPercent || 0) > 0 ? '#ef4444' : '#10b981' }}>
                      {item.deltaValue ?? '-'} {item.unit || ''}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {item.deltaPercent !== null && item.deltaPercent !== undefined ? `${item.deltaPercent}%` : 'Sin %'}
                    </div>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {item.evidenceCount} caso(s)
                    {item.description && <div style={{ marginTop: '4px', color: 'var(--text-muted)' }}>{item.description}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 20px 0' }}>Sugerencias de recalibracion</h3>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Sugerencia</th>
                <th>Actual</th>
                <th>Propuesto</th>
                <th>Muestra</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Accion</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Aun no hay evidencia suficiente para proponer recalibraciones.</td></tr>
              ) : suggestions.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{item.targetName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.rationale}</div>
                    <div style={{ fontSize: '11px', color: item.priority === 'ALTA' ? '#ef4444' : '#94a3b8' }}>{item.suggestionType} · {item.priority}</div>
                  </td>
                  <td>{item.currentValue ?? '-'} {item.unit || ''}</td>
                  <td>{item.suggestedValue ?? '-'} {item.unit || ''}</td>
                  <td>
                    <div>{item.sampleSize} caso(s)</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Confianza {Math.round((item.confidence || 0) * 100)}%</div>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderRadius: '999px',
                      background: item.status === 'APPROVED' ? 'rgba(16,185,129,0.15)' : item.status === 'REJECTED' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
                      color: item.status === 'APPROVED' ? '#10b981' : item.status === 'REJECTED' ? '#ef4444' : '#3b82f6'
                    }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                      <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: '11px' }} disabled={reviewingId === item.id} onClick={() => updateSuggestion(item.id, 'APPROVED')}>Aprobar</button>
                      <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: '11px' }} disabled={reviewingId === item.id} onClick={() => updateSuggestion(item.id, 'REJECTED')}>Descartar</button>
                      <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: '11px' }} disabled={reviewingId === item.id} onClick={() => updateSuggestion(item.id, 'APPLIED')}>Marcar aplicada</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
