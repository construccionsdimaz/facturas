import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getOrCreateDefaultUser } from '@/lib/current-user';
import {
  applyEstimateReadinessOverride,
  parseGenerationNotes,
  serializeGenerationNotes,
} from '@/lib/estimate/estimate-status';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const reason =
      typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!reason) {
      return NextResponse.json(
        { error: 'El motivo del override es obligatorio.' },
        { status: 400 }
      );
    }

    const analysis = await db.estimateInternalAnalysis.findUnique({
      where: { estimateId: id },
      select: {
        id: true,
        generationNotes: true,
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: 'El estimate no tiene analisis interno para registrar override.' },
        { status: 400 }
      );
    }

    const parsed = parseGenerationNotes(analysis.generationNotes);
    if (!parsed.estimateStatus) {
      return NextResponse.json(
        { error: 'No existe estado economico suficiente para registrar override.' },
        { status: 400 }
      );
    }

    const user = await getOrCreateDefaultUser();
    const nextStatus = applyEstimateReadinessOverride(parsed.estimateStatus, {
      reason,
      actor: user.name || user.email || 'Usuario actual',
    });

    await db.estimateInternalAnalysis.update({
      where: { id: analysis.id },
      data: {
        generationNotes: serializeGenerationNotes(
          parsed.notes,
          nextStatus,
          parsed.integratedCostBuckets
        ),
      },
    });

    return NextResponse.json({
      ok: true,
      estimateStatus: nextStatus,
    });
  } catch (error) {
    console.error('Error applying estimate readiness override:', error);
    return NextResponse.json(
      { error: 'No se pudo registrar el override de readiness.' },
      { status: 500 }
    );
  }
}
