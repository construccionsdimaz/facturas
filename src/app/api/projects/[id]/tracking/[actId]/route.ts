import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string, actId: string }> }
) {
  const { actId } = await params;
  try {
    const logs = await (db as any).activityProgressLog.findMany({
      where: { projectActivityId: actId },
      orderBy: { reportDate: 'desc' }
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Error cargando el historial táctico' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string, actId: string }> }
) {
  const { actId } = await params;
  try {
    const data = await req.json();

    const activityBefore = await (db as any).projectActivity.findUnique({
      where: { id: actId }
    });

    if (!activityBefore) {
      return NextResponse.json({ error: 'Actividad fantasma' }, { status: 404 });
    }

    // Calcular las fechastransaccionales a estampar
    let newStartDate = activityBefore.realStartDate;
    let newEndDate = activityBefore.realEndDate;

    if (!newStartDate && ['EN_CURSO', 'TERMINADA'].includes(data.statusReported)) {
      newStartDate = new Date(data.reportDate || new Date());
    }
    if (data.statusReported === 'TERMINADA' && !newEndDate) {
      newEndDate = new Date(data.reportDate || new Date());
    }
    // Si la pasa de Terminada a En Curso por un remate:
    if (data.statusReported !== 'TERMINADA') {
      newEndDate = null; 
    }

    // Transacción masiva Prisma: Creas el LOG histórico temporal, y actualizas la caché madre.
    const [_, updatedAct] = await (db as any).$transaction([
      (db as any).activityProgressLog.create({
        data: {
          projectActivityId: actId,
          reportDate: data.reportDate ? new Date(data.reportDate) : new Date(),
          statusReported: data.statusReported,
          progressReported: data.progressReported,
          executionNotes: data.executionNotes,
          incidences: data.incidences,
          reporterName: data.reporterName
        }
      }),
      (db as any).projectActivity.update({
        where: { id: actId },
        data: {
          realStatus: data.statusReported,
          realProgress: data.progressReported,
          realStartDate: newStartDate,
          realEndDate: newEndDate
        }
      })
    ]);

    return NextResponse.json(updatedAct);
  } catch (error) {
    console.error('Error posting tracking log:', error);
    return NextResponse.json({ error: 'Error inyectando novedad real' }, { status: 500 });
  }
}
