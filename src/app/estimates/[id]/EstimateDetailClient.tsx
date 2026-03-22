"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmationModal from '@/components/ConfirmationModal';
import { formatCurrency } from '@/lib/format';
import { parseGenerationNotes, parseLineEconomicStatus } from '@/lib/estimate/estimate-status';

interface EstimateData {
  id: string;
  number: string;
  issueDate: string;
  status: string;
  clientName: string;
  clientAddress: string;
  clientTaxId: string;
  items: { description: string; quantity: number; price: number; unit?: string; chapter?: string }[];
  subtotal: number;
  tax: number;
  total: number;
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyZip: string;
  companyProvince: string;
  companyTaxId: string;
  companyLogo: string;
  logoZoom?: number;
  logoX?: number;
  logoY?: number;
  paymentMethod: string;
  bankAccount: string;
  dataProtection: string;
  internalAnalysis: {
    generationSource: string;
    typologyCode?: string | null;
    seedVersion?: number | null;
    generationNotes?: unknown;
    summary: {
      materialCostTotal: number;
      laborCostTotal: number;
      associatedCostTotal: number;
      internalCostTotal: number;
      contingencyAmount: number;
      marginAmount: number;
      commercialSubtotal: number;
      vatAmount: number;
      commercialTotal: number;
    };
    lines: Array<{
      chapter: string;
      code?: string | null;
      description: string;
      quantity: number;
      unit: string;
      lineKind: string;
      materialCost: number;
      laborHours: number;
      laborCost: number;
      associatedCost: number;
      internalCost: number;
      commercialPrice: number;
      generationSource: string;
      typologyCode?: string | null;
      standardActivityCode?: string | null;
      productivityRateName?: string | null;
      appliedAssumptions?: Record<string, unknown> | null;
    }>;
  } | null;
}

export default function EstimateDetailClient({ estimate }: { estimate: EstimateData }) {
  const [isConverting, setIsConverting] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const router = useRouter();

  const handlePrint = () => {
    window.open(`/estimates/${estimate.id}/print`, '_blank');
  };

  const handleConvertToInvoice = async () => {
    setShowConvertModal(false);
    setIsConverting(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/convert`, {
        method: 'POST',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al convertir');
      }
      
      const invoice = await res.json();
      router.push(`/invoices/${invoice.id}`);
    } catch (error: any) {
      console.error(error);
      alert('Error: ' + error.message);
    } finally {
      setIsConverting(false);
    }
  };

  // Group items by chapter
  const chaptersMap: { [key: string]: typeof estimate.items } = {};
  estimate.items.forEach(item => {
    const ch = item.chapter || '01 GENERAL';
    if (!chaptersMap[ch]) chaptersMap[ch] = [];
    chaptersMap[ch].push(item);
  });
  const chapterNames = Object.keys(chaptersMap).sort();
  const parsedInternalNotes = estimate.internalAnalysis
    ? parseGenerationNotes(estimate.internalAnalysis.generationNotes)
    : { notes: [], estimateStatus: null };

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          className="btn-primary"
          onClick={handlePrint}
          style={{ padding: '8px 20px' }}
        >
          📄 Imprimir / Descargar PDF
        </button>
        
        {estimate.status !== 'CONVERTED' && (
          <button
            className="btn-success"
            onClick={() => setShowConvertModal(true)}
            disabled={isConverting}
            style={{ padding: '8px 20px', backgroundColor: '#10b981', border: 'none', color: 'white', fontWeight: 600, borderRadius: '8px', cursor: 'pointer' }}
          >
            {isConverting ? 'Convirtiendo...' : '🔄 Convertir en Factura'}
          </button>
        )}
      </div>

      <div className={`glass-panel`} style={{ padding: '24px', marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '20px', color: 'var(--accent-primary)' }}>Desglose de Presupuesto por Capítulos</h3>
        
        {chapterNames.map(chName => {
          const chItems = chaptersMap[chName];
          const chSubtotal = chItems.reduce((s, i) => s + (i.quantity * i.price), 0);
          
          return (
            <div key={chName} style={{ marginBottom: '24px' }}>
              <div style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                padding: '10px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
                marginBottom: '12px', borderLeft: '4px solid var(--accent-primary)'
              }}>
                <span style={{ fontWeight: 'bold' }}>{chName}</span>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>{formatCurrency(chSubtotal)}</span>
              </div>
              
              <div style={{ paddingLeft: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Partida / Concepto</th>
                      <th style={{ width: '60px', padding: '8px' }}>Ud.</th>
                      <th style={{ width: '80px', textAlign: 'right', padding: '8px' }}>Cant.</th>
                      <th style={{ width: '100px', textAlign: 'right', padding: '8px' }}>Precio</th>
                      <th style={{ width: '100px', textAlign: 'right', padding: '8px' }}>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 8px', whiteSpace: 'pre-wrap' }}>{item.description}</td>
                        <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{item.unit || 'ud'}</td>
                        <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(item.price)}</td>
                        <td style={{ textAlign: 'right', fontWeight: '500' }}>{formatCurrency(item.quantity * item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: '32px', borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '40px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>Subtotal Ejecución Material</p>
              <p style={{ fontWeight: '600' }}>{formatCurrency(estimate.subtotal)}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>IVA (21%)</p>
              <p style={{ fontWeight: '600' }}>{formatCurrency(estimate.tax)}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--accent-primary)', fontSize: '14px', marginBottom: '4px', fontWeight: '700' }}>TOTAL PRESUPUESTO</p>
              <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-primary)' }}>{formatCurrency(estimate.total)}</p>
            </div>
          </div>
        </div>
      </div>

      {estimate.internalAnalysis && (
        <div className={`glass-panel`} style={{ padding: '24px', marginBottom: '40px' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--accent-primary)' }}>Analisis interno persistido</h3>
          {parsedInternalNotes.estimateStatus && (
            <div
              style={{
                marginBottom: '20px',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                background: 'rgba(245, 158, 11, 0.08)',
                color: '#fcd34d',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>
                Estado del estimate: {parsedInternalNotes.estimateStatus.estimateMode}
              </div>
              <div style={{ fontSize: '13px' }}>
                Cobertura tecnica {parsedInternalNotes.estimateStatus.technicalCoveragePercent}% | Receta {parsedInternalNotes.estimateStatus.recipeCoveragePercent}% | Precio {parsedInternalNotes.estimateStatus.priceCoveragePercent}% | Lineas pendientes {parsedInternalNotes.estimateStatus.pendingValidationCount}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Fuente</div>
              <div style={{ fontWeight: 700 }}>{estimate.internalAnalysis.generationSource}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Tipologia</div>
              <div style={{ fontWeight: 700 }}>{estimate.internalAnalysis.typologyCode || 'Sin tipologia'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Seed</div>
              <div style={{ fontWeight: 700 }}>{estimate.internalAnalysis.seedVersion ?? '-'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div className="glass-panel" style={{ padding: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Materiales</div>
              <strong>{formatCurrency(estimate.internalAnalysis.summary.materialCostTotal)}</strong>
            </div>
            <div className="glass-panel" style={{ padding: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Mano de obra</div>
              <strong>{formatCurrency(estimate.internalAnalysis.summary.laborCostTotal)}</strong>
            </div>
            <div className="glass-panel" style={{ padding: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Asociados</div>
              <strong>{formatCurrency(estimate.internalAnalysis.summary.associatedCostTotal)}</strong>
            </div>
            <div className="glass-panel" style={{ padding: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Coste interno</div>
              <strong>{formatCurrency(estimate.internalAnalysis.summary.internalCostTotal)}</strong>
            </div>
            <div className="glass-panel" style={{ padding: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Contingencia</div>
              <strong>{formatCurrency(estimate.internalAnalysis.summary.contingencyAmount)}</strong>
            </div>
            <div className="glass-panel" style={{ padding: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Margen</div>
              <strong>{formatCurrency(estimate.internalAnalysis.summary.marginAmount)}</strong>
            </div>
          </div>

          {parsedInternalNotes.notes.length > 0 && (
            <div style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              {parsedInternalNotes.notes.join(' | ')}
            </div>
          )}

          {parsedInternalNotes.integratedCostBuckets && parsedInternalNotes.integratedCostBuckets.length > 0 && (
            <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
              {parsedInternalNotes.integratedCostBuckets.map((bucket) => (
                <div key={bucket.bucketCode} className="glass-panel" style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 700 }}>{bucket.bucketCode}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {bucket.source} | {bucket.priceStatus} | Receta {bucket.recipeCoveragePercent}% | Precio {bucket.priceCoveragePercent}%
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '13px' }}>
                    Mat {formatCurrency(bucket.materialCost)} | MO {formatCurrency(bucket.laborCost)} | Asoc {formatCurrency(bucket.indirectCost)} | Total {bucket.totalCost == null ? 'Pendiente' : formatCurrency(bucket.totalCost)}
                  </div>
                  {bucket.source === 'HYBRID' && (
                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#fcd34d' }}>
                      Bucket provisional: conserva coste interno estimado, pero sigue pendiente de validacion comercial.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gap: '8px' }}>
            {estimate.internalAnalysis.lines.map((line, index) => {
              const lineEconomicStatus = parseLineEconomicStatus(line.appliedAssumptions);
              return (
              <div key={`${line.chapter}-${line.code || index}`} className="glass-panel" style={{ padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{line.chapter}</div>
                    <div>{line.description}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {line.generationSource}
                      {line.typologyCode ? ` | ${line.typologyCode}` : ''}
                      {line.standardActivityCode ? ` | ${line.standardActivityCode}` : ''}
                      {line.productivityRateName ? ` | ${line.productivityRateName}` : ''}
                    </div>
                    {lineEconomicStatus && (
                      <div style={{ fontSize: '12px', color: '#fcd34d', marginTop: '6px' }}>
                        {lineEconomicStatus.economicStatus} | {lineEconomicStatus.priceSource} | {lineEconomicStatus.costSource}
                        {lineEconomicStatus.pendingValidation ? ' | Pendiente de validacion' : ''}
                        {lineEconomicStatus.commercialPriceProvisional ? ' | Comercial provisional' : ''}
                        {lineEconomicStatus.bucketCode ? ` | Bucket ${lineEconomicStatus.bucketCode}` : ''}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '220px' }}>
                    <div>{line.quantity} {line.unit}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Mat {formatCurrency(line.materialCost)} | MO {formatCurrency(line.laborCost)} | Asoc {formatCurrency(line.associatedCost)}
                    </div>
                    <div style={{ fontWeight: 700, marginTop: '4px' }}>
                      Interno {formatCurrency(line.internalCost)} | Comercial {formatCurrency(line.commercialPrice)}
                      {lineEconomicStatus?.commercialPriceProvisional ? ' (provisional)' : ''}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '20px' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          {estimate.status === 'CONVERTED' 
            ? 'Este presupuesto ya ha sido convertido en factura.' 
            : 'Puedes previsualizar el presupuesto e imprimirlo, o convertirlo directamente en factura cuando el cliente lo acepte.'}
        </p>
      </div>

      <ConfirmationModal 
        isOpen={showConvertModal}
        title="Convertir a Factura"
        message={`¿Estás seguro de que deseas convertir el presupuesto ${estimate.number} en una factura? El estado del presupuesto pasará a "Convertido".`}
        confirmLabel="Convertir ahora"
        onConfirm={handleConvertToInvoice}
        onCancel={() => setShowConvertModal(false)}
        type="info"
      />
    </div>
  );
}
