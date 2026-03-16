import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
      },
    });

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    if (estimate.status === 'CONVERTED') {
      return NextResponse.json({ error: 'Estimate already converted to invoice' }, { status: 400 });
    }

    // 2. Determine next invoice number
    const lastInvoice = await db.invoice.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    
    let nextNumber = 'INV-2026-001';
    if (lastInvoice) {
      const lastNum = parseInt(lastInvoice.number.split('-').pop() || '0');
      nextNumber = `INV-2026-${(lastNum + 1).toString().padStart(3, '0')}`;
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
      },
    });

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error('Error converting estimate:', error);
    return NextResponse.json({ error: 'Failed to convert estimate' }, { status: 500 });
  }
}
