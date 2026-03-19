import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ lineId: string }> }
) {
  const { lineId } = await params;

  try {
    const data = await req.json();
    const { status, name, estimatedAmount, description, startDate, endDate, order } = data;

    const budgetLine = await db.projectBudgetLine.update({
      where: { id: lineId },
      data: {
        status: status || undefined,
        name: name || undefined,
        estimatedAmount: estimatedAmount !== undefined ? parseFloat(estimatedAmount) : undefined,
        description: description !== undefined ? description : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        order: order !== undefined ? parseInt(order) : undefined,
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
    await db.projectBudgetLine.delete({
      where: { id: lineId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget line:', error);
    return NextResponse.json({ error: 'Error al eliminar la partida' }, { status: 500 });
  }
}
