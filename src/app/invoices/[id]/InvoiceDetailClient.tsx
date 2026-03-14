"use client";

import { useRef, useState } from 'react';
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
      pdfRef.current.style.position = 'static';
      pdfRef.current.style.top = '0';
      pdfRef.current.style.left = '0';

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4',
      });

      await pdf.html(pdfRef.current, {
        callback: function (doc) {
          doc.save(`${invoice.number}.pdf`);
        },
        x: 0,
        y: 0,
        width: 800,
        windowWidth: 800
      });

      pdfRef.current.style.position = 'absolute';
      pdfRef.current.style.top = '-9999px';
      pdfRef.current.style.left = '-9999px';
    } catch (error) {
      console.error("Error generating PDF", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div ref={pdfRef} style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
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
      <button
        className="btn-primary"
        onClick={handleDownload}
        disabled={isGenerating}
        style={{ padding: '8px 20px' }}
      >
        {isGenerating ? 'Generando...' : '📄 Descargar PDF'}
      </button>
    </>
  );
}
