import { NextResponse } from 'next/server';
import { getProjectLearning, rebuildProjectLearning } from '@/lib/learning/project-learning';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);

  try {
    const refresh = searchParams.get('refresh') === '1';
    const result = await getProjectLearning(id, refresh);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching project learning:', error);
    return NextResponse.json({ error: 'Error al cargar el aprendizaje de la obra' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await rebuildProjectLearning(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error rebuilding project learning:', error);
    return NextResponse.json({ error: 'Error al recalcular desviaciones y sugerencias' }, { status: 500 });
  }
}
