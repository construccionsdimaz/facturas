import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deriveInputFromSession } from '@/lib/discovery/derive-input';
import { evaluateDiscoveryForGenerate } from '@/lib/discovery/guard';
import { buildDiscoverySummary } from '@/lib/discovery/summary';
import { generateEstimateProposal } from '@/lib/automation/estimate-generator';
import { buildPricingResult } from '@/lib/estimate/pricing-engine';
import { buildEstimateStatusFromPipeline } from '@/lib/estimate/estimate-status';
import { integratePricingIntoEstimateProposal } from '@/lib/estimate/estimate-integration';

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

    const pricingResult = await buildPricingResult(
      derivedInput.recipeResult,
      derivedInput.executionContext
    );

    derivedInput.pricingResult = pricingResult;

    const parametricProposal = await generateEstimateProposal({
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

    const estimateStatus = buildEstimateStatusFromPipeline({
      technicalSpecStatus:
        derivedInput.executionContext.project.technicalSpecStatus || 'INCOMPLETE',
      technicalCoveragePercent:
        derivedInput.executionContext.resolvedSpecs.completeness.specifiedScopePercent || 0,
      recipeCoveragePercent:
        derivedInput.recipeResult?.coverage.recipeCoveragePercent || 0,
      priceCoveragePercent:
        derivedInput.pricingResult?.coverage.priceCoveragePercent || 0,
      pendingValidationCount:
        derivedInput.pricingResult?.coverage.pendingValidationCount || 0,
      hasHybridBuckets:
        false,
    });

    const { proposal, runtimeOutput } = integratePricingIntoEstimateProposal(
      {
        ...parametricProposal,
        estimateStatus,
      },
      derivedInput.pricingResult,
      {
        recipeResult: derivedInput.recipeResult,
        measurementResult: derivedInput.measurementResult,
        executionContext: derivedInput.executionContext,
        estimateStatus,
      }
    );

    proposal.estimateStatus = buildEstimateStatusFromPipeline({
      technicalSpecStatus:
        derivedInput.executionContext.project.technicalSpecStatus || 'INCOMPLETE',
      technicalCoveragePercent:
        derivedInput.executionContext.resolvedSpecs.completeness.specifiedScopePercent || 0,
      recipeCoveragePercent:
        derivedInput.recipeResult?.coverage.recipeCoveragePercent || 0,
      priceCoveragePercent:
        derivedInput.pricingResult?.coverage.priceCoveragePercent || 0,
      pendingValidationCount:
        derivedInput.pricingResult?.coverage.pendingValidationCount || 0,
      hasHybridBuckets:
        proposal.commercialEstimateProjection.buckets.some((bucket) => bucket.source === 'HYBRID'),
      manualOverride: proposal.estimateStatus.manualOverride,
      issuance: proposal.estimateStatus.issuance,
      issuanceHistory: proposal.estimateStatus.issuanceHistory,
      acceptance: proposal.estimateStatus.acceptance,
      acceptanceHistory: proposal.estimateStatus.acceptanceHistory,
      commercialStatusOverride:
        proposal.estimateStatus.commercialStatus === 'CONVERTED' ||
        proposal.estimateStatus.commercialStatus === 'CANCELLED'
          ? proposal.estimateStatus.commercialStatus
          : null,
    });
    proposal.commercialEstimateProjection.status = proposal.estimateStatus;
    proposal.commercialRuntimeOutput.status = proposal.estimateStatus;
    proposal.commercialRuntimeOutput.projection.status = proposal.estimateStatus;

    if (derivedInput.pricingResult?.estimateMode === 'PARAMETRIC_PRELIMINARY') {
      proposal.notes.push(
        'Pricing todavia preliminar: falta cobertura real suficiente de receta/precio para considerar el estimate cerrado.'
      );
    } else if (derivedInput.pricingResult?.estimateMode === 'MIXED') {
      proposal.notes.push(
        'Pricing mixto: parte del estimate ya viene de recetas valoradas y parte sigue pendiente de validacion.'
      );
    } else {
      proposal.notes.push(
        'La propuesta integra buckets tecnicos valorados desde recipe + pricing para las familias cubiertas del vertical MVP.'
      );
    }

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
        derivedInput: JSON.parse(JSON.stringify(derivedInput)),
        summary: JSON.parse(JSON.stringify(summary)),
        warnings: JSON.parse(JSON.stringify(evaluation.warnings)),
        assumptions: JSON.parse(JSON.stringify(evaluation.assumptions)),
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
      commercialRuntimeOutput: {
        ...runtimeOutput,
        status: proposal.estimateStatus,
        projection: {
          ...runtimeOutput.projection,
          status: proposal.estimateStatus,
        },
      },
      proposal,
      editorUrl: `/estimates/new?discoverySessionId=${session.id}${session.projectId ? `&projectId=${session.projectId}` : ''}`,
    });
  } catch (error) {
    console.error('Error generating discovery proposal:', error);
    return NextResponse.json({ error: 'No se pudo generar la propuesta desde discovery.' }, { status: 500 });
  }
}
