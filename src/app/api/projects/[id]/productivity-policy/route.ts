import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  parseProjectProductivityPolicy,
  resolveProductivityPolicyForSolution,
  serializeProjectProductivityPolicy,
  summarizeProjectProductivityPolicyChange,
  createDefaultProjectProductivityPolicy,
} from '@/lib/estimate/project-productivity-policy';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const project = await (db as any).project.findUnique({
      where: { id },
      include: {
        productivityPolicyChanges: {
          orderBy: { changedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });
    }

    const currentPolicy = parseProjectProductivityPolicy(project.productivityPolicy) || createDefaultProjectProductivityPolicy();
    const hasOverrides = currentPolicy.globalProductivityMultiplier !== 1 || Object.keys(currentPolicy.overridesByFamily || {}).length > 0;
    
    // As productivity policy is an atomic property of the project, we don't need a full context resolution 
    // engine like we do for Sourcing Policy (which applies over hundreds of measurement lines). 
    // We just return the parsed policy + history. The actual consumption happens in the engine when building the recipe/pricing.
    
    const resolved = {
      policy: currentPolicy,
      source: hasOverrides ? 'PROJECT_OVERRIDE' : 'DEFAULT',
    };

    const history = (project.productivityPolicyChanges || []).map((entry: any) => ({
      id: entry.id,
      changedAt: entry.changedAt instanceof Date ? entry.changedAt.toISOString() : String(entry.changedAt),
      changedBy: entry.changedBy || null,
      previousPolicy: parseProjectProductivityPolicy(entry.previousPolicy),
      newPolicy: parseProjectProductivityPolicy(entry.newPolicy),
      summaryOfChanges: entry.summaryOfChanges || 'Cambio de política de productividad.',
    }));

    return NextResponse.json({
      ...resolved,
      history,
    });
  } catch (error) {
    console.error('Error fetching project productivity policy:', error);
    return NextResponse.json(
      { error: 'Error al obtener la política de productividad de la obra' },
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
    const serialized = serializeProjectProductivityPolicy(body?.policy || body);
    const changedBy =
      typeof body?.changedBy === 'string' && body.changedBy.trim().length > 0
        ? body.changedBy.trim()
        : 'PROJECT_ESTIMATOR_UI';

    if (!serialized) {
      return NextResponse.json(
        { error: 'La política de productividad enviada no es válida' },
        { status: 400 },
      );
    }

    const existingProject = await (db as any).project.findUnique({
      where: { id },
      select: {
        productivityPolicy: true,
      },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });
    }

    const previousPolicy = parseProjectProductivityPolicy(existingProject.productivityPolicy) || createDefaultProjectProductivityPolicy();
    const updatedPolicy = {
      ...serialized,
    };
    const summaryOfChanges = summarizeProjectProductivityPolicyChange({
      previousPolicy,
      newPolicy: serialized,
    });

    const updated = await (db as any).$transaction(async (tx: any) => {
      const project = await tx.project.update({
        where: { id },
        data: {
          productivityPolicy: updatedPolicy,
          productivityPolicyUpdatedAt: new Date(),
        },
        select: {
          productivityPolicy: true,
        },
      });

      await tx.projectProductivityPolicyChange.create({
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

    const currentPolicy = parseProjectProductivityPolicy(updated.productivityPolicy) || createDefaultProjectProductivityPolicy();
    const hasOverrides = currentPolicy.globalProductivityMultiplier !== 1 || Object.keys(currentPolicy.overridesByFamily || {}).length > 0;
    
    const resolved = {
      policy: currentPolicy,
      source: hasOverrides ? 'PROJECT_OVERRIDE' : 'DEFAULT',
    };

    const history = await (db as any).projectProductivityPolicyChange.findMany({
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
        previousPolicy: parseProjectProductivityPolicy(entry.previousPolicy),
        newPolicy: parseProjectProductivityPolicy(entry.newPolicy),
        summaryOfChanges: entry.summaryOfChanges || 'Cambio de policy registrado.',
      })),
    });
  } catch (error) {
    console.error('Error updating project productivity policy:', error);
    return NextResponse.json(
      { error: 'Error al guardar la política de productividad de la obra' },
      { status: 500 },
    );
  }
}
