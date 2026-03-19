import styles from '../invoices/new/pdf.module.css';
import { translations, Language } from '@/lib/translations';
import { formatCurrency } from '@/lib/format';
import React from 'react';

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
}

export default function EstimatePDFTemplate({ data }: { data: EstimateData }) {
  const lang = (data.language as Language) || 'ES';
  const t = translations[lang] || translations.ES;
  const locale = lang === 'EN' ? 'en-US' : lang === 'CA' ? 'ca-ES' : 'es-ES';

  // Group items by chapter
  const chaptersMap: { [key: string]: typeof data.items } = {};
  data.items.forEach(item => {
    const ch = item.chapter || '01 GENERAL';
    if (!chaptersMap[ch]) chaptersMap[ch] = [];
    chaptersMap[ch].push(item);
  });
  const chapterNames = Object.keys(chaptersMap).sort();

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
