import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    const where: any = { projectId: id };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const restrictions = await (db as any).restriction.findMany({
      where,
      include: {
        projectActivity: {
          select: { id: true, name: true, code: true }
        },
        location: {
          select: { id: true, name: true }
        },
        wbs: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { priority: 'asc' }, // Assuming order like CRITICA, ALTA, MEDIA, MENOR if possible or just newest
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(restrictions);
  } catch (error) {
    console.error('Error fetching restrictions:', error);
    return NextResponse.json({ error: 'Error al cargar restricciones' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await req.json();

    const restriction = await (db as any).restriction.create({
      data: {
        projectId: id,
        title: data.title,
        type: data.type,
        description: data.description,
        projectActivityId: data.projectActivityId || null,
        locationId: data.locationId || null,
        wbsId: data.wbsId || null,
        priority: data.priority || 'MEDIA',
        status: data.status || 'DETECTADA',
        responsible: data.responsible,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        impact: data.impact,
        observations: data.observations
      }
    });

    return NextResponse.json(restriction);
  } catch (error) {
    console.error('Error creating restriction:', error);
    return NextResponse.json({ error: 'Error al registrar restricción' }, { status: 500 });
  }
}
