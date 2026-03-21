import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getDefaultProjectCalendarData,
  scheduleProjectActivities,
} from '@/lib/scheduling/project-scheduler';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const referenceStartDate = body.referenceStartDate || null;

    const project = await db.project.findUnique({
      where: { id },
      include: {
        calendar: true,
        activities: {
          include: {
            predecessorLinks: true,
            successorLinks: true,
          },
          orderBy: [
            { createdAt: 'asc' },
          ],
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });
    }

    if (project.activities.length === 0) {
      return NextResponse.json({ error: 'La obra no tiene actividades para recalcular' }, { status: 400 });
    }

    const calendarRecord = project.calendar || {
      ...getDefaultProjectCalendarData(),
    };

    const dependencies = await db.activityDependency.findMany({
      where: {
        predecessor: { projectId: id },
      },
      select: {
        predecessorId: true,
        successorId: true,
        dependencyType: true,
        lagDays: true,
      },
    });

    const scheduling = scheduleProjectActivities({
      activities: project.activities.map((activity) => ({
        id: activity.id,
        name: activity.name,
        durationDays: activity.plannedDuration,
      })),
      dependencies: dependencies.map((dep) => ({
        predecessorId: dep.predecessorId,
        successorId: dep.successorId,
        type: dep.dependencyType as 'FS' | 'SS' | 'FF' | 'SF',
        lagDays: dep.lagDays,
      })),
      calendar: calendarRecord,
      startDate: referenceStartDate,
    });

    const scheduleById = new Map(
      scheduling.activities.map((activity) => [activity.id, activity])
    );

    const updated = await db.$transaction(async (tx) => {
      if (!project.calendar) {
        await tx.projectCalendar.upsert({
          where: { projectId: id },
          update: getDefaultProjectCalendarData(),
          create: {
            projectId: id,
            ...getDefaultProjectCalendarData(),
          },
        });
      }

      for (const activity of project.activities) {
        const scheduled = scheduleById.get(activity.id);
        await tx.projectActivity.update({
          where: { id: activity.id },
          data: {
            plannedStartDate: scheduled?.plannedStartDate || null,
            plannedEndDate: scheduled?.plannedEndDate || null,
          },
        });
      }

      return project.activities.length;
    });

    return NextResponse.json({
      updatedActivities: updated,
      scheduling: {
        scheduledWith: scheduling.scheduledWith,
        startDate: scheduling.startDate,
        startRule: scheduling.startRule,
        calendarSource: scheduling.calendar.source,
        timeCriteria: scheduling.calendar.timeCriteria,
        bufferDays: scheduling.calendar.bufferDays,
        issues: scheduling.issues,
      },
    });
  } catch (error) {
    console.error('Error recalculating schedule:', error);
    return NextResponse.json({ error: 'No se pudo recalcular el cronograma' }, { status: 500 });
  }
}
