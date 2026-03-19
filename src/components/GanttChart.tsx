"use client";

import React from 'react';
import { formatCurrency } from '@/lib/format';

interface GanttChartProps {
  budgetLines: any[];
}

export default function GanttChart({ budgetLines }: GanttChartProps) {
  // Filter lines with dates
  const linesWithDates = budgetLines.filter(line => line.startDate && line.endDate);

  if (linesWithDates.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-subtle)', borderRadius: '12px' }}>
        <div style={{ fontSize: '24px', marginBottom: '12px' }}>📅</div>
        <p>No hay partidas con fechas asignadas.</p>
        <p style={{ fontSize: '13px', marginTop: '4px' }}>Asigna fechas de inicio y fin en la pestaña de "Presupuesto" para ver el cronograma.</p>
      </div>
    );
  }

  // Calculate time range
  const allDates = linesWithDates.flatMap(l => [new Date(l.startDate), new Date(l.endDate)]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

  // Expand range slightly
  minDate.setDate(1); // Start of month
  maxDate.setMonth(maxDate.getMonth() + 1);
  maxDate.setDate(0); // End of month

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const months: { name: string, days: number }[] = [];
  let current = new Date(minDate);

  while (current <= maxDate) {
    const monthName = current.toLocaleString('es-ES', { month: 'short', year: 'numeric' });
    const year = current.getFullYear();
    const month = current.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Adjust days if it's the first or last month in range
    const startDay = (current.getTime() === minDate.getTime()) ? minDate.getDate() : 1;
    const endDay = daysInMonth; // We always go to end of last month
    
    months.push({ name: monthName, days: daysInMonth });
    current.setMonth(current.getMonth() + 1);
    current.setDate(1);
  }

  const getPosition = (date: Date) => {
    const diff = date.getTime() - minDate.getTime();
    return (diff / (1000 * 60 * 60 * 24)) / totalDays * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#10b981';
      case 'IN_PROGRESS': return '#3b82f6';
      default: return '#64748b';
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
      <div style={{ minWidth: '800px' }}>
        {/* Timeline Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
          <div style={{ padding: '10px', fontWeight: 'bold' }}>Partida / Concepto</div>
          <div style={{ display: 'flex', overflow: 'hidden' }}>
            {months.map((m, i) => (
              <div key={i} style={{ 
                flex: m.days, 
                textAlign: 'center', 
                fontSize: '12px', 
                padding: '10px 0', 
                borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                textTransform: 'capitalize',
                background: 'rgba(255,255,255,0.02)'
              }}>
                {m.name}
              </div>
            ))}
          </div>
        </div>

        {/* Gantt Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {linesWithDates.sort((a, b) => (a.order || 0) - (b.order || 0)).map((line) => {
            const start = new Date(line.startDate);
            const end = new Date(line.endDate);
            const left = getPosition(start);
            const width = getPosition(end) - left;
            const progress = line.estimatedAmount > 0 ? (line.certifiedAmount / line.estimatedAmount) * 100 : 0;

            return (
              <div key={line.id} style={{ display: 'grid', gridTemplateColumns: '250px 1fr', alignItems: 'center', height: '40px' }}>
                <div style={{ padding: '0 10px', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={line.name}>
                  {line.name}
                </div>
                <div style={{ position: 'relative', height: '100%', borderLeft: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                  {/* Grid Lines (Vertical) */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex' }}>
                    {months.map((m, i) => (
                      <div key={i} style={{ flex: m.days, borderRight: '1px solid rgba(255,255,255,0.03)' }}></div>
                    ))}
                  </div>
                  
                  {/* Task Bar */}
                  <div style={{ 
                    position: 'absolute', 
                    left: `${left}%`, 
                    width: `${width}%`, 
                    top: '8px', 
                    bottom: '8px', 
                    background: `linear-gradient(90deg, ${getStatusColor(line.status)}cc 0%, ${getStatusColor(line.status)}99 100%)`,
                    borderRadius: '4px',
                    border: `1px solid ${getStatusColor(line.status)}`,
                    cursor: 'help'
                  }} title={`${line.name}: ${new Date(line.startDate).toLocaleDateString()} - ${new Date(line.endDate).toLocaleDateString()} (${progress.toFixed(0)}% certificado)`}>
                    {/* Progress Fill */}
                    <div style={{ 
                      height: '100%', 
                      width: `${Math.min(100, progress)}%`, 
                      background: 'rgba(255,255,255,0.2)',
                      borderRadius: '2px 0 0 2px'
                    }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
