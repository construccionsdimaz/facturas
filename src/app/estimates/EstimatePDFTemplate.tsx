import styles from '../invoices/new/pdf.module.css';

interface EstimateData {
  number: string;
  issueDate: string;
  validUntil?: string;
  clientName: string;
  clientAddress?: string;
  clientTaxId?: string;
  items: { description: string; quantity: number; price: number }[];
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
  return (
    <div className={styles.pdfContainer} id="pdf-estimate-template">
      {/* Header: Logo+Company left, PRESUPUESTO+meta right */}
      <div className={styles.header}>
        <div className={styles.brandDetails}>
          <div className={styles.logo} style={{ backgroundColor: data.brandColor, display: data.companyLogo ? 'none' : 'flex' }}>
            {data.companyName ? data.companyName.charAt(0).toUpperCase() : 'E'}
          </div>
          {data.companyLogo && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ 
                width: '100%', 
                maxWidth: '500px',
                maxHeight: '200px',
                overflow: 'hidden', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <img 
                  src={data.companyLogo} 
                  alt="Logo" 
                  style={{ 
                    width: 'auto', 
                    height: 'auto', 
                    maxWidth: '100%',
                    maxHeight: '100%',
                    transform: `scale(${data.logoZoom || 1}) translate(${data.logoX || 0}px, ${data.logoY || 0}px)`, 
                    transformOrigin: 'center',
                    objectFit: 'contain' 
                  }} 
                />
              </div>
            </div>
          )}
        </div>
        <div className={styles.invoiceMeta}>
          <h1 className={styles.title}>PRESUPUESTO</h1>
          <div className={styles.metaGrid}>
            <div className={styles.metaLabel}>Nº Presupuesto:</div>
            <div className={styles.metaValue}>{data.number}</div>
            
            <div className={styles.metaLabel}>Fecha:</div>
            <div className={styles.metaValue}>{new Date(data.issueDate).toLocaleDateString('es-ES')}</div>
            
            <div className={styles.metaLabel}>Válido hasta:</div>
            <div className={styles.metaValue}>{data.validUntil ? new Date(data.validUntil).toLocaleDateString('es-ES') : '30 días'}</div>
          </div>
        </div>
      </div>

      {/* Company details + Client details side by side */}
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
            Presupuesto para
          </div>
          <div className={styles.clientInfo}>
            <h3 className={styles.clientName}>{data.clientName || 'Nombre del Cliente'}</h3>
            {data.clientAddress && <p style={{ whiteSpace: 'pre-wrap' }}>{data.clientAddress}</p>}
            {data.clientTaxId && <p>NIF/CIF: {data.clientTaxId}</p>}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className={styles.itemsSection}>
        <table className={styles.table}>
          <thead>
            <tr style={{ backgroundColor: data.brandColor }}>
              <th className={styles.colDesc}>Descripción</th>
              <th className={styles.colQty}>Cant.</th>
              <th className={styles.colPrice}>Precio</th>
              <th className={styles.colTotal}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                <td className={styles.colDesc}>{item.description || 'Concepto'}</td>
                <td className={styles.colQty}>{item.quantity}</td>
                <td className={styles.colPrice}>{item.price.toFixed(2)} €</td>
                <td className={styles.colTotal}>{(item.quantity * item.price).toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className={styles.summarySection}>
        <div className={styles.summaryBox}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Subtotal:</span>
            <span className={styles.summaryValue}>{data.subtotal.toFixed(2)} €</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>IVA (21%):</span>
            <span className={styles.summaryValue}>{data.tax.toFixed(2)} €</span>
          </div>
          <div className={styles.summaryTotalRow} style={{ color: data.brandColor, borderTopColor: data.brandColor }}>
            <span className={styles.summaryLabel}>Total:</span>
            <span className={styles.summaryValue}>{data.total.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* Footer / Legal */}
      <div className={styles.footer}>
        <div className={styles.paymentInfo}>
          {data.paymentMethod && (
            <p><strong>Forma de pago propuesta:</strong> {data.paymentMethod}</p>
          )}
          {data.bankAccount && (
            <p><strong>Cuenta para abono:</strong> {data.bankAccount}</p>
          )}
        </div>
        
        {data.dataProtection && (
          <div className={styles.gdpr}>
            {data.dataProtection}
          </div>
        )}

        <div className={styles.thanks}>
          Quedamos a su entera disposición para cualquier duda.
        </div>
      </div>
    </div>
  );
}
