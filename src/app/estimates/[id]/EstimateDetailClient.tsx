"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmationModal from '@/components/ConfirmationModal';

interface EstimateData {
  id: string;
  number: string;
  issueDate: string;
  status: string;
  clientName: string;
  clientAddress: string;
  clientTaxId: string;
  items: { description: string; quantity: number; price: number }[];
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

      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
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
