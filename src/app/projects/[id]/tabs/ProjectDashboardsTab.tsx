"use client";

import { useState, useEffect } from 'react';
import styles from '@/app/invoices/page.module.css';

export default function ProjectDashboardsTab({ projectId }: { projectId: string }) {
  const [kpis, setKpis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchKpis();
  }, [projectId]);

  const fetchKpis = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/kpis`);
      if (res.ok) setKpis(await res.json());
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Procesando inteligencia de obra...</div>;
  if (!kpis) return <div>Error al cargar indicadores.</div>;

  const getStatusColor = (status: 'green' | 'amber' | 'red') => {
    if (status === 'green') return '#10b981';
    if (status === 'amber') return '#f59e0b';
    return '#ef4444';
  };

  // Traffic Light Logic
  const scheduleStatus = kpis.schedule.delayedActivities > 0 ? (kpis.schedule.delayedActivities > 5 ? 'red' : 'amber') : 'green';
  const readinessStatus = kpis.readiness.lookaheadTotal > 0 && (kpis.readiness.readyCount / kpis.readiness.lookaheadTotal < 0.8) ? 'amber' : 'green';
  const supplyStatus = kpis.operations.delayedSupplies > 0 || kpis.operations.criticalSuppliesRisk > 0 ? 'red' : 'green';
  const restrictionStatus = kpis.operations.overdueRestrictions > 0 ? 'red' : (kpis.operations.criticalRestrictions > 0 ? 'amber' : 'green');
  const stabilityStatus = kpis.schedule.baselineDeviations > 10 ? 'red' : (kpis.schedule.baselineDeviations > 0 ? 'amber' : 'green');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Semáforos Ejecutivos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', borderTop: `4px solid ${getStatusColor(scheduleStatus)}` }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Salud Plazo</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', margin: '8px 0' }}>{scheduleStatus === 'green' ? 'SANO' : scheduleStatus === 'amber' ? 'ALERTA' : 'RIESGO'}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{kpis.schedule.delayedActivities} retrasos</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', borderTop: `4px solid ${getStatusColor(readinessStatus)}` }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Prep. Corto Plazo</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', margin: '8px 0' }}>{Math.round((kpis.readiness.readyCount / (kpis.readiness.lookaheadTotal || 1)) * 100)}%</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ready vs Lookahead</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', borderTop: `4px solid ${getStatusColor(supplyStatus)}` }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Logística / Stock</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', margin: '8px 0' }}>{supplyStatus === 'green' ? 'OK' : 'TENSIÓN'}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{kpis.operations.delayedSupplies} pedidos tarde</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', borderTop: `4px solid ${getStatusColor(restrictionStatus)}` }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Bloqueos</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', margin: '8px 0' }}>{restrictionStatus === 'green' ? 'BAJO' : 'ALTO'}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{kpis.operations.activeRestrictionsCount} abiertos</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', borderTop: `4px solid ${getStatusColor(stabilityStatus)}` }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Estabilidad Plan</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', margin: '8px 0' }}>{stabilityStatus === 'green' ? 'ALTA' : 'DERIVA'}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{kpis.schedule.baselineDeviations} desvíos vs BL</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* 2. Avance Real y Plazo */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0' }}>📈 Avance de Obra Seleccionada</h3>
          <div style={{ position: 'relative', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ width: `${kpis.schedule.avgProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), #10b981)', transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '30px' }}>
            <span>Ejecución Real Promedio</span>
            <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{Math.round(kpis.schedule.avgProgress)}%</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Finalizadas</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{kpis.schedule.completedActivities}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>En Curso</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{kpis.schedule.inProgressActivities}</div>
            </div>
          </div>
        </div>

        {/* 3. Fiabilidad Semanal (PPC) */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0' }}>📊 Fiabilidad del Plan Semanal (PPC)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', height: '120px', marginTop: '20px' }}>
            {kpis.weekly.ppcHistory.length === 0 ? (
              <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Sin datos de cumplimiento histórico.</div>
            ) : kpis.weekly.ppcHistory.map((h: any, i: number) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '100%', 
                  height: `${h.ppc}%`, 
                  background: h.ppc > 80 ? '#10b981' : h.ppc > 50 ? '#f59e0b' : '#ef4444', 
                  borderRadius: '4px 4px 0 0',
                  position: 'relative'
                }}>
                  <span style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', fontWeight: 'bold' }}>{Math.round(h.ppc)}%</span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>{h.week}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Promedio de fiabilidad últimas semanas (PPC)
          </div>
        </div>

        {/* 4. Riesgos y Bloqueos */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0' }}>🚧 Radar de Riesgos Operativos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
                <span style={{ fontSize: '13px' }}>Restricciones Críticas Vencidas</span>
                <span style={{ fontWeight: 'bold', color: '#ef4444' }}>{kpis.operations.overdueRestrictions}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px' }}>
                <span style={{ fontSize: '13px' }}>Suministros Críticos Tarde</span>
                <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>{kpis.operations.delayedSupplies}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px' }}>
                <span style={{ fontSize: '13px' }}>Cambios Pendientes de Implementar</span>
                <span style={{ fontWeight: 'bold' }}>{kpis.stability.openChanges}</span>
             </div>
          </div>
        </div>

        {/* 5. Estabilidad del Plan */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0' }}>🛡️ Estabilidad vs Baseline</h3>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Baseline de Referencia</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--accent-primary)', marginBottom: '15px' }}>{kpis.stability.baselineName}</div>
            
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: stabilityStatus === 'red' ? '#ef4444' : 'inherit' }}>{kpis.schedule.baselineDeviations}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Actividades con fechas modificadas</div>
          </div>
        </div>

      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 10px 0' }}>🧭 Prioridades de Actuación</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
          Basándonos en la salud operativa de la obra, estas son tus prioridades inmediatas:
        </p>
        <ul style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {kpis.operations.criticalRestrictions > 0 && <li style={{ borderLeft: '3px solid #ef4444', paddingLeft: '8px' }}>Resolver {kpis.operations.criticalRestrictions} restricciones críticas que bloquean el inicio de trabajos.</li>}
          {kpis.operations.delayedSupplies > 0 && <li style={{ borderLeft: '3px solid #f59e0b', paddingLeft: '8px' }}>Revisar {kpis.operations.delayedSupplies} pedidos de material que ya deberían estar en obra.</li>}
          {kpis.readiness.lookaheadTotal > kpis.readiness.readyCount && <li style={{ borderLeft: '3px solid var(--accent-primary)', paddingLeft: '8px' }}>Preparar {kpis.readiness.lookaheadTotal - kpis.readiness.readyCount} actividades próximas que aún no están listas para ejecutarse.</li>}
          {kpis.stability.openChanges > 0 && <li style={{ borderLeft: '3px solid var(--text-muted)', paddingLeft: '8px' }}>Validar {kpis.stability.openChanges} solicitudes de cambio para estabilizar la planificación vigente.</li>}
          {kpis.schedule.delayedActivities > 0 && <li style={{ borderLeft: '3px solid #ef4444', paddingLeft: '8px' }}>Actualizar seguimiento de {kpis.schedule.delayedActivities} actividades con fecha de fin vencida.</li>}
        </ul>
      </div>

    </div>
  );
}
