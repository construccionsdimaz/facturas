import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deriveInputFromSession } from '@/lib/discovery/derive-input';
import { evaluateDiscoveryForGenerate } from '@/lib/discovery/guard';
import { buildDiscoverySummary } from '@/lib/discovery/summary';
import { generateEstimateProposal } from '@/lib/automation/estimate-generator';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await db.discoverySession.findUnique({
      where: { id },
      include: {
        client: true,
        project: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Sesion discovery no encontrada.' }, { status: 404 });
    }

    const sessionData = session.sessionData as any;
    const evaluation = evaluateDiscoveryForGenerate(sessionData);

    if (!evaluation.canGenerate) {
      return NextResponse.json(
        {
          error: 'La sesion discovery no tiene informacion minima suficiente para generar propuesta.',
          blockers: evaluation.blockers,
          warnings: evaluation.warnings,
          assumptions: evaluation.assumptions,
        },
        { status: 400 }
      );
    }

    const derivedInput = deriveInputFromSession(
      sessionData,
      session.budgetGoal as any,
      session.precisionMode as any,
      evaluation.warnings,
      evaluation.assumptions,
      evaluation.confidenceLevel
    );

    const proposal = await generateEstimateProposal({
      workType: derivedInput.workType,
      siteType: derivedInput.siteType,
      scopeType: derivedInput.scopeType,
      area: Number(derivedInput.area) || 0,
      works: derivedInput.worksText,
      finishLevel: derivedInput.finishLevel,
      accessLevel: derivedInput.accessLevel,
      conditions: derivedInput.conditions,
      bathrooms: derivedInput.bathrooms,
      kitchens: derivedInput.kitchens,
      rooms: derivedInput.rooms,
      units: derivedInput.units,
      floors: derivedInput.floors,
      hasElevator: Boolean(derivedInput.hasElevator),
      structuralWorks: Boolean(derivedInput.structuralWorks),
    });

    const summary = buildDiscoverySummary(
      sessionData,
      evaluation.assumptions,
      evaluation.warnings,
      derivedInput.workType
    );

    const updatedSession = await db.discoverySession.update({
      where: { id },
      data: {
        status: 'PROPOSAL_GENERATED',
        completionStep: 6,
        completionPercent: 100,
        confidenceScore: evaluation.confidenceScore,
        confidenceLevel: evaluation.confidenceLevel,
        lastStepKey: 'condicionantes-resumen',
        derivedInput,
        summary,
        warnings: evaluation.warnings,
        assumptions: evaluation.assumptions,
      },
    });

    return NextResponse.json({
      session: updatedSession,
      derivedInput,
      summary,
      warnings: evaluation.warnings,
      assumptions: evaluation.assumptions,
      confidenceScore: evaluation.confidenceScore,
      confidenceLevel: evaluation.confidenceLevel,
      proposal,
      editorUrl: `/estimates/new?discoverySessionId=${session.id}${session.projectId ? `&projectId=${session.projectId}` : ''}`,
    });
  } catch (error) {
    console.error('Error generating discovery proposal:', error);
    return NextResponse.json({ error: 'No se pudo generar la propuesta desde discovery.' }, { status: 500 });
  }
}
