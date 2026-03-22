import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureProcurementCatalog } from '@/lib/procurement/catalog';
import {
  buildProcurementProjection,
  procurementProjectionLineToProjectSupply,
} from '@/lib/procurement/procurement-projection';
import { resolveProjectSourcingPolicy } from '@/lib/procurement/project-sourcing-policy';

function makeExistingKey(params: {
  projectActivityId?: string | null;
  materialId?: string | null;
  description: string;
  category: string;
}) {
  return `${params.projectActivityId || ''}|${params.materialId || ''}|${params.description.toLowerCase()}|${params.category}`;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    await ensureProcurementCatalog();

    const body = await req.json().catch(() => ({}));
    const replaceExisting = Boolean(body.replaceExisting);
    const onlyCritical = Boolean(body.onlyCritical);
    const mode = body.mode === 'activities' || body.mode === 'hybrid' ? body.mode : 'estimate';

    const project = await db.project.findUnique({
      where: { id },
      include: {
        estimates: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            discoverySession: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });
    }

    const activities = await db.projectActivity.findMany({
      where: { projectId: id },
      include: {
        standardActivity: {
          include: {
            materialTemplates: {
              include: {
                material: {
                  include: {
                    offers: {
                      where: { status: 'ACTIVA' },
                      include: {
                        supplier: {
                          select: { id: true, name: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ plannedStartDate: 'asc' }, { createdAt: 'asc' }],
    });

    const latestEstimate = project.estimates[0];
    const derivedInput = (latestEstimate?.discoverySession?.derivedInput as any) || null;

    const resolvedSourcingPolicy = resolveProjectSourcingPolicy({
      executionContext: derivedInput?.executionContext || null,
      projectPolicy: project.sourcingPolicy,
    });

    const procurementProjection = await buildProcurementProjection({
      executionContext: derivedInput?.executionContext || null,
      recipeResult: derivedInput?.recipeResult || null,
      pricingResult: derivedInput?.pricingResult || null,
      sourcingPolicy: resolvedSourcingPolicy.policy,
      includeDiscoveryHints: mode !== 'estimate',
      projectActivities: activities.map((activity) => ({
        id: activity.id,
        name: activity.name,
        code: activity.code,
        locationId: activity.locationId,
        wbsId: activity.wbsId,
        plannedStartDate: activity.plannedStartDate,
        plannedEndDate: activity.plannedEndDate,
        originCostItemCode: activity.originCostItemCode,
        standardActivity: activity.standardActivity
          ? {
              code: activity.standardActivity.code,
              materialTemplates: activity.standardActivity.materialTemplates.map((template) => ({
                materialId: template.materialId,
                unit: template.unit,
                criticality: template.criticality,
                material: {
                  id: template.material.id,
                  code: template.material.code,
                  name: template.material.name,
                  category: template.material.category,
                  baseUnit: template.material.baseUnit,
                  offers: template.material.offers.map((offer) => ({
                    id: offer.id,
                    supplierId: offer.supplierId,
                    unitCost: offer.unitCost,
                    unit: offer.unit,
                    leadTimeDays: offer.leadTimeDays,
                    isPreferred: offer.isPreferred,
                    supplier: offer.supplier
                      ? { id: offer.supplier.id, name: offer.supplier.name }
                      : null,
                  })),
                },
              })),
            }
          : null,
      })),
    });

    if (replaceExisting) {
      await db.projectSupply.deleteMany({ where: { projectId: id } });
    }

    const existingSupplies = await db.projectSupply.findMany({
      where: { projectId: id },
      select: {
        projectActivityId: true,
        materialId: true,
        description: true,
        category: true,
      },
    });
    const existingKeys = new Set(existingSupplies.map((item) => makeExistingKey(item)));

    const created: Array<{ id: string; description: string; materialCode: string }> = [];
    const issues: string[] = [...procurementProjection.warnings];

    for (const line of procurementProjection.procurementLines) {
      const createData = procurementProjectionLineToProjectSupply(line, id);
      if (
        onlyCritical &&
        createData.priority !== 'CRITICA'
      ) {
        continue;
      }

      const key = makeExistingKey({
        projectActivityId: createData.projectActivityId,
        materialId: createData.materialId,
        description: createData.description,
        category: createData.category,
      });
      if (existingKeys.has(key)) continue;

      const supply = await (db as any).projectSupply.create({
        data: createData,
      });
      existingKeys.add(key);
      created.push({
        id: supply.id,
        description: supply.description,
        materialCode: line.materialCode,
      });
    }

    return NextResponse.json({
      created: created.length,
      source: procurementProjection.source,
      sourcingPolicySource: resolvedSourcingPolicy.source,
      sourcingStrategy: resolvedSourcingPolicy.policy.strategy,
      supplies: created,
      issues: uniqueIssues(issues),
      discoveryContextUsed: Boolean(derivedInput?.executionContext),
      procurementProjection: {
        source: procurementProjection.source,
        coverage: procurementProjection.coverage,
        lines: procurementProjection.procurementLines.length,
        recipeLines: procurementProjection.recipeLines.length,
        pricingLines: procurementProjection.pricingLines.length,
        hints: procurementProjection.supplyHints.length,
      },
    });
  } catch (error) {
    console.error('Error generating supplies:', error);
    return NextResponse.json(
      { error: 'No se pudieron generar los suministros automaticos' },
      { status: 500 },
    );
  }
}

function uniqueIssues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
