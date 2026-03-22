import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import styles from "../../invoices/[id]/page.module.css";
import Link from "next/link";
import EstimateDetailClient from "@/app/estimates/[id]/EstimateDetailClient";
import { parseGenerationNotes } from "@/lib/estimate/estimate-status";

export const dynamic = 'force-dynamic';

export default async function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const estimate = await db.estimate.findUnique({
    where: { id },
    include: {
      client: true,
      items: true,
      user: true,
      internalAnalysis: {
        include: {
          lines: true,
        },
      },
    }
  });

  if (!estimate) return notFound();

  const parsedGenerationNotes = estimate.internalAnalysis
    ? parseGenerationNotes(estimate.internalAnalysis.generationNotes)
    : { notes: [], estimateStatus: null, integratedCostBuckets: [] };
  const commercialStatus = parsedGenerationNotes.estimateStatus?.commercialStatus;

  const statusLabels: Record<string, string> = {
    DRAFT: 'Borrador',
    SENT: 'Enviado',
    ACCEPTED: 'Aceptado',
    REJECTED: 'Rechazado',
    CONVERTED: 'Convertido',
  };

  const commercialStatusLabels: Record<string, string> = {
    DRAFT: 'No emitido',
    ISSUED_PROVISIONAL: 'Emitido provisional',
    ISSUED_FINAL: 'Emitido final',
    CONVERTED: 'Convertido',
    CANCELLED: 'Cancelado',
  };

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'warning';
      case 'SENT': return 'info';
      case 'ACCEPTED': return 'success';
      case 'REJECTED': return 'danger';
      case 'CONVERTED': return 'success';
      default: return 'warning';
    }
  };

  return (
    <div className={styles.detailPage}>
      <div className={styles.header}>
        <div>
          <Link href="/estimates" className={styles.backLink + " no-print"}>← Volver a Presupuestos</Link>
          <h1 className="text-gradient">Presupuesto {estimate.number}</h1>
        </div>
        <div className={styles.actions + " no-print"}>
          <span className={`badge badge-${statusBadgeClass(commercialStatus === 'CONVERTED' ? 'CONVERTED' : estimate.status)}`}
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            {commercialStatusLabels[commercialStatus || ''] || statusLabels[estimate.status] || estimate.status}
          </span>
          {estimate.status === 'DRAFT' && (
            <Link href={`/estimates/${id}/edit`}>
              <button className="btn-secondary" style={{ padding: '8px 20px' }}>
                ✏️ Editar
              </button>
            </Link>
          )}
        </div>
      </div>

      <div className={styles.grid + " no-print"}>
        <div className={`glass-panel ${styles.card}`}>
          <h3>Datos del Presupuesto</h3>
          <div className={styles.infoGrid}>
            <div>
              <span className={styles.label}>Nº Presupuesto</span>
              <span className={styles.value}>{estimate.number}</span>
            </div>
            <div>
              <span className={styles.label}>Fecha Emisión</span>
              <span className={styles.value}>{new Date(estimate.issueDate).toLocaleDateString('es-ES')}</span>
            </div>
            <div>
              <span className={styles.label}>Total</span>
              <span className={styles.value} style={{ fontSize: '24px', fontWeight: 700 }}>
                {estimate.total.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>

        <div className={`glass-panel ${styles.card}`}>
          <h3>Cliente</h3>
          <div className={styles.infoGrid}>
            <div>
              <span className={styles.label}>Nombre / Razón Social</span>
              <span className={styles.value}>{estimate.client.name}</span>
            </div>
            {estimate.client.taxId && (
              <div>
                <span className={styles.label}>DNI / NIE / CIF</span>
                <span className={styles.value}>{estimate.client.taxId}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <EstimateDetailClient estimate={{
        id: estimate.id,
        number: estimate.number,
        issueDate: estimate.issueDate.toISOString(),
        status: estimate.status,
        clientName: estimate.client.name,
        clientAddress: estimate.client.address || '',
        clientTaxId: estimate.client.taxId || '',
        items: estimate.items.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          unit: item.unit || 'ud',
          chapter: item.chapter || '01 GENERAL'
        })),
        subtotal: estimate.subtotal,
        tax: estimate.taxAmount,
        total: estimate.total,
        companyName: estimate.user?.companyName || '',
        companyAddress: estimate.user?.companyAddress || '',
        companyCity: estimate.user?.companyCity || '',
        companyZip: estimate.user?.companyZip || '',
        companyProvince: estimate.user?.companyProvince || '',
        companyTaxId: estimate.user?.companyTaxId || '',
        companyLogo: estimate.user?.companyLogo || '',
        logoZoom: estimate.user?.logoZoom || 1,
        logoX: estimate.user?.logoX || 0,
        logoY: estimate.user?.logoY || 0,
        paymentMethod: estimate.user?.paymentMethod || '',
        bankAccount: estimate.user?.bankAccount || '',
        dataProtection: estimate.user?.dataProtection || '',
        internalAnalysis: estimate.internalAnalysis ? {
          generationSource: estimate.internalAnalysis.generationSource,
          typologyCode: estimate.internalAnalysis.typologyCode,
          seedVersion: estimate.internalAnalysis.seedVersion,
          generationNotes: estimate.internalAnalysis.generationNotes,
          summary: {
            materialCostTotal: estimate.internalAnalysis.materialCostTotal,
            laborCostTotal: estimate.internalAnalysis.laborCostTotal,
            associatedCostTotal: estimate.internalAnalysis.associatedCostTotal,
            internalCostTotal: estimate.internalAnalysis.internalCostTotal,
            contingencyAmount: estimate.internalAnalysis.contingencyAmount,
            marginAmount: estimate.internalAnalysis.marginAmount,
            commercialSubtotal: estimate.internalAnalysis.commercialSubtotal,
            vatAmount: estimate.internalAnalysis.vatAmount,
            commercialTotal: estimate.internalAnalysis.commercialTotal,
          },
          lines: estimate.internalAnalysis.lines.map((line: any) => ({
            chapter: line.chapter,
            code: line.code,
            description: line.description,
            quantity: line.quantity,
            unit: line.unit,
            lineKind: line.lineKind,
            materialCost: line.materialCost,
            laborHours: line.laborHours,
            laborCost: line.laborCost,
            associatedCost: line.associatedCost,
            internalCost: line.internalCost,
            commercialPrice: line.commercialPrice,
            generationSource: line.generationSource,
            typologyCode: line.typologyCode,
            standardActivityCode: line.standardActivityCode,
            productivityRateName: line.productivityRateName,
            appliedAssumptions: line.appliedAssumptions,
          })),
        } : null,
      }} />
    </div>
  );
}
