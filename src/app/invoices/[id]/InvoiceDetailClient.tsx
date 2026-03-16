"use client";

import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import InvoicePDFTemplate from '../new/InvoicePDFTemplate';

interface InvoiceData {
  id: string;
  number: string;
  issueDate: string;
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

export default function InvoiceDetailClient({ invoice }: { invoice: InvoiceData }) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePrint = () => {
    window.open(`/invoices/${invoice.id}/print`, '_blank');
  };

  return (
    <div>
      <button
        className="btn-primary no-print"
        onClick={handlePrint}
        style={{ padding: '8px 20px', marginBottom: '24px' }}
      >
        📄 Imprimir / Descargar PDF
      </button>

      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          La factura se ha generado correctamente. Puedes verla, descargarla o imprimirla usando el botón de arriba.
        </p>
      </div>
    </div>
  );
}
