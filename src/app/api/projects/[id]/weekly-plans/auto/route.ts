import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  d.setHours(0, 0, 0, 0);
  d.setDate(diff);
  return d;
}

function endOfWeek(date: Date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatWeekName(start: Date, end: Date) {
  return `Semana ${start.toLocaleDateString('es-ES')} - ${end.toLocaleDateString('es-ES')}`;
}

function getPriority(activity: { name?: string; code?: string; plannedDuration?: number }) {
  const text = `${activity.name || ''} ${activity.code || ''}`.toLowerCase();
  if (/demolic|estructura|instal|legal|entrega|hito|licencia/.test(text)) return 'CLAVE';
  if (/pladur|alicat|pintur|suelo|carpinter|remate/.test(text)) return 'IMPORTANTE';
  if ((activity.plannedDuration || 0) >= 4) return 'IMPORTANTE';
  return 'NORMAL';
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const startDate = body.startDate ? new Date(body.startDate) : startOfWeek(now);
    const endDate = body.endDate ? new Date(body.endDate) : endOfWeek(startDate);
    const weekName = body.weekName || formatWeekName(startDate, endDate);
    const limit = Number(body.limit) > 0 ? Number(body.limit) : 8;

    const existingPlan = await db.weeklyPlan.findFirst({
      where: {
        projectId: id,
        startDate,
        endDate,
      },
      include: {
        activities: true,
      },
    });

    if (existingPlan) {
      return NextResponse.json(
        { error: 'Ya existe un plan semanal para ese periodo', planId: existingPlan.id },
        { status: 409 }
      );
    }

    const scheduleActivities = await db.projectActivity.findMany({
      where: { projectId: id },
      include: {
        wbs: true,
        location: true,
      },
      orderBy: [
        { plannedStartDate: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    const alreadyPlannedIds = new Set(
      (
        await db.weeklyPlanActivity.findMany({
          where: {
            weeklyPlan: { projectId: id },
          },
          select: { projectActivityId: true },
        })
      ).map((item) => item.projectActivityId)
    );

    const eligible = scheduleActivities.filter((activity) => {
      if (alreadyPlannedIds.has(activity.id)) return false;
      if (!activity.plannedStartDate) return true;
      const start = new Date(activity.plannedStartDate);
      return start <= endDate;
    });

    const ordered = eligible.sort((a, b) => {
      const aDate = a.plannedStartDate ? new Date(a.plannedStartDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.plannedStartDate ? new Date(b.plannedStartDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    });

    const selectedActivities = ordered.slice(0, limit);

    if (selectedActivities.length === 0) {
      return NextResponse.json({ error: 'No hay actividades disponibles para planificar automaticamente' }, { status: 400 });
    }

    const createdPlan = await db.$transaction(async (tx) => {
      const plan = await tx.weeklyPlan.create({
        data: {
          projectId: id,
          weekName,
          startDate,
          endDate,
          generalManager: body.generalManager || null,
          status: 'BORRADOR',
          observations: body.observations || 'Generado automaticamente desde el cronograma maestro.',
        },
      });

      await tx.weeklyPlanActivity.createMany({
        data: selectedActivities.map((activity) => ({
          weeklyPlanId: plan.id,
          projectActivityId: activity.id,
          priority: getPriority(activity),
          weeklyStatus: 'PENDIENTE',
          executionDays: '',
          operationalNotes: activity.location
            ? `Ubicacion: ${activity.location.name}${activity.wbs ? ` | WBS: ${activity.wbs.name}` : ''}`
            : activity.wbs
              ? `WBS: ${activity.wbs.name}`
              : null,
        })),
        skipDuplicates: true,
      });

      return plan;
    });

    return NextResponse.json({
      planId: createdPlan.id,
      weekName: createdPlan.weekName,
      selectedActivities: selectedActivities.length,
    });
  } catch (error) {
    console.error('Error generating weekly plan:', error);
    return NextResponse.json({ error: 'No se pudo generar el plan semanal automatico' }, { status: 500 });
  }
}
