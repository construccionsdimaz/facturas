import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getOrCreateDefaultUser } from '@/lib/current-user';
import {
  issueEstimate,
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
    const mode = body.mode === 'FINAL' ? 'FINAL' : body.mode === 'PROVISIONAL' ? 'PROVISIONAL' : null;
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const useOverride = Boolean(body.useOverride);

    if (!mode) {
      return NextResponse.json(
        { error: 'El modo de emision debe ser PROVISIONAL o FINAL.' },
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
        { error: 'El estimate no tiene analisis interno para gobernar su emision.' },
        { status: 400 }
      );
    }

    if (estimate.status === 'CONVERTED') {
      return NextResponse.json(
        { error: 'No se puede emitir un estimate ya convertido.' },
        { status: 400 }
      );
    }

    const parsed = parseGenerationNotes(estimate.internalAnalysis.generationNotes);
    if (!parsed.estimateStatus) {
      return NextResponse.json(
        { error: 'No existe estimateStatus persistido para decidir la emision.' },
        { status: 400 }
      );
    }

    const user = await getOrCreateDefaultUser();
    const nextStatus = issueEstimate(parsed.estimateStatus, {
      mode,
      actor: user.name || user.email || 'Usuario actual',
      reason,
      useOverride,
    });

    const updated = await db.estimate.update({
      where: { id },
      data: {
        status: 'SENT',
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
    console.error('Error issuing estimate:', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudo emitir el estimate.' },
      { status: 400 }
    );
  }
}
