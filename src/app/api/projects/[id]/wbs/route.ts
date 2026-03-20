import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const wbsItems = await (db as any).projectWBS.findMany({
      where: { projectId: id },
      orderBy: [
        { code: 'asc' },
        { createdAt: 'asc' }
      ]
    });
    return NextResponse.json(wbsItems);
  } catch (error) {
    console.error('Error fetching WBS items:', error);
    return NextResponse.json({ error: 'Error al obtener piezas de WBS' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await req.json();
    const wbsItem = await (db as any).projectWBS.create({
      data: {
        projectId: id,
        parentId: data.parentId || null,
        name: data.name,
        code: data.code || null,
        level: data.level,
        status: data.status || 'PENDIENTE',
        description: data.description || null,
        observations: data.observations || null
      }
    });
    return NextResponse.json(wbsItem);
  } catch (error) {
    console.error('Error creating WBS item:', error);
    return NextResponse.json({ error: 'Error al crear la partida WBS' }, { status: 500 });
  }
}
