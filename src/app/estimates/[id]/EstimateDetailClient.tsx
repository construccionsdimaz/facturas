"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmationModal from '@/components/ConfirmationModal';
import { formatCurrency } from '@/lib/format';

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
