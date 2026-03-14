"use client";

import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import InvoicePDFTemplate from '../new/InvoicePDFTemplate';

interface InvoiceData {
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
  companyTaxId: string;
  companyLogo: string;
  paymentMethod: string;
  bankAccount: string;
  dataProtection: string;
}

export default function InvoiceDetailClient({ invoice }: { invoice: InvoiceData }) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    if (!pdfRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${invoice.number}.pdf`);
    } catch (error) {
      console.error("Error generating PDF", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <button
        className="btn-primary"
        onClick={handleDownload}
        disabled={isGenerating}
        style={{ padding: '8px 20px', marginBottom: '24px' }}
      >
        {isGenerating ? 'Generando...' : '📄 Descargar PDF'}
      </button>

      {/* Visible Preview Container */}
      <div style={{ 
        marginTop: '24px',
        padding: '24px',
        background: 'rgba(0,0,0,0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'center',
        overflowX: 'auto'
      }}>
        {/* The "Paper" sheet */}
        <div 
          ref={pdfRef} 
          style={{ 
            width: '800px', 
            background: 'white', 
            boxShadow: '0 0 20px rgba(0,0,0,0.5)',
            flexShrink: 0,
            transform: 'scale(0.8)', /* Scaled down for screen comfort */
            transformOrigin: 'top center',
            marginBottom: '-160px' /* Compiling for scale reduction height gap */
          }}
        >
          <InvoicePDFTemplate data={{
            number: invoice.number,
            issueDate: invoice.issueDate,
            dueDate: '',
            clientName: invoice.clientName,
            clientAddress: invoice.clientAddress,
            clientTaxId: invoice.clientTaxId,
            items: invoice.items,
            subtotal: invoice.subtotal,
            tax: invoice.tax,
            total: invoice.total,
            brandColor: '#3b82f6',
            companyName: invoice.companyName,
            companyAddress: invoice.companyAddress,
            companyTaxId: invoice.companyTaxId,
            companyLogo: invoice.companyLogo,
            paymentMethod: invoice.paymentMethod,
            bankAccount: invoice.bankAccount,
            dataProtection: invoice.dataProtection,
          }} />
        </div>
      </div>
    </div>
  );
}
