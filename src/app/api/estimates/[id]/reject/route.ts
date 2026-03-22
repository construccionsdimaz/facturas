import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getOrCreateDefaultUser } from '@/lib/current-user';
import {
  parseGenerationNotes,
  rejectEstimate,
  serializeGenerationNotes,
} from '@/lib/estimate/estimate-status';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!reason) {
      return NextResponse.json(
        { error: 'El motivo del rechazo es obligatorio.' },
        { status: 400 }
      );
    }

    const estimate = await db.estimate.findUnique({
      where: { id },
      include: {
        internalAnalysis: true,
      },
    });

    if (!estimate?.internalAnalysis) {
      return NextResponse.json(
        { error: 'El estimate no tiene analisis interno para gobernar su rechazo.' },
        { status: 400 }
      );
    }

    if (estimate.status === 'CONVERTED') {
      return NextResponse.json(
        { error: 'No se puede rechazar un estimate ya convertido.' },
        { status: 400 }
      );
    }

    const parsed = parseGenerationNotes(estimate.internalAnalysis.generationNotes);
    if (!parsed.estimateStatus) {
      return NextResponse.json(
        { error: 'No existe estimateStatus persistido para registrar el rechazo.' },
        { status: 400 }
      );
    }

    const user = await getOrCreateDefaultUser();
    const nextStatus = rejectEstimate(parsed.estimateStatus, {
      actor: user.name || user.email || 'Usuario actual',
      reason,
    });

    const updated = await db.estimate.update({
      where: { id },
      data: {
        status: 'REJECTED',
        internalAnalysis: {
          update: {
            generationNotes: serializeGenerationNotes(
              parsed.notes,
              nextStatus,
              parsed.integratedCostBuckets
            ),
          },
        },
      },
      include: {
        internalAnalysis: true,
      },
    });

    return NextResponse.json({
      ok: true,
      estimate: updated,
      estimateStatus: nextStatus,
    });
  } catch (error: any) {
    console.error('Error rejecting estimate:', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudo rechazar el estimate.' },
      { status: 400 }
    );
  }
}
