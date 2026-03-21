import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await db.discoverySession.findUnique({
      where: { id },
      include: {
        client: true,
        project: true,
        estimates: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, number: true, total: true, status: true, createdAt: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Sesion discovery no encontrada.' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error fetching discovery session:', error);
    return NextResponse.json({ error: 'No se pudo cargar la sesion discovery.' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const session = await db.discoverySession.findUnique({
      where: { id },
      select: { id: true, projectId: true, clientId: true },
    });

    if (!session) {
      return NextResponse.json({ error: 'Sesion discovery no encontrada.' }, { status: 404 });
    }

    let clientId = body.clientId ?? session.clientId;
    let projectId = body.projectId ?? session.projectId;

    if (projectId) {
      const project = await db.project.findUnique({
        where: { id: projectId },
        select: { id: true, clientId: true },
      });

      if (!project) {
        return NextResponse.json({ error: 'La obra seleccionada no existe.' }, { status: 400 });
      }

      if (clientId && clientId !== project.clientId) {
        return NextResponse.json({ error: 'La obra seleccionada no pertenece al cliente indicado.' }, { status: 400 });
      }

      clientId = project.clientId;
      projectId = project.id;
    }

    const updated = await db.discoverySession.update({
      where: { id },
      data: {
        clientId,
        projectId,
        title: body.title,
        status: body.status,
        budgetGoal: body.budgetGoal,
        precisionMode: body.precisionMode,
        completionStep: body.completionStep,
        completionPercent: body.completionPercent,
        confidenceScore: body.confidenceScore,
        confidenceLevel: body.confidenceLevel,
        lastStepKey: body.lastStepKey,
        sessionData: body.sessionData,
        derivedInput: body.derivedInput,
        summary: body.summary,
        warnings: body.warnings,
        assumptions: body.assumptions,
      },
      include: {
        client: true,
        project: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating discovery session:', error);
    return NextResponse.json({ error: 'No se pudo guardar el progreso discovery.' }, { status: 500 });
  }
}
