import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  assertEstimateCanConvert,
  parseGenerationNotes,
  serializeGenerationNotes,
} from '@/lib/estimate/estimate-status';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 1. Fetch the estimate
    const estimate = await db.estimate.findUnique({
      where: { id },
      include: {
        items: true,
        internalAnalysis: true,
      },
    });

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    if (estimate.status === 'CONVERTED') {
      return NextResponse.json({ error: 'Estimate already converted to invoice' }, { status: 400 });
    }

    if (!estimate.internalAnalysis) {
      return NextResponse.json(
        { error: 'El estimate no tiene analisis interno para gobernar su conversion.' },
        { status: 400 }
      );
    }

    const parsed = parseGenerationNotes(estimate.internalAnalysis.generationNotes);
    if (!parsed.estimateStatus) {
      return NextResponse.json(
        { error: 'No existe estimateStatus persistido para validar la conversion.' },
        { status: 400 }
      );
    }

    try {
      assertEstimateCanConvert(parsed.estimateStatus);
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'El estimate no puede convertirse todavia.' },
        { status: 400 }
      );
    }

    // 2. Determine next invoice number
    const lastInvoice = await db.invoice.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    
    let nextNumber = '001';
    if (lastInvoice) {
      const lastNumString = lastInvoice.number;
      const match = lastNumString.match(/(\d+)(?!.*\d)/); // Finds the last group of digits
      
      if (match) {
        const fullMatch = match[0];
        const numValue = parseInt(fullMatch);
        const nextValue = (numValue + 1).toString().padStart(fullMatch.length, '0');
        nextNumber = lastNumString.substring(0, match.index) + nextValue + lastNumString.substring(match.index! + fullMatch.length);
      } else {
        // Fallback if no numbers found
        nextNumber = lastNumString + '-1';
      }
    } else {
      // Fallback if no invoices exist
      nextNumber = '001';
    }

    // 3. Create the invoice
    const newInvoice = await db.invoice.create({
      data: {
        number: nextNumber,
        userId: estimate.userId,
        clientId: estimate.clientId,
        subtotal: estimate.subtotal,
        taxAmount: estimate.taxAmount,
        total: estimate.total,
        status: 'PENDING',
        items: {
          create: estimate.items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
    });

    // 4. Mark estimate as converted and link to invoice
    await db.estimate.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        invoiceId: newInvoice.id,
        internalAnalysis: {
          update: {
            generationNotes: serializeGenerationNotes(
              parsed.notes,
              {
                ...parsed.estimateStatus,
                commercialStatus: 'CONVERTED',
                commercialReasons: [
                  'El presupuesto ya ha sido convertido en factura y queda bloqueado para nueva emision o revocacion.',
                ],
                commercialCapabilities: {
                  canEdit: false,
                  canIssueProvisional: false,
                  canIssueFinal: false,
                  canRevokeIssuance: false,
                  canConvert: false,
                  canPrepareAcceptance: false,
                  requiresFinalIssuanceBeforeConversion: false,
                },
                nextCommercialAction: 'Continuar el flujo comercial desde la factura generada.',
              },
              parsed.integratedCostBuckets
            ),
          },
        },
      },
    });

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error('Error converting estimate:', error);
    return NextResponse.json({ error: 'Failed to convert estimate' }, { status: 500 });
  }
}
