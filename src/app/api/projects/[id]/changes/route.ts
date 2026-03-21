import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const changes = await (db as any).projectChangeRequest.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(changes);
  } catch (error) {
    return NextResponse.json({ error: 'Error al cargar cambios' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await req.json();

    const change = await (db as any).projectChangeRequest.create({
      data: {
        projectId: id,
        title: data.title,
        description: data.description,
        reason: data.reason,
        impact: data.impact,
        priority: data.priority || 'MEDIA',
        status: data.status || 'PROPUESTO',
        responsible: data.responsible,
        requestedDate: data.requestedDate ? new Date(data.requestedDate) : new Date(),
        observations: data.observations
      }
    });

    return NextResponse.json(change);
  } catch (error) {
    console.error('Error creating change request:', error);
    return NextResponse.json({ error: 'Error al registrar cambio' }, { status: 500 });
  }
}
