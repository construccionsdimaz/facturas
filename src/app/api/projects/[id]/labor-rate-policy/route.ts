import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  createDefaultProjectLaborRatePolicy,
  parseProjectLaborRatePolicy,
  serializeProjectLaborRatePolicy,
  summarizeProjectLaborRatePolicyChange,
} from '@/lib/estimate/project-labor-rate-policy';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const project = await (db as any).project.findUnique({
      where: { id },
      include: {
        laborRatePolicyChanges: {
          orderBy: { changedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });
    }

    const currentPolicy =
      parseProjectLaborRatePolicy(project.laborRatePolicy) || createDefaultProjectLaborRatePolicy();
    const hasOverrides =
      currentPolicy.globalLaborMultiplier !== 1 ||
      Object.keys(currentPolicy.overridesByFamily || {}).length > 0 ||
      Object.keys(currentPolicy.tradeOverrides || {}).length > 0 ||
      Object.keys(currentPolicy.crewMultipliers || {}).length > 0;

    const history = (project.laborRatePolicyChanges || []).map((entry: any) => ({
      id: entry.id,
      changedAt: entry.changedAt instanceof Date ? entry.changedAt.toISOString() : String(entry.changedAt),
      changedBy: entry.changedBy || null,
      previousPolicy: parseProjectLaborRatePolicy(entry.previousPolicy),
      newPolicy: parseProjectLaborRatePolicy(entry.newPolicy),
      summaryOfChanges: entry.summaryOfChanges || 'Cambio de policy laboral.',
    }));

    return NextResponse.json({
      policy: currentPolicy,
      source: hasOverrides ? 'PROJECT_OVERRIDE' : 'DEFAULT',
      history,
    });
  } catch (error) {
    console.error('Error fetching project labor rate policy:', error);
    return NextResponse.json(
      { error: 'Error al obtener la policy laboral de la obra' },
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
    const serialized = serializeProjectLaborRatePolicy(body?.policy || body);
    const changedBy =
      typeof body?.changedBy === 'string' && body.changedBy.trim().length > 0
        ? body.changedBy.trim()
        : 'PROJECT_LABOR_UI';

    if (!serialized) {
      return NextResponse.json(
        { error: 'La policy laboral enviada no es válida.' },
        { status: 400 },
      );
    }

    const existingProject = await (db as any).project.findUnique({
      where: { id },
      select: { laborRatePolicy: true },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });
    }

    const previousPolicy =
      parseProjectLaborRatePolicy(existingProject.laborRatePolicy) ||
      createDefaultProjectLaborRatePolicy();
    const summaryOfChanges = summarizeProjectLaborRatePolicyChange({
      previousPolicy,
      newPolicy: serialized,
    });

    const updated = await (db as any).$transaction(async (tx: any) => {
      const project = await tx.project.update({
        where: { id },
        data: {
          laborRatePolicy: serialized,
          laborRatePolicyUpdatedAt: new Date(),
        },
        select: {
          laborRatePolicy: true,
        },
      });

      await tx.projectLaborRatePolicyChange.create({
        data: {
          projectId: id,
          changedBy,
          previousPolicy,
          newPolicy: serialized,
          summaryOfChanges,
        },
      });

      return project;
    });

    const currentPolicy =
      parseProjectLaborRatePolicy(updated.laborRatePolicy) || createDefaultProjectLaborRatePolicy();
    const hasOverrides =
      currentPolicy.globalLaborMultiplier !== 1 ||
      Object.keys(currentPolicy.overridesByFamily || {}).length > 0 ||
      Object.keys(currentPolicy.tradeOverrides || {}).length > 0 ||
      Object.keys(currentPolicy.crewMultipliers || {}).length > 0;

    const history = await (db as any).projectLaborRatePolicyChange.findMany({
      where: { projectId: id },
      orderBy: { changedAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      policy: currentPolicy,
      source: hasOverrides ? 'PROJECT_OVERRIDE' : 'DEFAULT',
      history: history.map((entry: any) => ({
        id: entry.id,
        changedAt: entry.changedAt instanceof Date ? entry.changedAt.toISOString() : String(entry.changedAt),
        changedBy: entry.changedBy || null,
        previousPolicy: parseProjectLaborRatePolicy(entry.previousPolicy),
        newPolicy: parseProjectLaborRatePolicy(entry.newPolicy),
        summaryOfChanges: entry.summaryOfChanges || 'Cambio de policy laboral registrado.',
      })),
    });
  } catch (error) {
    console.error('Error updating project labor rate policy:', error);
    return NextResponse.json(
      { error: 'Error al guardar la policy laboral de la obra' },
      { status: 500 },
    );
  }
}
