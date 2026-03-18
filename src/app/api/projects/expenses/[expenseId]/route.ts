import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  const { expenseId } = await params;
  try {
    const data = await req.json();
    const { description, amount, date, category } = data;

    const expense = await (db as any).projectExpense.update({
      where: { id: expenseId },
      data: {
        description,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        date: date ? new Date(date) : undefined,
        category
      }
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error updating project expense:', error);
    return NextResponse.json({ error: 'Error al actualizar el gasto' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  const { expenseId } = await params;
  try {
    await (db as any).projectExpense.delete({
      where: { id: expenseId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project expense:', error);
    return NextResponse.json({ error: 'Error al eliminar el gasto' }, { status: 500 });
  }
}
