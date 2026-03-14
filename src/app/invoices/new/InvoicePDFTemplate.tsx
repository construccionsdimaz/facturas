import styles from './pdf.module.css';

interface InvoiceData {
  number: string;
  issueDate: string;
  dueDate: string;
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
  companyTaxId?: string;
  companyLogo?: string;
  paymentMethod?: string;
  bankAccount?: string;
  dataProtection?: string;
}

export default function InvoicePDFTemplate({ data }: { data: InvoiceData }) {
  return (
    <div className={styles.pdfContainer} id="pdf-invoice-template">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.brandDetails}>
          <div className={styles.logo} style={{ backgroundColor: data.brandColor, display: data.companyLogo ? 'none' : 'flex' }}>
            {data.companyName ? data.companyName.charAt(0).toUpperCase() : 'E'}
          </div>
          {data.companyLogo && (
            <div style={{ marginBottom: '20px' }}>
              <img src={data.companyLogo} alt="Logo" style={{ maxWidth: '320px', maxHeight: '140px', objectFit: 'contain' }} />
            </div>
          )}
          <div className={styles.companyInfo}>
            <h2 className={styles.companyName}>{data.companyName || 'Mi Empresa'}</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>{data.companyAddress || ''}</p>
            {data.companyTaxId && <p>NIF/CIF: {data.companyTaxId}</p>}
          </div>
        </div>
        <div className={styles.invoiceMeta}>
          <h1 className={styles.title}>FACTURA</h1>
          <div className={styles.metaGrid}>
            <div className={styles.metaLabel}>Nº Factura:</div>
            <div className={styles.metaValue}>{data.number}</div>
            
            <div className={styles.metaLabel}>Fecha:</div>
            <div className={styles.metaValue}>{new Date(data.issueDate).toLocaleDateString('es-ES')}</div>
            
            <div className={styles.metaLabel}>Vencimiento:</div>
            <div className={styles.metaValue}>{data.dueDate ? new Date(data.dueDate).toLocaleDateString('es-ES') : 'A la recepción'}</div>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className={styles.billToSection}>
        <div className={styles.billToHeader} style={{ borderBottomColor: data.brandColor }}>
          Facturado a
        </div>
        <div className={styles.clientInfo}>
          <h3 className={styles.clientName}>{data.clientName || 'Nombre del Cliente'}</h3>
          {data.clientAddress && <p style={{ whiteSpace: 'pre-wrap' }}>{data.clientAddress}</p>}
          {data.clientTaxId && <p>NIF/CIF: {data.clientTaxId}</p>}
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
            <p><strong>Forma de pago:</strong> {data.paymentMethod}</p>
          )}
          {data.bankAccount && (
            <p><strong>Cuenta de abono:</strong> {data.bankAccount}</p>
          )}
        </div>
        
        {data.dataProtection && (
          <div className={styles.gdpr}>
            {data.dataProtection}
          </div>
        )}

        <div className={styles.thanks}>
          ¡Gracias por su confianza!
        </div>
        <div className={styles.footerSmall}>
          El pago se realizará en un plazo de 30 días. Para cualquier consulta, contacte con {data.companyName || 'nosotros'}.
        </div>
      </div>
    </div>
  );
}
