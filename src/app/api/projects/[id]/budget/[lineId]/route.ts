import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string, lineId: string }> }
) {
  const { id: projectId, lineId } = await params;

  try {
    const data = await req.json();
    const { name, description, estimatedAmount } = data;

    const updatedLine = await (db as any).projectBudgetLine.update({
      where: { 
        id: lineId,
        projectId: projectId // Ensure it belongs to the project
      },
      data: {
        name,
        description,
        estimatedAmount: typeof estimatedAmount === 'number' ? estimatedAmount : parseFloat(estimatedAmount) || 0,
      }
    });

    return NextResponse.json(updatedLine);
  } catch (error) {
    console.error('Error updating budget line:', error);
    return NextResponse.json({ error: 'Error al actualizar la partida' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string, lineId: string }> }
) {
  const { id: projectId, lineId } = await params;

  try {
    // Check if there are certifications or expenses linked
    const line = await (db as any).projectBudgetLine.findUnique({
      where: { id: lineId },
      include: {
        certificationLines: true,
        expenses: true
      }
    });

    if (line.certificationLines.length > 0 || line.expenses.length > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar una partida que tiene certificaciones o gastos vinculados.' 
      }, { status: 400 });
    }

    await (db as any).projectBudgetLine.delete({
      where: { id: lineId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget line:', error);
    return NextResponse.json({ error: 'Error al eliminar la partida' }, { status: 500 });
  }
}
