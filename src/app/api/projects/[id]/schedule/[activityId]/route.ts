import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string, activityId: string }> }
) {
  const { activityId } = await params;
  try {
    const data = await req.json();
    
    // Preparar objeto de actualización ignorando campos no enviados (si es PATCH)
    const updateData: any = {};
    if(data.wbsId !== undefined) updateData.wbsId = data.wbsId || null;
    if(data.locationId !== undefined) updateData.locationId = data.locationId || null;
    if(data.standardActivityId !== undefined) updateData.standardActivityId = data.standardActivityId || null;
    
    if(data.name !== undefined) updateData.name = data.name;
    if(data.code !== undefined) updateData.code = data.code || null;
    if(data.responsible !== undefined) updateData.responsible = data.responsible || null;
    
    if(data.plannedDuration !== undefined) updateData.plannedDuration = data.plannedDuration ? parseFloat(data.plannedDuration) : null;
    if(data.plannedStartDate !== undefined) updateData.plannedStartDate = data.plannedStartDate ? new Date(data.plannedStartDate) : null;
    if(data.plannedEndDate !== undefined) updateData.plannedEndDate = data.plannedEndDate ? new Date(data.plannedEndDate) : null;
    
    if(data.status !== undefined) updateData.status = data.status;
    if(data.observations !== undefined) updateData.observations = data.observations || null;

    const activity = await (db as any).projectActivity.update({
      where: { id: activityId },
      data: updateData,
      include: {
        wbs: true,
        location: true,
        standardActivity: true
      }
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error('Error updating schedule activity:', error);
    return NextResponse.json({ error: 'Error al actualizar la actividad de obra' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string, activityId: string }> }
) {
  const { activityId } = await params;
  try {
    await (db as any).projectActivity.delete({
      where: { id: activityId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule activity:', error);
    return NextResponse.json({ error: 'Error al eliminar la actividad de obra' }, { status: 500 });
  }
}
