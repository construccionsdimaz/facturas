import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getOrCreateDefaultUser } from '@/lib/current-user';
import {
  parseGenerationNotes,
  revokeEstimateAcceptance,
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
        { error: 'El motivo de revocacion de la aceptacion es obligatorio.' },
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
        { error: 'El estimate no tiene analisis interno para revocar la aceptacion.' },
        { status: 400 }
      );
    }

    if (estimate.status === 'CONVERTED') {
      return NextResponse.json(
        { error: 'No se puede revocar la aceptacion de un estimate ya convertido.' },
        { status: 400 }
      );
    }

    const parsed = parseGenerationNotes(estimate.internalAnalysis.generationNotes);
    if (!parsed.estimateStatus) {
      return NextResponse.json(
        { error: 'No existe estimateStatus persistido para revocar la aceptacion.' },
        { status: 400 }
      );
    }

    const user = await getOrCreateDefaultUser();
    const nextStatus = revokeEstimateAcceptance(parsed.estimateStatus, {
      actor: user.name || user.email || 'Usuario actual',
      reason,
    });

    const updated = await db.estimate.update({
      where: { id },
      data: {
        status: nextStatus.issuance.status === 'NOT_ISSUED' ? 'DRAFT' : 'SENT',
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
    console.error('Error revoking estimate acceptance:', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudo revocar la aceptacion del estimate.' },
      { status: 400 }
    );
  }
}
