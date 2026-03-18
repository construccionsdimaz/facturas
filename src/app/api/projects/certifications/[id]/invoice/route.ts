import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: certificationId } = await params;

    // 1. Fetch certification details
    // @ts-ignore - Prisma types might be out of sync
    const cert = await db.projectCertification.findUnique({
      where: { id: certificationId },
      include: {
        project: {
          include: {
            client: true
          }
        }
      }
    });

    if (!cert) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
    }

    if (cert.invoiceId) {
      return NextResponse.json({ error: 'Certification already invoiced' }, { status: 400 });
    }

    // 2. Generate a new invoice number
    // We'll use a simple logic: get the last invoice number and increment it
    // In a real app, this should be more robust
    const lastInvoice = await db.invoice.findFirst({
      orderBy: { number: 'desc' }
    });

    let nextNumber = 'F-001';
    if (lastInvoice && lastInvoice.number.startsWith('F-')) {
      const currentNum = parseInt(lastInvoice.number.split('-')[1]);
      nextNumber = `F-${(currentNum + 1).toString().padStart(3, '0')}`;
    }

    // 3. Create invoice with items in a transaction
    const invoice = await db.$transaction(async (tx) => {
      // Create the invoice
      const newInvoice = await tx.invoice.create({
        data: {
          number: nextNumber,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          status: 'PENDING',
          clientId: cert.project.clientId,
          projectId: cert.projectId,
          userId: (cert.project as any).userId,
          total: cert.netAmount,
          items: {
            create: [
              {
                description: `Certificación nº ${cert.number} - ${cert.period} - ${cert.project.name}`,
                price: cert.totalAmount
              },
              {
                description: `Retención de Garantía (5%)`,
                price: -cert.retentionAmount
              }
            ]
          }
        },
        include: {
            client: true,
            project: true,
            items: true
        }
      });

      // Link certification to invoice
      // @ts-ignore - Prisma types might be out of sync
      await tx.projectCertification.update({
        where: { id: certificationId },
        data: { 
            invoiceId: newInvoice.id,
            status: 'ISSUED' // Update status to issued when invoiced
        }
      });

      return newInvoice;
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error generating invoice from certification:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
