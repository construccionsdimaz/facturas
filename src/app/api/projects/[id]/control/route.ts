import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readCommercialEstimateReadModel } from '@/lib/estimates/internal-analysis';
import { resolveProjectLaborRatePolicy } from '@/lib/estimate/project-labor-rate-policy';
import { buildProcurementProjection } from '@/lib/procurement/procurement-projection';
import { buildControlProjection } from '@/lib/control/control-projection';
import { resolveProjectSourcingPolicy } from '@/lib/procurement/project-sourcing-policy';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const project = await (db as any).project.findUnique({
      where: { id },
      include: {
        estimates: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            discoverySession: true,
            internalAnalysis: {
              include: {
                lines: true,
              },
            },
          },
        },
        baselines: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        activities: true,
        supplies: {
          include: {
            estimateInternalLine: true,
            material: true,
          },
        },
        expenses: true,
        productionLogs: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });
    }

    const latestEstimate = project.estimates[0] || null;
    const commercialReadModel = latestEstimate?.internalAnalysis
      ? readCommercialEstimateReadModel({
          generationNotes: latestEstimate.internalAnalysis.generationNotes,
        })
      : {
          source: 'LEGACY',
          commercialRuntimeOutput: null,
          commercialEstimateProjection: null,
        };

    const derivedInput = (latestEstimate?.discoverySession?.derivedInput as any) || null;
    const resolvedSourcingPolicy = resolveProjectSourcingPolicy({
      executionContext: derivedInput?.executionContext || null,
      projectPolicy: project.sourcingPolicy,
    });
    const resolvedLaborRatePolicy = resolveProjectLaborRatePolicy({
      projectPolicy: project.laborRatePolicy,
    });
    const procurementProjection =
      derivedInput?.executionContext || derivedInput?.recipeResult || derivedInput?.pricingResult
        ? await buildProcurementProjection({
            executionContext: derivedInput?.executionContext || null,
            recipeResult: derivedInput?.recipeResult || null,
            pricingResult: derivedInput?.pricingResult || null,
            sourcingPolicy: resolvedSourcingPolicy.policy,
            includeDiscoveryHints: true,
            projectActivities: project.activities.map((activity: any) => ({
              id: activity.id,
              name: activity.name,
              code: activity.code,
              locationId: activity.locationId,
              wbsId: activity.wbsId,
              plannedStartDate: activity.plannedStartDate,
              plannedEndDate: activity.plannedEndDate,
              originCostItemCode: activity.originCostItemCode,
              standardActivity: null,
            })),
          })
        : null;

    const latestBaseline = project.baselines[0] || null;
    const controlProjection = buildControlProjection({
      commercialRuntimeOutput: commercialReadModel.commercialRuntimeOutput,
      commercialEstimateProjection: commercialReadModel.commercialEstimateProjection,
      planningProjection: (latestBaseline?.snapshotData as any)?.planningProjection || null,
      procurementProjection,
      baselineSnapshot: latestBaseline?.snapshotData || null,
      laborRatePolicy: resolvedLaborRatePolicy,
      activities: project.activities,
      supplies: project.supplies,
      expenses: project.expenses,
      productionLogs: project.productionLogs,
    });

    return NextResponse.json({
      source: controlProjection.source,
      sourcingPolicy: resolvedSourcingPolicy,
      laborRatePolicy: resolvedLaborRatePolicy,
      controlProjection,
    });
  } catch (error) {
    console.error('Error building control projection:', error);
    return NextResponse.json(
      { error: 'No se pudo construir el control canónico de la obra' },
      { status: 500 },
    );
  }
}
