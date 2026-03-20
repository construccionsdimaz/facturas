import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type');
    
    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (type) where.type = type;

    const movements = await (db as any).movement.findMany({
      where,
      include: {
        project: { select: { name: true } },
        client: { select: { name: true } },
        invoice: { select: { number: true } }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(movements);
  } catch (error) {
    console.error('Error fetching movements:', error);
    return NextResponse.json({ error: 'Error al obtener movimientos' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { 
      amount, date, method, description, type, category, 
      projectId, clientId, invoiceId, projectExpenseId, companyExpenseId,
      isFacturado 
    } = data;

    if (!amount || !type || !category) {
      return NextResponse.json({ error: 'Importe, tipo y categoría son obligatorios' }, { status: 400 });
    }

    const movement = await (db as any).movement.create({
      data: {
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        method: method || 'TRANSFERENCIA',
        description,
        type,
        category,
        projectId,
        clientId,
        invoiceId,
        projectExpenseId,
        companyExpenseId,
        isFacturado: isFacturado || (category === 'COBRO_FACTURA') // Si es cobro de factura, se asume facturado
      }
    });

    // SYNC LOGIC: Update paidAmount in related entities
    if (type === 'ENTRY' && invoiceId) {
      const invoice = await (db as any).invoice.findUnique({ where: { id: invoiceId } });
      if (invoice) {
        const newPaid = Math.round((invoice.paidAmount + parseFloat(amount)) * 100) / 100;
        const status = newPaid >= invoice.total ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'ISSUED';
        await (db as any).invoice.update({
          where: { id: invoiceId },
          data: { paidAmount: newPaid, status }
        });
      }
    } else if (type === 'EXIT' && projectExpenseId) {
      const expense = await (db as any).projectExpense.findUnique({ where: { id: projectExpenseId } });
      if (expense) {
        const newPaid = Math.round((expense.paidAmount + parseFloat(amount)) * 100) / 100;
        const status = newPaid >= expense.amount ? 'PAGADO' : newPaid > 0 ? 'PARCIAL' : 'PENDIENTE';
        await (db as any).projectExpense.update({
          where: { id: projectExpenseId },
          data: { paidAmount: newPaid, status }
        });
      }
    } else if (type === 'EXIT' && companyExpenseId) {
      const expense = await (db as any).companyExpense.findUnique({ where: { id: companyExpenseId } });
      if (expense) {
        const newPaid = Math.round((expense.paidAmount + parseFloat(amount)) * 100) / 100;
        const status = newPaid >= expense.amount ? 'PAGADO' : newPaid > 0 ? 'PARCIAL' : 'PENDIENTE';
        await (db as any).companyExpense.update({
          where: { id: companyExpenseId },
          data: { paidAmount: newPaid, status }
        });
      }
    }

    return NextResponse.json(movement);
  } catch (error) {
    console.error('Error creating movement:', error);
    return NextResponse.json({ error: 'Error al registrar el movimiento' }, { status: 500 });
  }
}
