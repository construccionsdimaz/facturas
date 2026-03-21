import { db } from '@/lib/db';

const MIN_SAMPLES_FOR_SUGGESTION = 2;
const MIN_SIGNIFICANT_DELTA_PERCENT = 12;

type LearningResult = {
  summary: {
    costDeviations: number;
    scheduleDeviations: number;
    procurementDeviations: number;
    pendingSuggestions: number;
    notices: string[];
  };
  deviations: any[];
  suggestions: any[];
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function asDate(value?: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function diffDays(start?: Date | string | null, end?: Date | string | null) {
  const startDate = asDate(start);
  const endDate = asDate(end);
  if (!startDate || !endDate) return null;
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function toPercent(estimated?: number | null, actual?: number | null) {
  if (estimated === null || estimated === undefined || estimated === 0 || actual === null || actual === undefined) return null;
  return round2(((actual - estimated) / estimated) * 100);
}

function getSeverity(deltaPercent?: number | null) {
  const value = Math.abs(deltaPercent || 0);
  if (value >= 30) return 'CRITICA';
  if (value >= 15) return 'ALTA';
  if (value >= 8) return 'MEDIA';
  return 'INFO';
}

function getCommittedSupplyCost(supply: any) {
  const quantity = supply.quantity || 0;
  const actualUnitCost =
    supply.actualUnitCost ??
    (['PEDIDA', 'CONFIRMADA', 'EN_TRANSITO', 'RECIBIDA', 'RETRASADA'].includes(supply.status)
      ? supply.supplierOffer?.unitCost ?? null
      : null);
  const actualTotalCost =
    supply.actualTotalCost ??
    (actualUnitCost !== null && quantity ? round2(actualUnitCost * quantity) : null);

  return {
    actualUnitCost,
    actualTotalCost,
  };
}

function getExpectedSupplyCost(supply: any) {
  const quantity = supply.quantity || 0;
  const expectedUnitCost = supply.expectedUnitCost ?? supply.suggestedUnitCost ?? supply.suggestedSupplierOffer?.unitCost ?? null;
  const expectedTotalCost =
    supply.expectedTotalCost ??
    (expectedUnitCost !== null && quantity ? round2(expectedUnitCost * quantity) : null);

  return {
    expectedUnitCost,
    expectedTotalCost,
  };
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function pushDeviation(target: any[], input: any) {
  target.push({
    category: input.category,
    dimension: input.dimension,
    severity: input.severity ?? getSeverity(input.deltaPercent),
    status: input.status ?? 'DETECTED',
    title: input.title,
    description: input.description ?? null,
    targetCode: input.targetCode ?? null,
    targetName: input.targetName ?? null,
    estimatedValue: input.estimatedValue ?? null,
    actualValue: input.actualValue ?? null,
    deltaValue: input.deltaValue ?? null,
    deltaPercent: input.deltaPercent ?? null,
    unit: input.unit ?? null,
    evidenceCount: input.evidenceCount ?? 1,
    sourceRef: input.sourceRef ?? null,
    evidence: input.evidence ?? null,
  });
}

function pushSuggestion(target: any[], input: any) {
  target.push({
    suggestionType: input.suggestionType,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    targetCode: input.targetCode ?? null,
    targetName: input.targetName,
    status: input.status ?? 'PENDING_REVIEW',
    priority: input.priority ?? 'MEDIA',
    rationale: input.rationale,
    reviewNotes: input.reviewNotes ?? null,
    currentValue: input.currentValue ?? null,
    suggestedValue: input.suggestedValue ?? null,
    unit: input.unit ?? null,
    sampleSize: input.sampleSize ?? 1,
    confidence: input.confidence ?? 0,
    basis: input.basis ?? null,
    suggestedChanges: input.suggestedChanges ?? null,
    reviewedAt: input.reviewedAt ?? null,
  });
}

export async function rebuildProjectLearning(projectId: string): Promise<LearningResult> {
  const project = await (db as any).project.findUnique({
    where: { id: projectId },
    include: {
      estimates: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          internalAnalysis: {
            include: {
              lines: true,
            },
          },
        },
      },
      expenses: {
        include: {
          client: true,
          budgetLine: true,
        },
      },
      activities: {
        include: {
          standardActivity: true,
          wbs: true,
          location: true,
          progressLogs: true,
        },
      },
      supplies: {
        include: {
          material: true,
          supplier: true,
          suggestedSupplier: true,
          supplierOffer: true,
          suggestedSupplierOffer: true,
          estimateInternalLine: true,
          projectActivity: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error('Obra no encontrada');
  }

  const analysis = project.estimates[0]?.internalAnalysis || null;
  const deviations: any[] = [];
  const suggestions: any[] = [];
  const notices: string[] = [];

  if (!analysis) {
    notices.push('La obra no tiene presupuesto interno persistente para comparar coste estimado vs real.');
  }

  const expenses = project.expenses || [];
  const activities = project.activities || [];
  const supplies = project.supplies || [];

  const actualExpenseTotal = round2(expenses.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0));
  const completedActivities = activities.filter((activity: any) => activity.realStartDate && activity.realEndDate);
  const receivedSupplies = supplies.filter((supply: any) => supply.receivedDate && supply.orderDate);

  if (analysis) {
    const estimatedTotal = round2(analysis.internalCostTotal || 0);
    const totalDelta = round2(actualExpenseTotal - estimatedTotal);
    const totalDeltaPercent = toPercent(estimatedTotal, actualExpenseTotal);

    pushDeviation(deviations, {
      category: 'COST',
      dimension: 'PROJECT',
      title: 'Coste interno estimado vs gasto real registrado',
      description: actualExpenseTotal
        ? 'Compara el coste interno previsto del estimate con los gastos reales imputados hoy a la obra.'
        : 'No hay gasto real suficiente; la desviacion solo refleja presupuesto interno sin contraste operativo.',
      targetCode: analysis.typologyCode || project.projectType || 'PROJECT',
      targetName: project.name,
      estimatedValue: estimatedTotal,
      actualValue: actualExpenseTotal,
      deltaValue: totalDelta,
      deltaPercent: totalDeltaPercent,
      unit: 'EUR',
      evidenceCount: expenses.length,
      sourceRef: { analysisId: analysis.id, expenseCount: expenses.length },
      evidence: {
        materialEstimated: analysis.materialCostTotal,
        laborEstimated: analysis.laborCostTotal,
        associatedEstimated: analysis.associatedCostTotal,
      },
    });

    const chapterEstimate = new Map<string, { estimated: number; actual: number; lineIds: string[] }>();
    for (const line of analysis.lines || []) {
      const current = chapterEstimate.get(line.chapter) || { estimated: 0, actual: 0, lineIds: [] };
      current.estimated += line.materialCost || 0;
      current.lineIds.push(line.id);
      chapterEstimate.set(line.chapter, current);
    }

    for (const supply of supplies) {
      if (!supply.estimateInternalLine) continue;
      const current = chapterEstimate.get(supply.estimateInternalLine.chapter);
      if (!current) continue;
      const committed = getCommittedSupplyCost(supply);
      current.actual += committed.actualTotalCost || 0;
    }

    for (const [chapter, values] of chapterEstimate.entries()) {
      if (!values.actual && !values.estimated) continue;
      pushDeviation(deviations, {
        category: 'COST',
        dimension: 'CHAPTER',
        title: `Desvio de materiales en ${chapter}`,
        description: 'Compara el coste material estimado del presupuesto interno con el coste material observado/comprometido en suministros enlazados.',
        targetCode: chapter,
        targetName: chapter,
        estimatedValue: round2(values.estimated),
        actualValue: round2(values.actual),
        deltaValue: round2(values.actual - values.estimated),
        deltaPercent: toPercent(values.estimated, values.actual),
        unit: 'EUR',
        evidenceCount: values.lineIds.length,
        sourceRef: { internalLineIds: values.lineIds },
      });
    }

    for (const line of analysis.lines || []) {
      const linkedSupplies = supplies.filter((supply: any) => supply.estimateInternalLineId === line.id);
      const actualMaterialCost = round2(
        linkedSupplies.reduce((sum: number, supply: any) => sum + (getCommittedSupplyCost(supply).actualTotalCost || 0), 0)
      );
      if (!linkedSupplies.length) continue;
      pushDeviation(deviations, {
        category: 'COST',
        dimension: 'INTERNAL_LINE',
        title: `Desvio de coste material en linea ${line.description}`,
        description: 'Mide el coste material estimado de la linea frente al coste observado en suministros vinculados.',
        targetCode: line.code || line.chapter,
        targetName: line.description,
        estimatedValue: round2(line.materialCost || 0),
        actualValue: actualMaterialCost,
        deltaValue: round2(actualMaterialCost - (line.materialCost || 0)),
        deltaPercent: toPercent(line.materialCost || 0, actualMaterialCost),
        unit: 'EUR',
        evidenceCount: linkedSupplies.length,
        sourceRef: { lineId: line.id, chapter: line.chapter },
      });
    }
  }

  const materialGroups = new Map<string, { estimated: number; actual: number; count: number; material: any }>();
  const supplierGroups = new Map<string, { expectedLead: number[]; actualLead: number[]; count: number; supplier: any }>();

  for (const supply of supplies) {
    const expected = getExpectedSupplyCost(supply);
    const committed = getCommittedSupplyCost(supply);
    const materialKey = supply.materialId || `unmapped:${supply.description}`;
    const materialBucket =
      materialGroups.get(materialKey) || {
        estimated: 0,
        actual: 0,
        count: 0,
        material: supply.material || { name: supply.description, code: supply.material?.code || null },
      };
    materialBucket.estimated += expected.expectedTotalCost || 0;
    materialBucket.actual += committed.actualTotalCost || 0;
    materialBucket.count += 1;
    materialGroups.set(materialKey, materialBucket);

    const expectedLead = supply.leadTimeDays ?? supply.suggestedSupplierOffer?.leadTimeDays ?? null;
    const actualLead = diffDays(supply.orderDate, supply.receivedDate);
    if (supply.supplierId) {
      const bucket =
        supplierGroups.get(supply.supplierId) || {
          expectedLead: [],
          actualLead: [],
          count: 0,
          supplier: supply.supplier,
        };
      if (expectedLead !== null) bucket.expectedLead.push(expectedLead);
      if (actualLead !== null) bucket.actualLead.push(actualLead);
      bucket.count += 1;
      supplierGroups.set(supply.supplierId, bucket);
    }

    if ((expected.expectedTotalCost || committed.actualTotalCost) && supply.material) {
      pushDeviation(deviations, {
        category: 'PROCUREMENT',
        dimension: 'MATERIAL',
        title: `Coste esperado vs comprometido para ${supply.material.name}`,
        description: 'Compara la expectativa de compra del material con el coste comprometido/real del suministro.',
        targetCode: supply.material.code || supply.materialId,
        targetName: supply.material.name,
        estimatedValue: expected.expectedTotalCost,
        actualValue: committed.actualTotalCost,
        deltaValue:
          expected.expectedTotalCost !== null && committed.actualTotalCost !== null
            ? round2(committed.actualTotalCost - expected.expectedTotalCost)
            : null,
        deltaPercent: toPercent(expected.expectedTotalCost, committed.actualTotalCost),
        unit: 'EUR',
        evidenceCount: 1,
        sourceRef: { supplyId: supply.id },
      });
    }

    const observedLead = diffDays(supply.orderDate, supply.receivedDate);
    if (observedLead !== null && expectedLead !== null) {
      pushDeviation(deviations, {
        category: 'PROCUREMENT',
        dimension: 'LEAD_TIME',
        title: `Lead time observado para ${supply.description}`,
        description: 'Compara el plazo esperado del suministro con el plazo real observado entre pedido y recepcion.',
        targetCode: supply.material?.code || supply.id,
        targetName: supply.description,
        estimatedValue: expectedLead,
        actualValue: observedLead,
        deltaValue: round2(observedLead - expectedLead),
        deltaPercent: toPercent(expectedLead, observedLead),
        unit: 'dias',
        evidenceCount: 1,
        sourceRef: { supplyId: supply.id, supplierId: supply.supplierId },
      });
    }

    if (supply.suggestedSupplierId && supply.supplierId && supply.suggestedSupplierId !== supply.supplierId) {
      pushDeviation(deviations, {
        category: 'PROCUREMENT',
        dimension: 'SUPPLIER_DECISION',
        title: `Proveedor sugerido distinto al usado en ${supply.description}`,
        description: 'Registra cuando la compra real no coincide con la sugerencia del motor para aprender del criterio humano.',
        targetCode: supply.material?.code || supply.id,
        targetName: supply.description,
        estimatedValue: supply.suggestedUnitCost ?? supply.suggestedSupplierOffer?.unitCost ?? null,
        actualValue: committed.actualUnitCost,
        deltaValue:
          committed.actualUnitCost !== null && (supply.suggestedUnitCost ?? supply.suggestedSupplierOffer?.unitCost) !== null
            ? round2(committed.actualUnitCost - (supply.suggestedUnitCost ?? supply.suggestedSupplierOffer?.unitCost))
            : null,
        deltaPercent: toPercent(supply.suggestedUnitCost ?? supply.suggestedSupplierOffer?.unitCost, committed.actualUnitCost),
        unit: supply.unit || supply.supplierOffer?.unit || supply.suggestedSupplierOffer?.unit || 'ud',
        evidenceCount: 1,
        severity: 'MEDIA',
        sourceRef: {
          supplyId: supply.id,
          suggestedSupplierId: supply.suggestedSupplierId,
          usedSupplierId: supply.supplierId,
        },
      });
    }
  }

  for (const [key, material] of materialGroups.entries()) {
    if (!material.count || (!material.estimated && !material.actual)) continue;
    pushDeviation(deviations, {
      category: 'PROCUREMENT',
      dimension: 'MATERIAL',
      title: `Balance acumulado de material ${material.material?.name || key}`,
      description: 'Agrupa el coste esperado y el coste comprometido observado por material para detectar desviaciones repetidas.',
      targetCode: material.material?.code || key,
      targetName: material.material?.name || key,
      estimatedValue: round2(material.estimated),
      actualValue: round2(material.actual),
      deltaValue: round2(material.actual - material.estimated),
      deltaPercent: toPercent(material.estimated, material.actual),
      unit: 'EUR',
      evidenceCount: material.count,
      sourceRef: { materialKey: key },
    });
  }

  let delayedActivities = 0;
  for (const activity of activities) {
    const plannedDuration = activity.plannedDuration ?? null;
    const realDuration = diffDays(activity.realStartDate, activity.realEndDate);
    const plannedStart = asDate(activity.plannedStartDate);
    const plannedEnd = asDate(activity.plannedEndDate);
    const realStart = asDate(activity.realStartDate);
    const realEnd = asDate(activity.realEndDate);

    if (plannedEnd && ((realEnd && realEnd > plannedEnd) || (!realEnd && activity.realProgress > 0 && new Date() > plannedEnd))) {
      delayedActivities += 1;
    }

    if (plannedDuration && realDuration !== null) {
      pushDeviation(deviations, {
        category: 'SCHEDULE',
        dimension: 'ACTIVITY',
        title: `Duracion prevista vs real en ${activity.name}`,
        description: 'Compara la duracion planificada con la observada al cierre de la actividad.',
        targetCode: activity.code || activity.standardActivity?.code || activity.id,
        targetName: activity.name,
        estimatedValue: round2(plannedDuration),
        actualValue: round2(realDuration),
        deltaValue: round2(realDuration - plannedDuration),
        deltaPercent: toPercent(plannedDuration, realDuration),
        unit: 'dias',
        evidenceCount: (activity.progressLogs || []).length || 1,
        sourceRef: {
          activityId: activity.id,
          standardActivityId: activity.standardActivityId,
          typologyCode: activity.originTypologyCode,
        },
        evidence: {
          plannedStartDate: plannedStart,
          plannedEndDate: plannedEnd,
          realStartDate: realStart,
          realEndDate: realEnd,
        },
      });
    }
  }

  if (activities.length) {
    pushDeviation(deviations, {
      category: 'SCHEDULE',
      dimension: 'PROJECT',
      title: 'Retrasos observados en el cronograma de la obra',
      description: 'Resume cuantas actividades ya muestran retraso respecto al plan vigente.',
      targetCode: project.projectType || 'PROJECT',
      targetName: project.name,
      estimatedValue: activities.length,
      actualValue: delayedActivities,
      deltaValue: delayedActivities,
      deltaPercent: activities.length ? round2((delayedActivities / activities.length) * 100) : 0,
      unit: 'actividades',
      evidenceCount: activities.length,
      severity: delayedActivities > 0 ? (delayedActivities >= Math.ceil(activities.length * 0.25) ? 'ALTA' : 'MEDIA') : 'INFO',
    });
  }

  const completedByStandard = new Map<string, { name: string; planned: number[]; actual: number[]; productivityName?: string | null; activityIds: string[] }>();
  for (const activity of completedActivities) {
    const planned = activity.plannedDuration ?? null;
    const actual = diffDays(activity.realStartDate, activity.realEndDate);
    const key = activity.standardActivityId || activity.originProductivityRateName || activity.code || activity.id;
    if (!planned || actual === null) continue;
    const bucket =
      completedByStandard.get(key) || {
        name: activity.standardActivity?.name || activity.name,
        planned: [] as number[],
        actual: [] as number[],
        productivityName: activity.originProductivityRateName,
        activityIds: [] as string[],
      };
    bucket.planned.push(planned);
    bucket.actual.push(actual);
    bucket.activityIds.push(activity.id);
    completedByStandard.set(key, bucket);
  }

  for (const [key, bucket] of completedByStandard.entries()) {
    if (bucket.actual.length < MIN_SAMPLES_FOR_SUGGESTION) continue;
    const avgPlanned = round2(bucket.planned.reduce((sum, value) => sum + value, 0) / bucket.planned.length);
    const avgActual = round2(bucket.actual.reduce((sum, value) => sum + value, 0) / bucket.actual.length);
    const deltaPercent = toPercent(avgPlanned, avgActual);
    if (deltaPercent === null || Math.abs(deltaPercent) < MIN_SIGNIFICANT_DELTA_PERCENT) continue;

    pushSuggestion(suggestions, {
      suggestionType: 'PRODUCTIVITY_RATE_REVIEW',
      targetType: 'STANDARD_ACTIVITY',
      targetId: key,
      targetCode: bucket.productivityName || key,
      targetName: bucket.name,
      priority: Math.abs(deltaPercent) >= 25 ? 'ALTA' : 'MEDIA',
      rationale: `La actividad ${bucket.name} muestra una duracion real media ${deltaPercent > 0 ? 'superior' : 'inferior'} a la prevista en ${Math.abs(deltaPercent)}%.`,
      currentValue: avgPlanned,
      suggestedValue: avgActual,
      unit: 'dias',
      sampleSize: bucket.actual.length,
      confidence: bucket.actual.length >= 3 ? 0.78 : 0.62,
      basis: {
        activityIds: bucket.activityIds,
        productivityRateName: bucket.productivityName,
      },
      suggestedChanges: {
        action: 'REVISAR_RENDIMIENTO',
        scope: 'PRODUCTIVITY_RATE',
        note: 'Revisar la productividad base o el factor de complejidad aplicado.',
      },
    });
  }

  const costByLineCode = new Map<string, { name: string; estimated: number[]; actual: number[]; lineIds: string[] }>();
  for (const supply of supplies.filter((item: any) => item.estimateInternalLine)) {
    const line = supply.estimateInternalLine;
    const actual = getCommittedSupplyCost(supply).actualTotalCost;
    if (actual === null || actual === undefined) continue;
    const key = line.code || line.id;
    const bucket =
      costByLineCode.get(key) || {
        name: line.description,
        estimated: [] as number[],
        actual: [] as number[],
        lineIds: [] as string[],
      };
    bucket.estimated.push(line.materialCost || 0);
    bucket.actual.push(actual);
    bucket.lineIds.push(line.id);
    costByLineCode.set(key, bucket);
  }

  for (const [key, bucket] of costByLineCode.entries()) {
    if (bucket.actual.length < MIN_SAMPLES_FOR_SUGGESTION) continue;
    const avgEstimated = round2(bucket.estimated.reduce((sum, value) => sum + value, 0) / bucket.estimated.length);
    const avgActual = round2(bucket.actual.reduce((sum, value) => sum + value, 0) / bucket.actual.length);
    const deltaPercent = toPercent(avgEstimated, avgActual);
    if (deltaPercent === null || Math.abs(deltaPercent) < MIN_SIGNIFICANT_DELTA_PERCENT) continue;

    pushSuggestion(suggestions, {
      suggestionType: 'COST_ITEM_MATERIAL_REVIEW',
      targetType: 'COST_ITEM',
      targetCode: key,
      targetName: bucket.name,
      priority: Math.abs(deltaPercent) >= 20 ? 'ALTA' : 'MEDIA',
      rationale: `La linea ${bucket.name} esta desviando el coste material medio en ${Math.abs(deltaPercent)}%.`,
      currentValue: avgEstimated,
      suggestedValue: avgActual,
      unit: 'EUR',
      sampleSize: bucket.actual.length,
      confidence: bucket.actual.length >= 3 ? 0.75 : 0.58,
      basis: { lineIds: bucket.lineIds },
      suggestedChanges: {
        action: 'REVISAR_COSTE_TIPO',
        scope: 'TYPOLOGY_COST_ITEM',
        note: 'Revisar coste material, merma o consumo tipo asociado a la partida.',
      },
    });
  }

  for (const [supplierId, bucket] of supplierGroups.entries()) {
    const leadSamples = Math.min(bucket.expectedLead.length, bucket.actualLead.length);
    if (leadSamples < MIN_SAMPLES_FOR_SUGGESTION) continue;
    const expectedAverage = round2(bucket.expectedLead.reduce((sum, value) => sum + value, 0) / bucket.expectedLead.length);
    const actualAverage = round2(bucket.actualLead.reduce((sum, value) => sum + value, 0) / bucket.actualLead.length);
    const deltaPercent = toPercent(expectedAverage, actualAverage);
    if (deltaPercent === null || Math.abs(deltaPercent) < MIN_SIGNIFICANT_DELTA_PERCENT) continue;

    pushSuggestion(suggestions, {
      suggestionType: 'SUPPLIER_LEAD_TIME_REVIEW',
      targetType: 'SUPPLIER',
      targetId: supplierId,
      targetCode: bucket.supplier?.name || supplierId,
      targetName: bucket.supplier?.name || supplierId,
      priority: deltaPercent > 0 ? 'ALTA' : 'MEDIA',
      rationale: `El proveedor ${bucket.supplier?.name || supplierId} esta entregando ${deltaPercent > 0 ? 'mas lento' : 'mas rapido'} de lo esperado de forma repetida.`,
      currentValue: expectedAverage,
      suggestedValue: actualAverage,
      unit: 'dias',
      sampleSize: leadSamples,
      confidence: leadSamples >= 3 ? 0.8 : 0.61,
      basis: {
        expectedLeadSamples: bucket.expectedLead,
        actualLeadSamples: bucket.actualLead,
      },
      suggestedChanges: {
        action: 'REVISAR_LEAD_TIME',
        scope: 'SUPPLIER_OFFER',
        note: 'Ajustar el lead time orientativo o revisar la preferencia de proveedor.',
      },
    });
  }

  if (!expenses.length) {
    notices.push('No hay gastos reales imputados; la comparacion de coste de obra es parcial.');
  }
  if (!completedActivities.length) {
    notices.push('No hay actividades completadas con fechas reales suficientes; la recalibracion temporal aun es limitada.');
  }
  if (!receivedSupplies.length) {
    notices.push('No hay suministros con pedido y recepcion real; la comparacion de lead time es todavia parcial.');
  }

  const cleanDeviations = uniqueById(
    deviations.map((item, index) => ({
      id: `${item.category}-${item.dimension}-${item.targetCode || item.targetName || index}`,
      ...item,
    }))
  ).map(({ id, ...item }) => item);

  const cleanSuggestions = uniqueById(
    suggestions.map((item, index) => ({
      id: `${item.suggestionType}-${item.targetCode || item.targetName || index}`,
      ...item,
    }))
  ).map(({ id, ...item }) => item);

  await (db as any).$transaction(async (tx: any) => {
    await tx.learningDeviation.deleteMany({ where: { projectId } });
    await tx.recalibrationSuggestion.deleteMany({ where: { projectId } });

    for (const deviation of cleanDeviations) {
      await tx.learningDeviation.create({
        data: {
          projectId,
          ...deviation,
        },
      });
    }

    for (const suggestion of cleanSuggestions) {
      await tx.recalibrationSuggestion.create({
        data: {
          projectId,
          ...suggestion,
        },
      });
    }
  });

  const persistedDeviations = await (db as any).learningDeviation.findMany({
    where: { projectId },
    orderBy: [
      { severity: 'desc' },
      { updatedAt: 'desc' },
    ],
  });

  const persistedSuggestions = await (db as any).recalibrationSuggestion.findMany({
    where: { projectId },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return {
    summary: {
      costDeviations: persistedDeviations.filter((item: any) => item.category === 'COST').length,
      scheduleDeviations: persistedDeviations.filter((item: any) => item.category === 'SCHEDULE').length,
      procurementDeviations: persistedDeviations.filter((item: any) => item.category === 'PROCUREMENT').length,
      pendingSuggestions: persistedSuggestions.filter((item: any) => item.status === 'PENDING_REVIEW').length,
      notices,
    },
    deviations: persistedDeviations,
    suggestions: persistedSuggestions,
  };
}

export async function getProjectLearning(projectId: string, refresh = false): Promise<LearningResult> {
  const deviationCount = await (db as any).learningDeviation.count({ where: { projectId } });
  const suggestionCount = await (db as any).recalibrationSuggestion.count({ where: { projectId } });

  if (refresh || (!deviationCount && !suggestionCount)) {
    return rebuildProjectLearning(projectId);
  }

  const deviations = await (db as any).learningDeviation.findMany({
    where: { projectId },
    orderBy: [
      { severity: 'desc' },
      { updatedAt: 'desc' },
    ],
  });

  const suggestions = await (db as any).recalibrationSuggestion.findMany({
    where: { projectId },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return {
    summary: {
      costDeviations: deviations.filter((item: any) => item.category === 'COST').length,
      scheduleDeviations: deviations.filter((item: any) => item.category === 'SCHEDULE').length,
      procurementDeviations: deviations.filter((item: any) => item.category === 'PROCUREMENT').length,
      pendingSuggestions: suggestions.filter((item: any) => item.status === 'PENDING_REVIEW').length,
      notices: [],
    },
    deviations,
    suggestions,
  };
}
