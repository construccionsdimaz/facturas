import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const baselines = await (db as any).projectBaseline.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(baselines);
  } catch (error) {
    return NextResponse.json({ error: 'Error al cargar baselines' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await req.json();

    // 1. Fetch current activities to snapshot
    const activities = await (db as any).projectActivity.findMany({
      where: { projectId: id },
      include: {
        wbs: true,
        location: true
      }
    });

    const snapshot = activities.map((a: any) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      plannedStartDate: a.plannedStartDate,
      plannedEndDate: a.plannedEndDate,
      status: a.status,
      realStartDate: a.realStartDate,
      realEndDate: a.realEndDate,
      realProgress: a.realProgress
    }));

    // 2. Create the baseline
    const baseline = await (db as any).projectBaseline.create({
      data: {
        projectId: id,
        name: data.name,
        description: data.description,
        responsible: data.responsible,
        snapshotData: snapshot,
        status: data.status || 'VIGENTE'
      }
    });

    return NextResponse.json(baseline);
  } catch (error) {
    console.error('Error creating baseline:', error);
    return NextResponse.json({ error: 'Error al fijar baseline' }, { status: 500 });
  }
}
