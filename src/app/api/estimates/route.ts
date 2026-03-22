import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizeInternalAnalysis, toEstimateInternalAnalysisCreate } from '@/lib/estimates/internal-analysis';
import { materializeEstimateOperationalView } from '@/lib/estimate/estimate-runtime-materialization';

function sanitizeEstimateItems(items: any[] = []) {
  return items
    .map((item) => ({
      description: typeof item.description === 'string' ? item.description.trim() : '',
      quantity: Number(item.quantity),
      price: Number(item.price),
      unit: typeof item.unit === 'string' && item.unit.trim() ? item.unit.trim() : 'ud',
      chapter: typeof item.chapter === 'string' && item.chapter.trim() ? item.chapter.trim() : '01 GENERAL',
    }))
    .filter((item) => item.description || item.quantity > 0 || item.price > 0);
}

export async function GET() {
  try {
    const estimates = await db.estimate.findMany({
      include: {
        client: true,
        items: true,
        internalAnalysis: {
          include: {
            lines: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json(estimates);
  } catch (error) {
    console.error('Error fetching estimates:', error);
    return NextResponse.json({ error: 'Failed to fetch estimates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { number, clientId, subtotal, taxAmount, total, items, validUntil, language, projectId, discoverySessionId } = body;
    const internalAnalysis = normalizeInternalAnalysis(body.internalAnalysis);
    const operational = materializeEstimateOperationalView({
      generationNotes: internalAnalysis
        ? {
            notes: internalAnalysis.notes,
            estimateStatus: internalAnalysis.estimateStatus,
            integratedCostBuckets: internalAnalysis.integratedCostBuckets,
            commercialEstimateProjection: internalAnalysis.commercialEstimateProjection,
            commercialRuntimeOutput: internalAnalysis.commercialRuntimeOutput,
          }
        : undefined,
      commercialRuntimeOutput: internalAnalysis?.commercialRuntimeOutput,
      commercialEstimateProjection: internalAnalysis?.commercialEstimateProjection,
      estimateStatus: internalAnalysis?.estimateStatus,
      legacyItems: sanitizeEstimateItems(items),
      legacySummary: internalAnalysis?.summary,
    });
    const normalizedItems = sanitizeEstimateItems(operational.legacyItems);

    // Resolve Demo User
    let user = await db.user.findFirst();
    if (!user) {
      user = await db.user.create({
        data: { email: 'admin@dimaz.es', name: 'Admin', role: 'ADMIN' }
      });
    }

    if (!clientId) {
        return NextResponse.json(
            { error: 'clientId is required to create an estimate' }, 
            { status: 400 }
        );
    }

    if (normalizedItems.length === 0) {
      return NextResponse.json(
        { error: 'El presupuesto debe incluir al menos una partida valida antes de guardarlo.' },
        { status: 400 }
      );
    }

    const invalidItem = normalizedItems.find(
      (item) =>
        !item.description ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0 ||
        !Number.isFinite(item.price) ||
        item.price < 0
    );

    if (invalidItem) {
      return NextResponse.json(
        { error: 'Todas las partidas deben tener descripcion, cantidad mayor que 0 y precio valido.' },
        { status: 400 }
      );
    }

    if (projectId) {
      const project = await db.project.findUnique({
        where: { id: projectId },
        select: { id: true, clientId: true },
      });

      if (!project) {
        return NextResponse.json(
          { error: 'La obra seleccionada no existe o ya no esta disponible.' },
          { status: 400 }
        );
      }

      if (project.clientId !== clientId) {
        return NextResponse.json(
          { error: 'La obra seleccionada no pertenece al cliente elegido.' },
          { status: 400 }
        );
      }
    }

    if (discoverySessionId) {
      const session = await db.discoverySession.findUnique({
        where: { id: discoverySessionId },
        select: { id: true, clientId: true, projectId: true },
      });

      if (!session) {
        return NextResponse.json(
          { error: 'La sesion discovery indicada no existe.' },
          { status: 400 }
        );
      }

      if (session.clientId && session.clientId !== clientId) {
        return NextResponse.json(
          { error: 'La sesion discovery pertenece a otro cliente.' },
          { status: 400 }
        );
      }

      if (projectId && session.projectId && session.projectId !== projectId) {
        return NextResponse.json(
          { error: 'La sesion discovery pertenece a otra obra.' },
          { status: 400 }
        );
      }
    }

    const newEstimate = await db.estimate.create({
      data: {
        number,
        userId: user.id,
        clientId,
        subtotal: operational.summary.commercialSubtotal,
        taxAmount: operational.summary.vatAmount,
        total: operational.summary.commercialTotal,
        language: language || 'ES',
        projectId: projectId || null,
        discoverySessionId: discoverySessionId || null,
        validUntil: validUntil ? new Date(validUntil) : null,
        items: {
          create: normalizedItems.map((item: any) => ({
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
      } as any,
      include: {
        items: true,
        internalAnalysis: {
          include: {
            lines: true,
          },
        },
      }
    });

    return NextResponse.json(newEstimate, { status: 201 });
  } catch (error) {
    console.error('Error creating estimate:', error);
    return NextResponse.json({ error: 'Failed to create estimate' }, { status: 500 });
  }
}
