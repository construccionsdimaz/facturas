import { VerticalSolutionCode } from '@/lib/discovery/technical-spec-types';

export type ProductionActualsSummary = {
  projectId: string;
  totalActualHours: number;
  totalActualQuantity: number;
  averageProgressPercent: number;
  byFamily: Record<string, FamilyProductionSummary>;
  byActivity: Record<string, ActivityProductionSummary>;
  bySpace: Record<string, SpaceProductionSummary>;
};

export type FamilyProductionSummary = {
  familyCode: string;
  actualHours: number;
  actualQuantity: number;
  progressPercent: number; // Average or Weighted
};

export type ActivityProductionSummary = {
  activityId: string;
  actualHours: number;
  actualQuantity: number;
  progressPercent: number;
  lastUpdate: Date | string | null;
};

export type SpaceProductionSummary = {
  spaceId: string;
  actualHours: number;
  actualQuantity: number;
  progressPercent: number;
};

/**
 * Summarizes a list of production logs into a structured actuals summary.
 */
export function summarizeProductionLogs(
  projectId: string,
  logs: any[] // From Prisma
): ProductionActualsSummary {
  const summary: ProductionActualsSummary = {
    projectId,
    totalActualHours: 0,
    totalActualQuantity: 0,
    averageProgressPercent: 0,
    byFamily: {},
    byActivity: {},
    bySpace: {},
  };

  if (!logs.length) return summary;

  let totalWeight = 0;

  for (const log of logs) {
    summary.totalActualHours += log.actualHours || 0;
    
    // By Family
    if (log.familyCode) {
      if (!summary.byFamily[log.familyCode]) {
        summary.byFamily[log.familyCode] = {
          familyCode: log.familyCode,
          actualHours: 0,
          actualQuantity: 0,
          progressPercent: 0,
        };
      }
      summary.byFamily[log.familyCode].actualHours += log.actualHours || 0;
      summary.byFamily[log.familyCode].actualQuantity += log.actualQuantity || 0;
      // Note: progressPercent for family is harder to aggregate without weights (budget/planned), 
      // but we can use the max or latest for now as a signal.
      summary.byFamily[log.familyCode].progressPercent = Math.max(
        summary.byFamily[log.familyCode].progressPercent, 
        log.progressPercent || 0
      );
    }

    // By Activity
    if (log.activityId) {
      if (!summary.byActivity[log.activityId]) {
        summary.byActivity[log.activityId] = {
          activityId: log.activityId,
          actualHours: 0,
          actualQuantity: 0,
          progressPercent: 0,
          lastUpdate: null,
        };
      }
      const act = summary.byActivity[log.activityId];
      act.actualHours += log.actualHours || 0;
      act.actualQuantity += log.actualQuantity || 0;
      // For a specific activity, logs are usually cumulative or deltas. 
      // We assume the log reflects the CURRENT progress at that point or we sum deltas.
      // In this model, we take the highest progress reported for that activity.
      act.progressPercent = Math.max(act.progressPercent, log.progressPercent || 0);
      if (!act.lastUpdate || new Date(log.date) > new Date(act.lastUpdate)) {
        act.lastUpdate = log.date;
      }
    }

    // By Space
    if (log.spaceId) {
      if (!summary.bySpace[log.spaceId]) {
        summary.bySpace[log.spaceId] = {
          spaceId: log.spaceId,
          actualHours: 0,
          actualQuantity: 0,
          progressPercent: 0,
        };
      }
      summary.bySpace[log.spaceId].actualHours += log.actualHours || 0;
      summary.bySpace[log.spaceId].progressPercent = Math.max(
        summary.bySpace[log.spaceId].progressPercent, 
        log.progressPercent || 0
      );
    }
  }

  // Calculate overall progress as average of active families for simplicity in this foundation phase
  const families = Object.values(summary.byFamily);
  if (families.length > 0) {
    summary.averageProgressPercent = families.reduce((sum, f) => sum + f.progressPercent, 0) / families.length;
  }

  return summary;
}
