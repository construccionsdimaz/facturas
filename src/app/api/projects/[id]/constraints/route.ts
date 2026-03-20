import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const constraints = await (db as any).projectConstraint.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(constraints);
  } catch (error) {
    console.error('Error fetching constraints:', error);
    return NextResponse.json({ error: 'Error al obtener restricciones' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await req.json();
    const constraint = await (db as any).projectConstraint.create({
      data: {
        projectId: id,
        title: data.title,
        type: data.type,
        description: data.description,
        impact: data.impact,
        priority: data.priority,
        manager: data.manager,
        status: data.status,
        targetResolutionDate: data.targetResolutionDate ? new Date(data.targetResolutionDate) : null,
        comments: data.comments
      }
    });
    return NextResponse.json(constraint);
  } catch (error) {
    console.error('Error creating constraint:', error);
    return NextResponse.json({ error: 'Error al crear restricción' }, { status: 500 });
  }
}
