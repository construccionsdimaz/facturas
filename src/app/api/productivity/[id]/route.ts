import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await req.json();

    const updateData: any = {
      name: data.name,
      standardActivityId: data.standardActivityId || null,
      unit: data.unit,
      category: data.category,
      complexity: data.complexity,
      workType: data.workType,
      locationType: data.locationType,
      confidenceLevel: data.confidenceLevel,
      status: data.status,
      description: data.description,
      observations: data.observations
    };

    if (data.value !== undefined) {
      updateData.value = parseFloat(data.value);
    }

    const rate = await (db as any).productivityRate.update({
      where: { id },
      data: updateData,
      include: {
        standardActivity: true
      }
    });
    return NextResponse.json(rate);
  } catch (error) {
    console.error('Error updating productivity rate:', error);
    return NextResponse.json({ error: 'Error al actualizar el rendimiento' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await (db as any).productivityRate.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting productivity rate:', error);
    return NextResponse.json({ error: 'Error al eliminar el rendimiento' }, { status: 500 });
  }
}
