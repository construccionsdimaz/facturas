import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readCommercialEstimateReadModel } from '@/lib/estimates/internal-analysis';
import { buildProcurementProjection } from '@/lib/procurement/procurement-projection';
import { buildControlProjection } from '@/lib/control/control-projection';

function getBaselineActivities(snapshotData: any) {
  if (Array.isArray(snapshotData)) return snapshotData;
  if (snapshotData && Array.isArray(snapshotData.activities)) return snapshotData.activities;
  return [];
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const [
      activities,
      weeklyPlans,
      restrictions,
      supplies,
      baselines,
      changes,
      expenses,
      latestEstimate,
    ] = await Promise.all([
      (db as any).projectActivity.findMany({ where: { projectId: id } }),
      (db as any).weeklyPlan.findMany({ 
        where: { projectId: id },
        include: { activities: true }
      }),
      (db as any).restriction.findMany({ where: { projectId: id } }),
      (db as any).projectSupply.findMany({ where: { projectId: id } }),
      (db as any).projectBaseline.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 1 }),
      (db as any).projectChangeRequest.findMany({ where: { projectId: id } }),
      (db as any).projectExpense.findMany({ where: { projectId: id } }),
      (db as any).estimate.findFirst({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          discoverySession: true,
          internalAnalysis: {
            include: {
              lines: true,
            },
          },
        },
      }),
    ]);

    const now = new Date();

    // 1. Salud del Cronograma
    const totalActivities = activities.length;
    const completedActivities = activities.filter((a: any) => a.status === 'COMPLETED').length;
    const inProgressActivities = activities.filter((a: any) => a.status === 'IN_PROGRESS').length;
    const delayedActivities = activities.filter((a: any) => 
      a.status !== 'COMPLETED' && a.plannedEndDate && new Date(a.plannedEndDate) < now
    ).length;
    
    const avgProgress = totalActivities > 0 
      ? activities.reduce((acc: number, a: any) => acc + (a.realProgress || 0), 0) / totalActivities 
      : 0;

    // 2. PPC (Percentage of Plan Completed) - Últimas 4 semanas
    const last4WeeksPlans = weeklyPlans
      .sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, 4);
    
    const ppcData = last4WeeksPlans.map((wp: any) => {
      const total = wp.activities.length;
      const completed = wp.activities.filter((a: any) => a.status === 'COMPLETED').length;
      return {
        week: wp.weekName,
        ppc: total > 0 ? (completed / total) * 100 : 0
      };
    }).reverse();

    // 3. Salud Operativa (Restricciones y Suministros)
    const activeRestrictions = restrictions.filter((r: any) => r.status !== 'RESUELTA' && r.status !== 'CERRADA');
    const criticalRestrictions = activeRestrictions.filter((r: any) => r.priority === 'CRITICA').length;
    const overdueRestrictions = activeRestrictions.filter((r: any) => r.targetDate && new Date(r.targetDate) < now).length;

    const activeSupplies = supplies.filter((s: any) => s.status !== 'RECIBIDA');
    const criticalSuppliesRisk = activeSupplies.filter((s: any) => s.priority === 'CRITICA').length;
    const delayedSupplies = activeSupplies.filter((s: any) => s.requiredOnSiteDate && new Date(s.requiredOnSiteDate) < now).length;

    // 4. Preparación (Lookahead Readiness)
    // Tareas que empiezan en los próximos 15 días
    const lookaheadDate = new Date();
    lookaheadDate.setDate(now.getDate() + 15);
    const lookaheadActivities = activities.filter((a: any) => 
      a.status === 'PENDING' && a.plannedStartDate && new Date(a.plannedStartDate) <= lookaheadDate
    );
    const readyActivities = lookaheadActivities.filter((a: any) => {
      const hasOpenRestriction = restrictions.some((r: any) => r.projectActivityId === a.id && r.status !== 'RESUELTA');
      const hasMissingSupply = supplies.some((s: any) => s.projectActivityId === a.id && s.status !== 'RECIBIDA');
      return !hasOpenRestriction && !hasMissingSupply;
    }).length;

    // 5. Baseline y Estabilidad
    const currentBaseline = baselines[0];
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
    const procurementProjection =
      derivedInput?.executionContext || derivedInput?.recipeResult || derivedInput?.pricingResult
        ? await buildProcurementProjection({
            executionContext: derivedInput?.executionContext || null,
            recipeResult: derivedInput?.recipeResult || null,
            pricingResult: derivedInput?.pricingResult || null,
            includeDiscoveryHints: true,
            projectActivities: activities.map((activity: any) => ({
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
    const controlProjection = buildControlProjection({
      commercialRuntimeOutput: commercialReadModel.commercialRuntimeOutput,
      commercialEstimateProjection: commercialReadModel.commercialEstimateProjection,
      planningProjection: currentBaseline?.snapshotData?.planningProjection || null,
      procurementProjection,
      baselineSnapshot: currentBaseline?.snapshotData || null,
      activities,
      supplies,
      expenses,
    });
    let baselineDeviations = 0;
    if (currentBaseline && currentBaseline.snapshotData) {
      const baselineActivities = getBaselineActivities(currentBaseline.snapshotData);
      activities.forEach((act: any) => {
        const bAct = baselineActivities.find((ba: any) => ba.id === act.id);
        if (bAct && act.plannedEndDate && bAct.plannedEndDate && 
            new Date(act.plannedEndDate).getTime() !== new Date(bAct.plannedEndDate).getTime()) {
          baselineDeviations++;
        }
      });
    }

    const openChanges = changes.filter((c: any) => c.status === 'PROPUESTO' || c.status === 'REVISADO').length;

    return NextResponse.json({
      schedule: {
        totalActivities,
        completedActivities,
        inProgressActivities,
        delayedActivities,
        avgProgress,
        baselineDeviations
      },
      weekly: {
        ppcHistory: ppcData,
        currentWeekPpc: ppcData.length > 0 ? ppcData[ppcData.length - 1].ppc : 0
      },
      operations: {
        activeRestrictionsCount: activeRestrictions.length,
        criticalRestrictions,
        overdueRestrictions,
        activeSuppliesCount: activeSupplies.length,
        criticalSuppliesRisk,
        delayedSupplies
      },
      readiness: {
        lookaheadTotal: lookaheadActivities.length,
        readyCount: readyActivities
      },
      stability: {
        openChanges,
        baselineName: currentBaseline?.name || 'No fijada'
      },
      control: {
        source: controlProjection.source,
        totalDeviationLines: controlProjection.deviationSummary.totalLines,
        costDeviationLines: controlProjection.deviationSummary.costLines,
        timeDeviationLines: controlProjection.deviationSummary.timeLines,
        procurementDeviationLines: controlProjection.deviationSummary.procurementLines,
        criticalDeviationLines: controlProjection.deviationSummary.criticalLines,
      },
    });
  } catch (error) {
    console.error('Error calculating KPIs:', error);
    return NextResponse.json({ error: 'Error al calcular indicadores' }, { status: 500 });
  }
}
