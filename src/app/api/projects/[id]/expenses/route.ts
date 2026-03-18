import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  try {
    const { description, amount, date, category } = await req.json();
    
    const expense = await (db as any).projectExpense.create({
      data: {
        description,
        amount: parseFloat(amount) || 0,
        date: date ? new Date(date) : new Date(),
        category,
        projectId
      }
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Error al registrar el gasto' }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  try {
    const expenses = await (db as any).projectExpense.findMany({
      where: { projectId },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(expenses);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener los gastos' }, { status: 500 });
  }
}
