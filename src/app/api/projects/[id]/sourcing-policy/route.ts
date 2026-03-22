import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  resolveProjectSourcingPolicy,
  serializeProjectSourcingPolicy,
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

    return NextResponse.json(resolved);
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

    if (!serialized) {
      return NextResponse.json(
        { error: 'La politica de sourcing enviada no es valida' },
        { status: 400 },
      );
    }

    const updated = await (db as any).project.update({
      where: { id },
      data: {
        sourcingPolicy: {
          ...serialized,
          updatedAt: new Date().toISOString(),
        },
        sourcingPolicyUpdatedAt: new Date(),
      },
      select: {
        sourcingPolicy: true,
      },
    });

    const resolved = resolveProjectSourcingPolicy({
      projectPolicy: updated.sourcingPolicy,
      executionContext: null,
    });

    return NextResponse.json(resolved);
  } catch (error) {
    console.error('Error updating project sourcing policy:', error);
    return NextResponse.json(
      { error: 'Error al guardar la politica de sourcing de la obra' },
      { status: 500 },
    );
  }
}
