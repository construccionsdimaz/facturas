import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; suggestionId: string }> }
) {
  const { id, suggestionId } = await params;

  try {
    const data = await req.json();
    const status = data.status || 'PENDING_REVIEW';

    if (!['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'APPLIED'].includes(status)) {
      return NextResponse.json({ error: 'Estado de sugerencia no valido' }, { status: 400 });
    }

    const suggestion = await (db as any).recalibrationSuggestion.update({
      where: { id: suggestionId },
      data: {
        projectId: id,
        status,
        reviewNotes: data.reviewNotes ?? null,
        reviewedAt: status === 'PENDING_REVIEW' ? null : new Date(),
      },
    });

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error('Error updating recalibration suggestion:', error);
    return NextResponse.json({ error: 'Error al revisar la sugerencia' }, { status: 500 });
  }
}
