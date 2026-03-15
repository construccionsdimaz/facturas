"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import InvoicePDFTemplate from '../../new/InvoicePDFTemplate';
import styles from '../../new/pdf.module.css';

export default function PrintInvoicePage() {
  const params = useParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id;
    if (!id) return;

    // Load invoice and settings
    Promise.all([
      fetch(`/api/invoices/${id}`).then(r => r.json()),
      fetch('/api/settings').then(r => r.json())
    ]).then(([invoiceData, settingsData]) => {
      setInvoice(invoiceData);
      setSettings(settingsData);
      setLoading(false);
    }).catch(err => {
      console.error("Error loading print data", err);
      setLoading(false);
    });
  }, [params]);

  const handleManualPrint = () => {
    window.print();
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', background: 'white', color: 'black', minHeight: '100vh' }}>Cargando factura para imprimir...</div>;
  if (!invoice) return <div style={{ padding: '40px', textAlign: 'center', background: 'white', color: 'black', minHeight: '100vh' }}>Factura no encontrada.</div>;

  return (
    <div style={{ background: 'white', minHeight: '100vh' }}>
      <div className="no-print" style={{ 
        padding: '20px', 
        background: '#f8fafc', 
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <button 
          onClick={handleManualPrint}
          className="btn-primary"
          style={{ padding: '12px 32px', fontSize: '16px' }}
        >
          🖨️ Confirmar e Imprimir Factura
        </button>
      </div>
      <div className={styles.printWrapper}>
        <InvoicePDFTemplate data={{
          number: invoice.number,
          issueDate: invoice.createdAt || new Date().toISOString(),
          dueDate: invoice.dueDate || '',
          clientName: invoice.client?.name || '',
          clientAddress: invoice.client?.address || '',
          clientTaxId: invoice.client?.taxId || '',
          items: invoice.items || [],
          subtotal: invoice.subtotal || 0,
          tax: invoice.taxAmount || 0,
          total: invoice.total || 0,
          brandColor: invoice.brandColor || '#00509d',
          companyName: settings?.companyName || invoice.companyName,
          companyAddress: settings?.companyAddress || invoice.companyAddress,
          companyTaxId: settings?.companyTaxId || invoice.companyTaxId,
          companyLogo: settings?.companyLogo || invoice.companyLogo,
          logoZoom: settings?.logoZoom,
          logoX: settings?.logoX,
          logoY: settings?.logoY,
          paymentMethod: invoice.paymentMethod || settings?.paymentMethod,
          bankAccount: settings?.bankAccount,
          dataProtection: settings?.dataProtection
        }} />
      </div>
    </div>
  );
}
