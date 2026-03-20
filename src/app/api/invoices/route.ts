import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusStr = searchParams.get('status');
    const projectId = searchParams.get('projectId');
    
    const where: any = {};
    if (statusStr) {
      where.status = { in: statusStr.split(',') };
    }
    if (projectId) {
      where.projectId = projectId;
    }

    const invoices = await db.invoice.findMany({
      where,
      include: {
        client: true,
        items: true,
        project: true
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
    const { number, clientId, userId, subtotal, taxAmount, total, items, paymentMethod, language, projectId } = body;

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
        language: language || 'ES',
        projectId: projectId || null,
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      } as any,
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
