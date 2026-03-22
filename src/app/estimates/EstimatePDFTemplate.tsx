import styles from '../invoices/new/pdf.module.css';
import { translations, Language } from '@/lib/translations';
import { formatCurrency } from '@/lib/format';
import React from 'react';
import type { CommercialEstimateRuntimeOutput } from '@/lib/estimate/commercial-estimate-runtime';

interface EstimateData {
  number: string;
  issueDate: string;
  validUntil?: string;
  language?: string;
  clientName: string;
  clientAddress?: string;
  clientTaxId?: string;
  items: { description: string; quantity: number; price: number; unit?: string; chapter?: string }[];
  subtotal: number;
  tax: number;
  total: number;
  brandColor: string;
  companyName?: string;
  companyAddress?: string;
  companyCity?: string;
  companyZip?: string;
  companyProvince?: string;
  companyTaxId?: string;
  companyLogo?: string;
  logoZoom?: number;
  logoX?: number;
  logoY?: number;
  paymentMethod?: string;
  bankAccount?: string;
  dataProtection?: string;
  commercialRuntimeOutput?: CommercialEstimateRuntimeOutput;
  estimateStatus?: {
    estimateMode: 'PARAMETRIC_PRELIMINARY' | 'MIXED' | 'RECIPE_PRICED';
    technicalCoveragePercent: number;
    recipeCoveragePercent: number;
    priceCoveragePercent: number;
    pendingValidationCount: number;
    readiness: 'DRAFT' | 'PARAMETRIC_PRELIMINARY' | 'PROVISIONAL_REVIEW_REQUIRED' | 'COMMERCIAL_READY' | 'TECHNICALLY_CLOSED';
    readinessReasons: string[];
    commercialStatus: 'DRAFT' | 'ISSUED_PROVISIONAL' | 'ISSUED_FINAL' | 'CONVERTED' | 'CANCELLED';
    commercialReasons: string[];
    nextCommercialAction?: string | null;
    acceptance: {
      status: 'NOT_ACCEPTED' | 'ACCEPTED' | 'REJECTED';
      acceptedAt?: string | null;
      acceptedBy?: string | null;
      acceptanceReason?: string | null;
    };
    manualOverride?: {
      applied: boolean;
      reason: string;
      actor: string;
      timestamp: string;
    } | null;
    issuance: {
      status: 'NOT_ISSUED' | 'ISSUED_PROVISIONAL' | 'ISSUED_FINAL';
      issuedAt?: string | null;
      issuedBy?: string | null;
      issuanceReason?: string | null;
      manualOverrideUsed?: boolean;
    };
  };
}

export default function EstimatePDFTemplate({ data }: { data: EstimateData }) {
  const lang = (data.language as Language) || 'ES';
  const t = translations[lang] || translations.ES;
  const locale = lang === 'EN' ? 'en-US' : lang === 'CA' ? 'ca-ES' : 'es-ES';

  const runtimeItems = data.commercialRuntimeOutput?.lines.map((line) => ({
    description: line.description,
    quantity: line.quantity,
    price: (line.commercialPrice ?? 0) / Math.max(line.quantity, 0.0001),
    unit: line.unit,
    chapter: line.chapter,
  }));
  const effectiveItems = runtimeItems?.length ? runtimeItems : data.items;

  // Group items by chapter
  const chaptersMap: { [key: string]: typeof data.items } = {};
  effectiveItems.forEach(item => {
    const ch = item.chapter || '01 GENERAL';
    if (!chaptersMap[ch]) chaptersMap[ch] = [];
    chaptersMap[ch].push(item);
  });
  const chapterNames = Object.keys(chaptersMap).sort();
  const readinessLabel =
    data.estimateStatus?.readiness === 'TECHNICALLY_CLOSED'
      ? 'Tecnicamente cerrado'
      : data.estimateStatus?.readiness === 'COMMERCIAL_READY'
        ? 'Listo para emitir'
        : data.estimateStatus?.readiness === 'PROVISIONAL_REVIEW_REQUIRED'
          ? 'Provisional con revision requerida'
          : data.estimateStatus?.readiness === 'PARAMETRIC_PRELIMINARY'
            ? 'Preliminar parametrico'
            : 'Borrador';
  const issuanceLabel =
    data.estimateStatus?.issuance.status === 'ISSUED_FINAL'
      ? 'Emitido final'
      : data.estimateStatus?.issuance.status === 'ISSUED_PROVISIONAL'
        ? 'Emitido provisional'
        : 'No emitido';
  const commercialLabel =
    data.estimateStatus?.commercialStatus === 'CONVERTED'
      ? 'Convertido'
      : data.estimateStatus?.commercialStatus === 'ISSUED_FINAL'
        ? 'Emitido final'
        : data.estimateStatus?.commercialStatus === 'ISSUED_PROVISIONAL'
          ? 'Emitido provisional'
          : data.estimateStatus?.commercialStatus === 'CANCELLED'
            ? 'Cancelado'
            : 'No emitido';
  const acceptanceLabel =
    data.estimateStatus?.acceptance.status === 'ACCEPTED'
      ? 'Aceptado'
      : data.estimateStatus?.acceptance.status === 'REJECTED'
        ? 'Rechazado'
        : 'No aceptado';

  return (
    <div className={styles.pdfContainer} id="pdf-estimate-template">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.brandDetails}>
          <div className={styles.logo} style={{ backgroundColor: data.brandColor, display: data.companyLogo ? 'none' : 'flex' }}>
            {data.companyName ? data.companyName.charAt(0).toUpperCase() : 'E'}
          </div>
          {data.companyLogo && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ width: '100%', maxWidth: '500px', maxHeight: '200px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img 
                  src={data.companyLogo} 
                  alt="Logo" 
                  style={{ 
                    width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%',
                    transform: `scale(${data.logoZoom || 1}) translate(${data.logoX || 0}px, ${data.logoY || 0}px)`, 
                    transformOrigin: 'center', objectFit: 'contain' 
                  }} 
                />
              </div>
            </div>
          )}
        </div>
        <div className={styles.invoiceMeta}>
          <h1 className={styles.title}>{t.estimate}</h1>
          <div className={styles.metaGrid}>
            <div className={styles.metaLabel}>{t.estimateNumber}:</div>
            <div className={styles.metaValue}>{data.number}</div>
            
            <div className={styles.metaLabel}>{t.date}:</div>
            <div className={styles.metaValue}>{new Date(data.issueDate).toLocaleDateString(locale)}</div>
            
            <div className={styles.metaLabel}>{t.validUntil}:</div>
            <div className={styles.metaValue}>{data.validUntil ? new Date(data.validUntil).toLocaleDateString(locale) : `30 ${lang === 'EN' ? 'days' : 'días'}`}</div>
          </div>
        </div>
      </div>

      <div className={styles.detailsRow}>
        <div className={styles.detailsBlock}>
          <div className={styles.companyInfo}>
            <h2 className={styles.companyName}>{data.companyName || 'Mi Empresa'}</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>
              {data.companyAddress && `${data.companyAddress}`}
              {(data.companyZip || data.companyCity) && `\n${[data.companyZip, data.companyCity].filter(Boolean).join(' ')}`}
              {data.companyProvince && `, ${data.companyProvince}`}
            </p>
            {data.companyTaxId && <p>NIF/CIF: {data.companyTaxId}</p>}
          </div>
        </div>
        <div className={styles.detailsBlock}>
          <div className={styles.billToHeader} style={{ borderBottomColor: data.brandColor }}>
            {t.estimateTo}
          </div>
          <div className={styles.clientInfo}>
            <h3 className={styles.clientName}>{data.clientName || 'Nombre del Cliente'}</h3>
            {data.clientAddress && <p style={{ whiteSpace: 'pre-wrap' }}>{data.clientAddress}</p>}
            {data.clientTaxId && <p>NIF/CIF: {data.clientTaxId}</p>}
          </div>
        </div>
      </div>

      {data.estimateStatus && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid #f59e0b',
            background: '#fff7ed',
            color: '#9a3412',
            fontSize: '12px',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>
            Estado comercial: {commercialLabel} | Emision: {issuanceLabel} | Aceptacion: {acceptanceLabel} | Readiness: {readinessLabel} | Estado tecnico: {data.estimateStatus.estimateMode}
          </div>
          <div>
            Cobertura tecnica {data.estimateStatus.technicalCoveragePercent}% | Receta {data.estimateStatus.recipeCoveragePercent}% | Precio {data.estimateStatus.priceCoveragePercent}% | Lineas pendientes {data.estimateStatus.pendingValidationCount}
          </div>
          {data.estimateStatus.readinessReasons?.length > 0 && (
            <div style={{ marginTop: '6px' }}>
              {data.estimateStatus.readinessReasons.join(' | ')}
            </div>
          )}
          {data.estimateStatus.commercialReasons?.length > 0 && (
            <div style={{ marginTop: '6px' }}>
              {data.estimateStatus.commercialReasons.join(' | ')}
            </div>
          )}
          {data.estimateStatus.nextCommercialAction && (
            <div style={{ marginTop: '6px', fontWeight: 600 }}>
              Siguiente paso: {data.estimateStatus.nextCommercialAction}
            </div>
          )}
          {data.estimateStatus.estimateMode === 'PARAMETRIC_PRELIMINARY' && (
            <div style={{ marginTop: '6px', fontWeight: 600 }}>
              Documento preliminar parametrico. No debe tratarse como presupuesto tecnico final cerrado.
            </div>
          )}
          {data.estimateStatus.manualOverride?.applied && (
            <div style={{ marginTop: '6px', fontWeight: 600 }}>
              Override manual registrado: {data.estimateStatus.manualOverride.reason}
            </div>
          )}
          {data.estimateStatus.issuance.status === 'ISSUED_PROVISIONAL' && (
            <div style={{ marginTop: '6px', fontWeight: 700 }}>
              Documento emitido como provisional. No debe tratarse como cierre final.
            </div>
          )}
          {data.estimateStatus.acceptance.status === 'ACCEPTED' && (
            <div style={{ marginTop: '6px', fontWeight: 700 }}>
              Presupuesto aceptado. Listo para conversion comercial.
            </div>
          )}
          {data.estimateStatus.acceptance.status === 'REJECTED' && (
            <div style={{ marginTop: '6px', fontWeight: 700 }}>
              Presupuesto rechazado. No debe tratarse como convertible hasta nueva revision.
            </div>
          )}
          {data.estimateStatus.issuance.status !== 'NOT_ISSUED' && (
            <div style={{ marginTop: '6px' }}>
              Emitido por {data.estimateStatus.issuance.issuedBy || 'Usuario actual'}
              {data.estimateStatus.issuance.issuedAt ? ` el ${data.estimateStatus.issuance.issuedAt}` : ''}
              {data.estimateStatus.issuance.issuanceReason ? ` | Motivo: ${data.estimateStatus.issuance.issuanceReason}` : ''}
              {data.estimateStatus.issuance.manualOverrideUsed ? ' | Con override' : ''}
            </div>
          )}
          {data.estimateStatus.acceptance.status !== 'NOT_ACCEPTED' && (
            <div style={{ marginTop: '6px' }}>
              {data.estimateStatus.acceptance.status === 'ACCEPTED' ? 'Aceptado por' : 'Registrado por'}
              {` ${data.estimateStatus.acceptance.acceptedBy || 'Usuario actual'}`}
              {data.estimateStatus.acceptance.acceptedAt ? ` el ${data.estimateStatus.acceptance.acceptedAt}` : ''}
              {data.estimateStatus.acceptance.acceptanceReason ? ` | Motivo: ${data.estimateStatus.acceptance.acceptanceReason}` : ''}
            </div>
          )}
          {data.commercialRuntimeOutput && (
            <div style={{ marginTop: '6px' }}>
              Fuente comercial runtime: {data.commercialRuntimeOutput.source}
            </div>
          )}
        </div>
      )}

      {/* Structured Items Table */}
      <div className={styles.itemsSection}>
        <table className={styles.table}>
          <thead>
            <tr style={{ backgroundColor: data.brandColor }}>
              <th className={styles.colDesc}>{t.description}</th>
              <th style={{ width: '60px', color: 'white', fontSize: '11px', textAlign: 'center' }}>Ud.</th>
              <th className={styles.colQty}>{t.quantity}</th>
              <th className={styles.colPrice}>{t.price}</th>
              <th className={styles.colTotal}>{t.total}</th>
            </tr>
          </thead>
          <tbody>
            {chapterNames.map((chName) => {
              const chItems = chaptersMap[chName];
              const chSubtotal = chItems.reduce((s, i) => s + (i.quantity * i.price), 0);
              
              return (
                <React.Fragment key={chName}>
                  {/* Chapter Header */}
                  <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', fontWeight: 'bold' }}>
                    <td colSpan={5} style={{ padding: '8px 12px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                      {chName}
                    </td>
                  </tr>
                  {/* Items */}
                  {chItems.map((item, index) => (
                    <tr key={index} className={styles.rowItem}>
                      <td className={styles.colDesc} style={{ whiteSpace: 'pre-wrap', paddingLeft: '20px' }}>
                        {item.description || t.concept}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '10px', color: '#666' }}>{item.unit || 'ud'}</td>
                      <td className={styles.colQty}>{item.quantity}</td>
                      <td className={styles.colPrice}>{formatCurrency(item.price)}</td>
                      <td className={styles.colTotal}>{formatCurrency(item.quantity * item.price)}</td>
                    </tr>
                  ))}
                  {/* Chapter Subtotal row */}
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'right', padding: '6px 12px', fontSize: '10px', fontStyle: 'italic', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      Subtotal {chName}:
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 12px', fontWeight: 'bold', fontSize: '11px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      {formatCurrency(chSubtotal)}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.summarySection}>
        <div className={styles.summaryBox}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Total Ejecución Material:</span>
            <span className={styles.summaryValue}>{formatCurrency(data.subtotal)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>{t.tax} (21%):</span>
            <span className={styles.summaryValue}>{formatCurrency(data.tax)}</span>
          </div>
          <div className={styles.summaryTotalRow} style={{ color: data.brandColor, borderTopColor: data.brandColor }}>
            <span className={styles.summaryLabel}>TOTAL PRESUPUESTO:</span>
            <span className={styles.summaryValue}>{formatCurrency(data.total)}</span>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.paymentInfo}>
          {data.paymentMethod && <p><strong>{t.paymentMethod}:</strong> {data.paymentMethod}</p>}
          {data.bankAccount && <p><strong>{t.bankAccount}:</strong> {data.bankAccount}</p>}
        </div>
        {data.dataProtection && <div className={styles.gdpr}>{data.dataProtection}</div>}
        <div className={styles.thanks}>{t.thanks}</div>
      </div>
    </div>
  );
}
