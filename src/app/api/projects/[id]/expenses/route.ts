import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const expenses = await db.projectExpense.findMany({
      where: { projectId: id },
      include: {
        supplier: true,
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
    const { description, amount, date, category, supplierId, budgetLineId } = data;

    if (!description || !amount) {
      return NextResponse.json({ error: 'Descripción e importe son obligatorios' }, { status: 400 });
    }

    const expense = await db.projectExpense.create({
      data: {
        description,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        category,
        projectId: id,
        supplierId: supplierId || null,
        budgetLineId: budgetLineId || null
      }
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error creating project expense:', error);
    return NextResponse.json({ error: 'Error al crear el gasto' }, { status: 500 });
  }
}
