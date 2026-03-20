import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const expenses = await (db.projectExpense as any).findMany({
      where: { projectId: id },
      include: {
        client: true,
        budgetLine: true
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching project expenses:', error);
    return NextResponse.json({ error: 'Error al obtener los gastos' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const data = await req.json();
    const { description, amount, date, dueDate, category, clientId, budgetLineId, status, type, paidAmount } = data;

    if (!description || !amount) {
      return NextResponse.json({ error: 'Descripción e importe son obligatorios' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    const parsedPaidAmount = paidAmount !== undefined ? Math.round(parseFloat(paidAmount) * 100) / 100 : 0;
    const computedStatus = status || (parsedPaidAmount >= parsedAmount ? 'PAGADO' : parsedPaidAmount > 0 ? 'PARCIAL' : 'PENDIENTE');

    const expense = await (db.projectExpense as any).create({
      data: {
        description,
        amount: parsedAmount,
        paidAmount: parsedPaidAmount,
        date: date ? new Date(date) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        category,
        type: type || 'DIRECT_BUDGET',
        status: computedStatus,
        projectId: id,
        clientId: clientId || null,
        budgetLineId: budgetLineId || null
      }
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error creating project expense:', error);
    return NextResponse.json({ error: 'Error al crear el gasto' }, { status: 500 });
  }
}
