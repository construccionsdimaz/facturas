"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import EstimatePDFTemplate from '@/app/estimates/EstimatePDFTemplate';
import styles from '@/app/invoices/new/pdf.module.css';

export default function PrintEstimatePage() {
  const params = useParams();
  const [estimate, setEstimate] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id;
    if (!id) return;

    Promise.all([
      fetch(`/api/estimates/${id}`).then(r => r.json()),
      fetch('/api/settings').then(r => r.json())
    ]).then(([estimateData, settingsData]) => {
      setEstimate(estimateData);
      setSettings(settingsData);
      setLoading(false);
    }).catch(err => {
      console.error("Error loading print data", err);
      setLoading(false);
    });
  }, [params]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', background: 'white', color: 'black', minHeight: '100vh' }}>Cargando presupuesto para imprimir...</div>;
  if (!estimate) return <div style={{ padding: '40px', textAlign: 'center', background: 'white', color: 'black', minHeight: '100vh' }}>Presupuesto no encontrado.</div>;

  return (
    <div className="print-root" style={{ background: 'white' }}>
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
          onClick={() => window.print()}
          className="btn-primary"
          style={{ padding: '12px 32px', fontSize: '16px' }}
        >
          🖨️ Confirmar e Imprimir Presupuesto
        </button>
      </div>
      <div className={styles.printWrapper}>
        <EstimatePDFTemplate data={{
          number: estimate.number,
          issueDate: estimate.issueDate || new Date().toISOString(),
          validUntil: estimate.validUntil,
          language: estimate.language,
          clientName: estimate.client?.name || '',
          clientAddress: estimate.client?.address || '',
          clientTaxId: estimate.client?.taxId || '',
          items: estimate.items || [],
          subtotal: estimate.subtotal || 0,
          tax: estimate.taxAmount || 0,
          total: estimate.total || 0,
          brandColor: '#8b5cf6',
          companyName: settings?.companyName || estimate.user?.companyName,
          companyAddress: settings?.companyAddress || estimate.user?.companyAddress,
          companyCity: settings?.companyCity || estimate.user?.companyCity,
          companyZip: settings?.companyZip || estimate.user?.companyZip,
          companyProvince: settings?.companyProvince || estimate.user?.companyProvince,
          companyTaxId: settings?.companyTaxId || estimate.user?.companyTaxId,
          companyLogo: settings?.companyLogo || estimate.user?.companyLogo,
          logoZoom: settings?.logoZoom,
          logoX: settings?.logoX,
          logoY: settings?.logoY,
          paymentMethod: settings?.paymentMethod,
          bankAccount: settings?.bankAccount,
          dataProtection: settings?.dataProtection
        }} />
      </div>
    </div>
  );
}
