import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizeInternalAnalysis, toEstimateInternalAnalysisCreate } from '@/lib/estimates/internal-analysis';

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
    const { number, clientId, subtotal, taxAmount, total, items, validUntil, language, projectId } = body;
    const internalAnalysis = normalizeInternalAnalysis(body.internalAnalysis);

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

    const newEstimate = await db.estimate.create({
      data: {
        number,
        userId: user.id,
        clientId,
        subtotal,
        taxAmount,
        total,
        language: language || 'ES',
        projectId: projectId || null,
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
