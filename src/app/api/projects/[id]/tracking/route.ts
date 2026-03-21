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
        weeklyPlanInclusions: true, // Para saber si pertenecen a un plan semanal
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching tracking snapshot:', error);
    return NextResponse.json({ error: 'Error cargando datos reales de obra' }, { status: 500 });
  }
}
