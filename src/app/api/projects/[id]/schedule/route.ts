import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const activities = await (db as any).projectActivity.findMany({
      where: { projectId: id },
      include: {
        wbs: true,
        location: true,
        standardActivity: true,
        predecessorLinks: true,
        successorLinks: true
      },
      orderBy: [
        { plannedStartDate: 'asc' },
        { createdAt: 'asc' }
      ]
    });
    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching schedule activities:', error);
    return NextResponse.json({ error: 'Error al obtener actividades del cronograma' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await req.json();

    const activity = await (db as any).projectActivity.create({
      data: {
        projectId: id,
        wbsId: data.wbsId || null,
        locationId: data.locationId || null,
        standardActivityId: data.standardActivityId || null,
        
        name: data.name,
        code: data.code || null,
        responsible: data.responsible || null,
        
        plannedDuration: data.plannedDuration ? parseFloat(data.plannedDuration) : null,
        plannedStartDate: data.plannedStartDate ? new Date(data.plannedStartDate) : null,
        plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate) : null,
        
        status: data.status || 'PENDIENTE',
        observations: data.observations || null
      },
      include: {
        wbs: true,
        location: true,
        standardActivity: true,
        predecessorLinks: true,
        successorLinks: true
      }
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error('Error creating schedule activity:', error);
    return NextResponse.json({ error: 'Error al registrar la actividad de obra' }, { status: 500 });
  }
}
