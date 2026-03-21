import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getOrCreateDefaultUser } from '@/lib/current-user';
import { createEmptyDiscoverySessionData, DISCOVERY_VERSION_DEFAULTS } from '@/lib/discovery/defaults';
import type { DiscoveryAssetType, BudgetGoal, PrecisionMode } from '@/lib/discovery/types';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const user = await getOrCreateDefaultUser();

    let clientId: string | null = body.clientId || null;
    let projectId: string | null = body.projectId || null;
    let title: string | null = body.title || null;
    const assetType = (body.assetType || 'PISO') as DiscoveryAssetType;
    const budgetGoal = (body.budgetGoal || 'COMERCIAL') as BudgetGoal;
    const precisionMode = (body.precisionMode || 'MEDIO') as PrecisionMode;

    if (projectId) {
      const project = await db.project.findUnique({
        where: { id: projectId },
        select: { id: true, clientId: true, name: true },
      });

      if (!project) {
        return NextResponse.json({ error: 'La obra indicada no existe.' }, { status: 400 });
      }

      projectId = project.id;
      clientId = project.clientId;
      title = title || `Discovery ${project.name}`;
    }

    const sessionData = createEmptyDiscoverySessionData(assetType);
    sessionData.classification.freeTextBrief = body.freeTextBrief || '';

    const session = await db.discoverySession.create({
      data: {
        userId: user.id,
        clientId,
        projectId,
        title,
        status: 'DRAFT',
        budgetGoal,
        precisionMode,
        completionStep: 1,
        completionPercent: 0,
        confidenceScore: 0,
        confidenceLevel: 'MEDIA',
        lastStepKey: 'clasificacion',
        discoverySchemaVersion: DISCOVERY_VERSION_DEFAULTS.discoverySchemaVersion,
        derivedInputVersion: DISCOVERY_VERSION_DEFAULTS.derivedInputVersion,
        summaryVersion: DISCOVERY_VERSION_DEFAULTS.summaryVersion,
        sessionData,
        warnings: [],
        assumptions: [],
      },
      include: {
        client: true,
        project: true,
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('Error creating discovery session:', error);
    return NextResponse.json({ error: 'No se pudo crear la sesion discovery.' }, { status: 500 });
  }
}
