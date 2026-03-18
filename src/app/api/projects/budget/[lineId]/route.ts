import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ lineId: string }> }
) {
  const { lineId } = await params;

  try {
    const data = await req.json();
    const { name, description, estimatedAmount } = data;

    const budgetLine = await (db as any).projectBudgetLine.update({
      where: { id: lineId },
      data: {
        name,
        description,
        estimatedAmount: estimatedAmount !== undefined ? parseFloat(estimatedAmount) : undefined
      }
    });

    return NextResponse.json(budgetLine);
  } catch (error) {
    console.error('Error updating budget line:', error);
    return NextResponse.json({ error: 'Error al actualizar la partida' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ lineId: string }> }
) {
  const { lineId } = await params;

  try {
    await (db as any).projectBudgetLine.delete({
      where: { id: lineId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget line:', error);
    return NextResponse.json({ error: 'Error al eliminar la partida' }, { status: 500 });
  }
}
