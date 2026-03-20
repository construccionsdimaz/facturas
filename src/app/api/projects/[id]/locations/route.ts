import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const locations = await (db as any).projectLocation.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Error al obtener ubicaciones' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await req.json();
    const location = await (db as any).projectLocation.create({
      data: {
        projectId: id,
        parentId: data.parentId || null,
        name: data.name,
        code: data.code || null,
        type: data.type,
        status: data.status || 'ACTIVA',
        description: data.description || null,
        observations: data.observations || null
      }
    });
    return NextResponse.json(location);
  } catch (error) {
    console.error('Error creating location:', error);
    return NextResponse.json({ error: 'Error al crear ubicación' }, { status: 500 });
  }
}
