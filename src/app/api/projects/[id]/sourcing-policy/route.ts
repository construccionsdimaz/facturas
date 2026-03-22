import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  parseProjectSourcingPolicy,
  resolveProjectSourcingPolicy,
  serializeProjectSourcingPolicy,
  summarizeProjectSourcingPolicyChange,
} from '@/lib/procurement/project-sourcing-policy';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const project = await (db as any).project.findUnique({
      where: { id },
      include: {
        estimates: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            discoverySession: true,
          },
        },
        sourcingPolicyChanges: {
          orderBy: { changedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });
    }

    const latestEstimate = project.estimates?.[0] || null;
    const derivedInput = (latestEstimate?.discoverySession?.derivedInput as any) || null;
    const resolved = resolveProjectSourcingPolicy({
      executionContext: derivedInput?.executionContext || null,
      projectPolicy: project.sourcingPolicy,
    });
    const history = (project.sourcingPolicyChanges || []).map((entry: any) => ({
      id: entry.id,
      changedAt: entry.changedAt instanceof Date ? entry.changedAt.toISOString() : String(entry.changedAt),
      changedBy: entry.changedBy || null,
      previousPolicy: parseProjectSourcingPolicy(entry.previousPolicy),
      newPolicy: parseProjectSourcingPolicy(entry.newPolicy),
      summaryOfChanges: entry.summaryOfChanges || 'Cambio de policy registrado.',
    }));

    return NextResponse.json({
      ...resolved,
      history,
    });
  } catch (error) {
    console.error('Error fetching project sourcing policy:', error);
    return NextResponse.json(
      { error: 'Error al obtener la politica de sourcing de la obra' },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const serialized = serializeProjectSourcingPolicy(body?.policy || body);
    const changedBy =
      typeof body?.changedBy === 'string' && body.changedBy.trim().length > 0
        ? body.changedBy.trim()
        : 'PROJECT_PROCUREMENT_UI';

    if (!serialized) {
      return NextResponse.json(
        { error: 'La politica de sourcing enviada no es valida' },
        { status: 400 },
      );
    }

    const existingProject = await (db as any).project.findUnique({
      where: { id },
      select: {
        sourcingPolicy: true,
      },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });
    }

    const previousPolicy = parseProjectSourcingPolicy(existingProject.sourcingPolicy);
    const updatedPolicy = {
      ...serialized,
      updatedAt: new Date().toISOString(),
    };
    const summaryOfChanges = summarizeProjectSourcingPolicyChange({
      previousPolicy,
      newPolicy: serialized,
    });

    const updated = await (db as any).$transaction(async (tx: any) => {
      const project = await tx.project.update({
        where: { id },
        data: {
          sourcingPolicy: updatedPolicy,
          sourcingPolicyUpdatedAt: new Date(),
        },
        select: {
          sourcingPolicy: true,
        },
      });

      await tx.projectSourcingPolicyChange.create({
        data: {
          projectId: id,
          changedBy,
          previousPolicy: previousPolicy,
          newPolicy: updatedPolicy,
          summaryOfChanges,
        },
      });

      return project;
    });

    const resolved = resolveProjectSourcingPolicy({
      projectPolicy: updated.sourcingPolicy,
      executionContext: null,
    });

    const history = await (db as any).projectSourcingPolicyChange.findMany({
      where: { projectId: id },
      orderBy: { changedAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      ...resolved,
      history: history.map((entry: any) => ({
        id: entry.id,
        changedAt: entry.changedAt instanceof Date ? entry.changedAt.toISOString() : String(entry.changedAt),
        changedBy: entry.changedBy || null,
        previousPolicy: parseProjectSourcingPolicy(entry.previousPolicy),
        newPolicy: parseProjectSourcingPolicy(entry.newPolicy),
        summaryOfChanges: entry.summaryOfChanges || 'Cambio de policy registrado.',
      })),
    });
  } catch (error) {
    console.error('Error updating project sourcing policy:', error);
    return NextResponse.json(
      { error: 'Error al guardar la politica de sourcing de la obra' },
      { status: 500 },
    );
  }
}
