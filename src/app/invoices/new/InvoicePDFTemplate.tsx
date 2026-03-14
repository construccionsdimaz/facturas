import styles from './pdf.module.css';

interface InvoiceData {
  number: string;
  issueDate: string;
  dueDate: string;
  clientName: string;
  items: { description: string; quantity: number; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  brandColor: string;
  companyName?: string;
  companyAddress?: string;
  companyTaxId?: string;
}

export default function InvoicePDFTemplate({ data }: { data: InvoiceData }) {
  return (
    <div className={styles.pdfContainer} id="pdf-invoice-template">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.brandDetails}>
          <div className={styles.logo} style={{ backgroundColor: data.brandColor }}>
            {data.companyName ? data.companyName.charAt(0).toUpperCase() : 'NG'}
          </div>
          <div className={styles.companyInfo}>
            <h2 className={styles.companyName}>{data.companyName || 'Next-Gen Solutions'}</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>{data.companyAddress || '123 Innovation Drive\nTech City, TC 90210\ncontact@nextgen.inc'}</p>
            {data.companyTaxId && <p>Tax ID: {data.companyTaxId}</p>}
          </div>
        </div>
        <div className={styles.invoiceMeta}>
          <h1 className={styles.title} style={{ color: data.brandColor }}>INVOICE</h1>
          <div className={styles.metaGrid}>
            <div className={styles.metaLabel}>Invoice No:</div>
            <div className={styles.metaValue}>{data.number}</div>
            
            <div className={styles.metaLabel}>Date:</div>
            <div className={styles.metaValue}>{new Date(data.issueDate).toLocaleDateString()}</div>
            
            <div className={styles.metaLabel}>Due Date:</div>
            <div className={styles.metaValue}>{data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'Upon receipt'}</div>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className={styles.billToSection}>
        <div className={styles.billToHeader} style={{ borderBottomColor: data.brandColor }}>
          Billed To
        </div>
        <div className={styles.clientInfo}>
          <h3 className={styles.clientName}>{data.clientName || 'Client Name'}</h3>
          <p>Client Address</p>
          <p>Client City, ZIP</p>
        </div>
      </div>

      {/* Items Table */}
      <div className={styles.itemsSection}>
        <table className={styles.table}>
          <thead>
            <tr style={{ backgroundColor: data.brandColor }}>
              <th className={styles.colDesc}>Description</th>
              <th className={styles.colQty}>Qty</th>
              <th className={styles.colPrice}>Price</th>
              <th className={styles.colTotal}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                <td className={styles.colDesc}>{item.description || 'Item'}</td>
                <td className={styles.colQty}>{item.quantity}</td>
                <td className={styles.colPrice}>${item.price.toFixed(2)}</td>
                <td className={styles.colTotal}>${(item.quantity * item.price).toFixed(2)}</td>
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
            <span className={styles.summaryValue}>${data.subtotal.toFixed(2)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Tax (21%):</span>
            <span className={styles.summaryValue}>${data.tax.toFixed(2)}</span>
          </div>
          <div className={styles.summaryTotalRow} style={{ color: data.brandColor, borderTopColor: data.brandColor }}>
            <span className={styles.summaryLabel}>Total Due:</span>
            <span className={styles.summaryValue}>${data.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <p>Thank you for your business!</p>
        <p>Payment is due within 30 days. Please make checks payable to {data.companyName || 'Next-Gen Solutions'}.</p>
      </div>
    </div>
  );
}
