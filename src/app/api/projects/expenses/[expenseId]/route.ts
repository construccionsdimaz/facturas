import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
