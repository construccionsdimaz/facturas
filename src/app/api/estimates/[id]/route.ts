import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizeInternalAnalysis, toEstimateInternalAnalysisCreate } from '@/lib/estimates/internal-analysis';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const estimate = await (db.estimate as any).findUnique({
      where: { id },
      include: {
        client: true,
        items: true,
        internalAnalysis: {
          include: {
            lines: true,
          },
        },
      },
    });

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    return NextResponse.json(estimate);
  } catch (error) {
    console.error('Error fetching estimate:', error);
    return NextResponse.json({ error: 'Failed to fetch estimate' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { number, clientId, subtotal, taxAmount, total, items, status, validUntil, language, issueDate, discoverySessionId } = body;
    const internalAnalysis = normalizeInternalAnalysis(body.internalAnalysis);

    if (discoverySessionId) {
      const session = await db.discoverySession.findUnique({
        where: { id: discoverySessionId },
        select: { id: true, clientId: true },
      });

      if (!session) {
        return NextResponse.json({ error: 'La sesion discovery indicada no existe.' }, { status: 400 });
      }

      if (session.clientId && session.clientId !== clientId) {
        return NextResponse.json({ error: 'La sesion discovery pertenece a otro cliente.' }, { status: 400 });
      }
    }

    // Delete existing items and create new ones for simplicity
    await db.estimateItem.deleteMany({
      where: { estimateId: id },
    });

    if (internalAnalysis) {
      const existingInternalAnalysis = await db.estimateInternalAnalysis.findUnique({
        where: { estimateId: id },
        select: { id: true },
      });

      if (existingInternalAnalysis) {
        await db.estimateInternalLine.deleteMany({
          where: {
            analysisId: existingInternalAnalysis.id,
          },
        });
      }

      await db.estimateInternalAnalysis.deleteMany({
        where: { estimateId: id },
      });
    }

    const updatedEstimate = await db.estimate.update({
      where: { id },
      data: {
        number,
        clientId,
        subtotal,
        taxAmount,
        total,
        status,
        language,
        discoverySessionId: discoverySessionId || null,
        issueDate: issueDate ? new Date(issueDate) : undefined,
        validUntil: validUntil ? new Date(validUntil) : null,
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            unit: item.unit || 'ud',
            chapter: item.chapter || '01 GENERAL',
          })),
        },
        internalAnalysis: internalAnalysis ? {
          create: toEstimateInternalAnalysisCreate(internalAnalysis),
        } : undefined,
      },
      include: {
        items: true,
        internalAnalysis: {
          include: {
            lines: true,
          },
        },
      },
    } as any);

    return NextResponse.json(updatedEstimate);
  } catch (error) {
    console.error('Error updating estimate:', error);
    return NextResponse.json({ error: 'Failed to update estimate' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await (db.estimate as any).delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Estimate deleted successfully' });
  } catch (error) {
    console.error('Error deleting estimate:', error);
    return NextResponse.json({ error: 'Failed to delete estimate' }, { status: 500 });
  }
}
