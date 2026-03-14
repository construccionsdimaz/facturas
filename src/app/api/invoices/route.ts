import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const invoices = await db.invoice.findMany({
      include: {
        client: true,
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { number, clientId, userId, subtotal, taxAmount, total, items, paymentMethod } = body;

    // Resolve Demo User (since there's no NextAuth session yet)
    let user = await db.user.findFirst();
    if (!user) {
      user = await db.user.create({
        data: { email: 'admin@nextgen.inc', name: 'Admin', role: 'ADMIN' }
      });
    }

    if (!clientId) {
        return NextResponse.json(
            { error: 'clientId is required to create an invoice' }, 
            { status: 400 }
        );
    }

    const newInvoice = await db.invoice.create({
      data: {
        number,
        userId: user.id, // Use the resolved active user
        clientId,
        subtotal,
        taxAmount,
        total,
        paymentMethod,
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: true,
      }
    });

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}
