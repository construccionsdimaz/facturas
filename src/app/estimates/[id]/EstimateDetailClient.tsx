"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmationModal from '@/components/ConfirmationModal';
import { formatCurrency } from '@/lib/format';
import { parseGenerationNotes, parseLineEconomicStatus } from '@/lib/estimate/estimate-status';
import type { CommercialEstimateProjection } from '@/lib/estimate/commercial-estimate-projection';
import type { CommercialEstimateRuntimeOutput } from '@/lib/estimate/commercial-estimate-runtime';
import type { CommercialEstimateReadModel } from '@/lib/estimates/internal-analysis';

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
  commercialReadModel?: CommercialEstimateReadModel | null;
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
  const [isApplyingOverride, setIsApplyingOverride] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRevokingAcceptance, setIsRevokingAcceptance] = useState(false);
  const router = useRouter();

  const readinessLabel = (readiness?: string) => {
    switch (readiness) {
      case 'TECHNICALLY_CLOSED':
        return 'Tecnicamente cerrado';
      case 'COMMERCIAL_READY':
        return 'Listo para emitir';
      case 'PROVISIONAL_REVIEW_REQUIRED':
        return 'Provisional con revision requerida';
      case 'PARAMETRIC_PRELIMINARY':
        return 'Preliminar parametrico';
      default:
        return 'Borrador';
    }
  };

  const commercialStatusLabel = (status?: string) => {
    switch (status) {
      case 'ISSUED_PROVISIONAL':
        return 'Emitido provisional';
      case 'ISSUED_FINAL':
        return 'Emitido final';
      case 'CONVERTED':
        return 'Convertido';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return 'No emitido';
    }
  };

  const acceptanceLabel = (status?: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'Aceptado';
      case 'REJECTED':
        return 'Rechazado';
      default:
        return 'No aceptado';
    }
  };

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

  const handleReadinessOverride = async () => {
    const reason = window.prompt('Motivo obligatorio para emitir igualmente este presupuesto:');
    if (!reason?.trim()) return;

    setIsApplyingOverride(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/readiness-override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo registrar el override.');
      }

      router.refresh();
    } catch (error: any) {
      alert(error.message || 'No se pudo registrar el override.');
    } finally {
      setIsApplyingOverride(false);
    }
  };

  const handleIssue = async (mode: 'PROVISIONAL' | 'FINAL') => {
    if (!parsedInternalNotes.estimateStatus) return;
    const issuanceCapabilities = parsedInternalNotes.estimateStatus.issuanceCapabilities;
    const requiresOverride =
      mode === 'PROVISIONAL'
        ? issuanceCapabilities.requiresOverrideForProvisional
        : issuanceCapabilities.requiresOverrideForFinal;

    let reason = '';
    if (requiresOverride) {
      reason =
        window.prompt(`Motivo obligatorio para emitir en modo ${mode === 'FINAL' ? 'final' : 'provisional'}:`)?.trim() || '';
      if (!reason) return;
    }

    setIsIssuing(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          useOverride: requiresOverride,
          reason,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo emitir el presupuesto.');
      }
      router.refresh();
    } catch (error: any) {
      alert(error.message || 'No se pudo emitir el presupuesto.');
    } finally {
      setIsIssuing(false);
    }
  };

  const handleRevokeIssuance = async () => {
    const reason = window.prompt('Motivo obligatorio para revocar la emision:')?.trim() || '';
    if (!reason) return;

    setIsRevoking(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/revoke-issuance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo revocar la emision.');
      }
      router.refresh();
    } catch (error: any) {
      alert(error.message || 'No se pudo revocar la emision.');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleAccept = async () => {
    const reason = '';
    setIsAccepting(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo aceptar el estimate.');
      }
      router.refresh();
    } catch (error: any) {
      alert(error.message || 'No se pudo aceptar el estimate.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt('Motivo obligatorio para registrar el rechazo:')?.trim() || '';
    if (!reason) return;

    setIsRejecting(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo rechazar el estimate.');
      }
      router.refresh();
    } catch (error: any) {
      alert(error.message || 'No se pudo rechazar el estimate.');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleRevokeAcceptance = async () => {
    const reason = window.prompt('Motivo obligatorio para revocar la aceptacion:')?.trim() || '';
    if (!reason) return;

    setIsRevokingAcceptance(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/revoke-acceptance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo revocar la aceptacion.');
      }
      router.refresh();
    } catch (error: any) {
      alert(error.message || 'No se pudo revocar la aceptacion.');
    } finally {
      setIsRevokingAcceptance(false);
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
  const commercialRuntimeOutput =
    estimate.commercialReadModel?.commercialRuntimeOutput ||
    ((parsedInternalNotes.commercialRuntimeOutput || null) as CommercialEstimateRuntimeOutput | null);
  const commercialProjection =
    estimate.commercialReadModel?.commercialEstimateProjection ||
    ((parsedInternalNotes.commercialEstimateProjection || null) as CommercialEstimateProjection | null);
  const activeProjection = commercialRuntimeOutput?.projection || commercialProjection;
  const commercialCapabilities =
    parsedInternalNotes.estimateStatus?.commercialCapabilities ?? null;
  const acceptanceCapabilities =
    parsedInternalNotes.estimateStatus?.acceptanceCapabilities ?? null;
  const canConvertEstimate =
    estimate.status !== 'CONVERTED' && Boolean(commercialCapabilities?.canConvert);

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
        
        {canConvertEstimate && (
          <button
            className="btn-success"
            onClick={() => setShowConvertModal(true)}
            disabled={isConverting}
            style={{ padding: '8px 20px', backgroundColor: '#10b981', border: 'none', color: 'white', fontWeight: 600, borderRadius: '8px', cursor: 'pointer' }}
          >
            {isConverting ? 'Convirtiendo...' : '🔄 Convertir en Factura'}
          </button>
        )}

        {parsedInternalNotes.estimateStatus &&
          !parsedInternalNotes.estimateStatus.manualOverride?.applied &&
          (parsedInternalNotes.estimateStatus.readiness === 'PARAMETRIC_PRELIMINARY' ||
            parsedInternalNotes.estimateStatus.readiness === 'PROVISIONAL_REVIEW_REQUIRED') && (
            <button
              className="btn-secondary"
              onClick={handleReadinessOverride}
              disabled={isApplyingOverride}
              style={{ padding: '8px 20px' }}
            >
              {isApplyingOverride ? 'Registrando override...' : 'Emitir igualmente'}
            </button>
          )}

        {commercialCapabilities?.canIssueProvisional && (
          <button
            className="btn-secondary"
            onClick={() => handleIssue('PROVISIONAL')}
            disabled={isIssuing}
            style={{ padding: '8px 20px' }}
          >
            {isIssuing ? 'Emitiendo...' : 'Emitir como provisional'}
          </button>
        )}

        {commercialCapabilities?.canIssueFinal && (
          <button
            className="btn-secondary"
            onClick={() => handleIssue('FINAL')}
            disabled={isIssuing}
            style={{ padding: '8px 20px' }}
          >
            {isIssuing ? 'Emitiendo...' : 'Emitir como final'}
          </button>
        )}

        {commercialCapabilities?.canRevokeIssuance && (
          <button
            className="btn-secondary"
            onClick={handleRevokeIssuance}
            disabled={isRevoking}
            style={{ padding: '8px 20px' }}
          >
            {isRevoking ? 'Revocando...' : 'Revocar emision'}
          </button>
        )}

        {acceptanceCapabilities?.canAccept && (
          <button
            className="btn-secondary"
            onClick={handleAccept}
            disabled={isAccepting}
            style={{ padding: '8px 20px' }}
          >
            {isAccepting ? 'Aceptando...' : 'Aceptar'}
          </button>
        )}

        {acceptanceCapabilities?.canReject && (
          <button
            className="btn-secondary"
            onClick={handleReject}
            disabled={isRejecting}
            style={{ padding: '8px 20px' }}
          >
            {isRejecting ? 'Registrando rechazo...' : 'Rechazar'}
          </button>
        )}

        {acceptanceCapabilities?.canRevokeAcceptance && (
          <button
            className="btn-secondary"
            onClick={handleRevokeAcceptance}
            disabled={isRevokingAcceptance}
            style={{ padding: '8px 20px' }}
          >
            {isRevokingAcceptance ? 'Revocando aceptacion...' : 'Revocar aceptacion'}
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
                Readiness: {readinessLabel(parsedInternalNotes.estimateStatus.readiness)} | Estado tecnico: {parsedInternalNotes.estimateStatus.estimateMode}
              </div>
              <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                Estado comercial: {commercialStatusLabel(parsedInternalNotes.estimateStatus.commercialStatus)}
              </div>
              {commercialRuntimeOutput && (
                <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                  Runtime comercial: {commercialRuntimeOutput.source}
                </div>
              )}
              {activeProjection && (
                <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                  Proyeccion comercial: {activeProjection.source}
                </div>
              )}
              <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                Aceptacion: {acceptanceLabel(parsedInternalNotes.estimateStatus.acceptance.status)}
              </div>
              <div style={{ fontSize: '13px' }}>
                Cobertura tecnica {parsedInternalNotes.estimateStatus.technicalCoveragePercent}% | Receta {parsedInternalNotes.estimateStatus.recipeCoveragePercent}% | Precio {parsedInternalNotes.estimateStatus.priceCoveragePercent}% | Lineas pendientes {parsedInternalNotes.estimateStatus.pendingValidationCount}
              </div>
              {parsedInternalNotes.estimateStatus.readinessReasons.length > 0 && (
                <div style={{ fontSize: '13px', marginTop: '6px' }}>
                  {parsedInternalNotes.estimateStatus.readinessReasons.join(' | ')}
                </div>
              )}
              {parsedInternalNotes.estimateStatus.manualOverride?.applied && (
                <div style={{ fontSize: '13px', marginTop: '6px', fontWeight: 600 }}>
                  Override manual: {parsedInternalNotes.estimateStatus.manualOverride.reason}
                </div>
              )}
              <div style={{ fontSize: '13px', marginTop: '6px' }}>
                Emision: {parsedInternalNotes.estimateStatus.issuance.status}
                {parsedInternalNotes.estimateStatus.issuance.issuedBy ? ` | Por ${parsedInternalNotes.estimateStatus.issuance.issuedBy}` : ''}
                {parsedInternalNotes.estimateStatus.issuance.issuedAt ? ` | ${parsedInternalNotes.estimateStatus.issuance.issuedAt}` : ''}
              </div>
              <div style={{ fontSize: '13px', marginTop: '6px' }}>
                Aceptacion: {parsedInternalNotes.estimateStatus.acceptance.status}
                {parsedInternalNotes.estimateStatus.acceptance.acceptedBy ? ` | Por ${parsedInternalNotes.estimateStatus.acceptance.acceptedBy}` : ''}
                {parsedInternalNotes.estimateStatus.acceptance.acceptedAt ? ` | ${parsedInternalNotes.estimateStatus.acceptance.acceptedAt}` : ''}
              </div>
              {parsedInternalNotes.estimateStatus.commercialReasons.length > 0 && (
                <div style={{ fontSize: '13px', marginTop: '6px' }}>
                  {parsedInternalNotes.estimateStatus.commercialReasons.join(' | ')}
                </div>
              )}
              {parsedInternalNotes.estimateStatus.nextCommercialAction && (
                <div style={{ fontSize: '13px', marginTop: '6px', fontWeight: 600 }}>
                  Siguiente paso: {parsedInternalNotes.estimateStatus.nextCommercialAction}
                </div>
              )}
              {parsedInternalNotes.estimateStatus.issuance.issuanceReason && (
                <div style={{ fontSize: '13px', marginTop: '6px' }}>
                  Motivo de emision: {parsedInternalNotes.estimateStatus.issuance.issuanceReason}
                </div>
              )}
              {parsedInternalNotes.estimateStatus.acceptance.acceptanceReason && (
                <div style={{ fontSize: '13px', marginTop: '6px' }}>
                  Motivo de aceptacion/rechazo: {parsedInternalNotes.estimateStatus.acceptance.acceptanceReason}
                </div>
              )}
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

          {(commercialRuntimeOutput?.projection?.buckets || activeProjection?.buckets || parsedInternalNotes.integratedCostBuckets)?.length ? (
            <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
              {(commercialRuntimeOutput?.projection?.buckets || activeProjection?.buckets || parsedInternalNotes.integratedCostBuckets || []).map((bucket) => (
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
          ) : null}

          {commercialRuntimeOutput?.lines?.length ? (
            <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
              {commercialRuntimeOutput.lines.map((line) => (
                <div key={line.id} className="glass-panel" style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{line.chapter}</div>
                      <div>{line.description}</div>
                      <div style={{ fontSize: '12px', color: '#fcd34d', marginTop: '6px' }}>
                        {line.economicStatus.economicStatus} | {line.economicStatus.priceSource} | {line.economicStatus.costSource}
                        {line.economicStatus.pendingValidation ? ' | Pendiente de validacion' : ''}
                        {line.provisional ? ' | Comercial provisional' : ''}
                        {line.generatedFrom ? ` | ${line.generatedFrom}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '220px' }}>
                      <div>{line.quantity} {line.unit}</div>
                      <div style={{ fontWeight: 700, marginTop: '4px' }}>
                        Interno {formatCurrency(line.internalCost || 0)} | Comercial {formatCurrency(line.commercialPrice || 0)}
                        {line.provisional ? ' (provisional)' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!commercialRuntimeOutput?.lines?.length ? (
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
          ) : null}
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '20px' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          {estimate.status === 'CONVERTED'
            ? 'Este presupuesto ya ha sido convertido en factura.'
            : parsedInternalNotes.estimateStatus?.acceptance.status === 'ACCEPTED'
              ? 'Aceptado: listo para conversion.'
              : parsedInternalNotes.estimateStatus?.acceptance.status === 'REJECTED'
                ? 'Rechazado: no convertible hasta nueva revision comercial.'
                : parsedInternalNotes.estimateStatus?.commercialStatus === 'ISSUED_FINAL'
                  ? 'Emitido final: pendiente de aceptacion antes de convertir.'
              : parsedInternalNotes.estimateStatus?.commercialStatus === 'ISSUED_PROVISIONAL'
                ? 'Emitido provisional: requiere emision final antes de conversion o aceptacion final.'
                : 'No emitido: no se considera enviado al cliente y no puede convertirse todavia.'}
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
