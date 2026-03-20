import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const milestones = await (db as any).projectMilestone.findMany({
      where: { projectId: id },
      orderBy: { targetDate: 'asc' }
    });
    return NextResponse.json(milestones);
  } catch (error) {
    console.error('Error fetching milestones:', error);
    return NextResponse.json({ error: 'Error al obtener hitos' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await req.json();
    const milestone = await (db as any).projectMilestone.create({
      data: {
        projectId: id,
        name: data.name,
        description: data.description,
        targetDate: new Date(data.targetDate),
        priority: data.priority,
        manager: data.manager,
        status: data.status,
        observations: data.observations
      }
    });
    return NextResponse.json(milestone);
  } catch (error) {
    console.error('Error creating milestone:', error);
    return NextResponse.json({ error: 'Error al crear hito' }, { status: 500 });
  }
}
