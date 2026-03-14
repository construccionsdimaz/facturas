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

      {/* Visible Preview */}
      <div style={{ 
        marginTop: '16px',
        borderRadius: '12px',
        overflow: 'auto',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        background: '#e5e7eb',
        padding: '32px',
        maxHeight: '80vh',
      }}>
        <div style={{
          margin: '0 auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <div ref={pdfRef}>
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
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
