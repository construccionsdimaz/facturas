import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const plans = await (db as any).weeklyPlan.findMany({
      where: { projectId: id },
      include: {
        activities: {
          include: {
            projectActivity: {
              select: { id: true, name: true, status: true, code: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error fetching weekly plans:', error);
    return NextResponse.json({ error: 'Error visualizando planes semanales' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await req.json();

    const plan = await (db as any).weeklyPlan.create({
      data: {
        projectId: id,
        weekName: data.weekName,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        generalManager: data.generalManager || null,
        status: data.status || 'BORRADOR',
        observations: data.observations || null
      }
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error creating weekly plan:', error);
    return NextResponse.json({ error: 'Error al registrar el plan' }, { status: 500 });
  }
}
