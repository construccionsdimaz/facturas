import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureProcurementCatalog } from '@/lib/procurement/catalog';
import { buildDiscoverySupplyHints } from '@/lib/procurement/discovery-context';
import {
  addDays,
  chooseSupplierOffer,
  evaluateConsumption,
  evaluateScheduleRisk,
} from '@/lib/procurement/sourcing';

function fallbackActivityHeuristic(activityName: string) {
  const text = activityName.toLowerCase();
  if (/demolic|derribo|retirada/.test(text)) {
    return { category: 'RESIDUOS', description: 'Contenedor, retirada de escombros y gestion de residuos', priority: 'CRITICA', leadTimeDays: 3, quantity: 1, unit: 'ud' };
  }
  if (/instal/.test(text)) {
    return { category: 'INSTALACIONES', description: 'Materiales generales de instalaciones', priority: 'ALTA', leadTimeDays: 5, quantity: 1, unit: 'ud' };
  }
  if (/carpinter|puerta/.test(text)) {
    return { category: 'CARPINTERIA', description: 'Carpinterias interiores y remates', priority: 'ALTA', leadTimeDays: 12, quantity: 1, unit: 'ud' };
  }
  if (/suelo|pintur|acabado|revest/.test(text)) {
    return { category: 'ACABADOS', description: 'Acabados, revestimientos y consumibles', priority: 'NORMAL', leadTimeDays: 4, quantity: 1, unit: 'ud' };
  }
  return { category: 'OTROS', description: `Suministro asociado a ${activityName}`, priority: 'NORMAL', leadTimeDays: 4, quantity: 1, unit: 'ud' };
}

function makeExistingKey(params: { projectActivityId?: string | null; materialId?: string | null; description: string; category: string }) {
  return `${params.projectActivityId || ''}|${params.materialId || ''}|${params.description.toLowerCase()}|${params.category}`;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await ensureProcurementCatalog();

    const body = await req.json().catch(() => ({}));
    const replaceExisting = Boolean(body.replaceExisting);
    const onlyCritical = Boolean(body.onlyCritical);
    const mode = body.mode === 'activities' || body.mode === 'hybrid' ? body.mode : 'estimate';
    const strategy = body.strategy === 'CHEAPEST' || body.strategy === 'FASTEST' || body.strategy === 'PREFERRED' ? body.strategy : 'BALANCED';
    const referenceDate = new Date();

    const project = await db.project.findUnique({
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
            items: true,
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
        wbs: true,
        location: true,
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
      orderBy: [
        { plannedStartDate: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    const latestEstimate = project.estimates[0];
    const estimateInternalAnalysis = latestEstimate?.internalAnalysis;
    const executionContext = (latestEstimate?.discoverySession?.derivedInput as any)?.executionContext || null;
    const discoveryHints = buildDiscoverySupplyHints(executionContext);

    const typology = estimateInternalAnalysis?.typologyCode
      ? await db.projectTypology.findUnique({
          where: { code: estimateInternalAnalysis.typologyCode },
          include: {
            costItems: {
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
        })
      : null;

    const costItemMap = new Map<string, any>((typology?.costItems || []).map((item: any) => [item.code, item]));
    const activityByCostItem = new Map<string, any>();
    const activityByStandardCode = new Map<string, any>();

    for (const activity of activities) {
      if (activity.originCostItemCode && !activityByCostItem.has(activity.originCostItemCode)) {
        activityByCostItem.set(activity.originCostItemCode, activity);
      }
      if (activity.standardActivity?.code && !activityByStandardCode.has(activity.standardActivity.code)) {
        activityByStandardCode.set(activity.standardActivity.code, activity);
      }
    }

    if (replaceExisting) {
      await db.projectSupply.deleteMany({ where: { projectId: id } });
    }

    const existingSupplies = await db.projectSupply.findMany({
      where: { projectId: id },
      select: { projectActivityId: true, materialId: true, description: true, category: true },
    });
    const existingKeys = new Set(existingSupplies.map((item) => makeExistingKey(item)));

    const created: Array<{ id: string; description: string; material?: string | null }> = [];
    const issues: string[] = [];

    if ((mode === 'estimate' || mode === 'hybrid') && estimateInternalAnalysis?.lines?.length) {
      for (const line of estimateInternalAnalysis.lines) {
        const costItem = line.code ? costItemMap.get(line.code) : null;
        if (!costItem?.materialTemplates?.length) {
          issues.push(`La linea interna ${line.description} no tiene materiales maestros asociados.`);
          continue;
        }

        const linkedActivity =
          (line.code ? activityByCostItem.get(line.code) : null) ||
          (line.standardActivityCode ? activityByStandardCode.get(line.standardActivityCode) : null) ||
          null;

        const requiredOnSiteDate =
          linkedActivity?.plannedStartDate ||
          linkedActivity?.plannedEndDate ||
          addDays(referenceDate, 7);

        for (const template of costItem.materialTemplates) {
          const baseQuantity = evaluateConsumption(template.consumptionRule as Record<string, unknown> | null, {
            lineQuantity: line.quantity,
          });
          const quantity = Number((baseQuantity * (1 + (template.wasteFactor || 0))).toFixed(2));
          if (quantity <= 0) continue;

          const suggestion = chooseSupplierOffer(
            template.material.offers,
            requiredOnSiteDate,
            strategy,
            referenceDate
          );
          const key = makeExistingKey({
            projectActivityId: linkedActivity?.id || null,
            materialId: template.materialId,
            description: template.material.name,
            category: template.material.category,
          });
          if (existingKeys.has(key)) continue;

          const priority = template.criticality === 'CRITICA' ? 'CRITICA' : template.criticality === 'ALTA' ? 'ALTA' : 'NORMAL';
          if (onlyCritical && priority !== 'CRITICA') continue;

          const leadTimeDays = suggestion.offer?.leadTimeDays ?? null;
          const risk = evaluateScheduleRisk(requiredOnSiteDate, leadTimeDays, referenceDate);
          const expectedUnitCost = suggestion.offer?.unitCost ?? null;
          const expectedTotalCost = expectedUnitCost !== null ? Number((expectedUnitCost * quantity).toFixed(2)) : null;

          const supply = await db.projectSupply.create({
            data: {
              projectId: id,
              description: template.material.name,
              category: template.material.category,
              originSource: 'ESTIMATE_INTERNAL',
              materialId: template.materialId,
              suggestedSupplierId: suggestion.offer?.supplier?.id || null,
              suggestedSupplierOfferId: suggestion.offer?.id || null,
              estimateInternalLineId: line.id,
              projectActivityId: linkedActivity?.id || null,
              locationId: linkedActivity?.locationId || null,
              wbsId: linkedActivity?.wbsId || null,
              requiredOnSiteDate: requiredOnSiteDate ? new Date(requiredOnSiteDate) : null,
              leadTimeDays,
              priority,
              status: 'IDENTIFICADA',
              responsible: linkedActivity?.responsible || 'Compras / Produccion',
              quantity,
              unit: template.unit || template.material.baseUnit,
              suggestedUnitCost: suggestion.offer?.unitCost ?? null,
              expectedUnitCost,
              expectedTotalCost,
              suggestedSupplierReason: suggestion.reason,
              scheduleRisk: suggestion.risk,
              isCriticalForSchedule: template.material.isCriticalForSchedule || template.criticality === 'CRITICA',
              observations: `Generado desde linea interna ${line.chapter} | ${line.description}${suggestion.offer?.supplier?.name ? ` | Proveedor sugerido: ${suggestion.offer.supplier.name}` : ''}`,
            },
          });

          existingKeys.add(key);
          created.push({ id: supply.id, description: supply.description, material: template.material.code });
        }
      }
    }

    if (mode === 'activities' || mode === 'hybrid') {
      for (const activity of activities) {
        const materialTemplates = activity.standardActivity?.materialTemplates || [];

        if (materialTemplates.length === 0) {
          const fallback = fallbackActivityHeuristic(activity.name || '');
          if (onlyCritical && fallback.priority !== 'CRITICA') continue;
          const key = makeExistingKey({
            projectActivityId: activity.id,
            materialId: null,
            description: fallback.description,
            category: fallback.category,
          });
          if (existingKeys.has(key)) continue;

          const requiredOnSiteDate = activity.plannedStartDate || activity.plannedEndDate || addDays(referenceDate, 7);
          const risk = evaluateScheduleRisk(requiredOnSiteDate, fallback.leadTimeDays, referenceDate);
          const supply = await db.projectSupply.create({
            data: {
              projectId: id,
              description: fallback.description,
              category: fallback.category,
              originSource: 'FALLBACK_HEURISTIC',
              projectActivityId: activity.id,
              locationId: activity.locationId || null,
              wbsId: activity.wbsId || null,
              requiredOnSiteDate: requiredOnSiteDate ? new Date(requiredOnSiteDate) : null,
              leadTimeDays: fallback.leadTimeDays,
              priority: fallback.priority,
              status: 'IDENTIFICADA',
              responsible: activity.responsible || 'Compras / Produccion',
              quantity: fallback.quantity,
              unit: fallback.unit,
              scheduleRisk: risk.risk,
              observations: `Fallback heuristico desde actividad ${activity.name}`,
            },
          });
          existingKeys.add(key);
          created.push({ id: supply.id, description: supply.description, material: null });
          continue;
        }

        for (const template of materialTemplates) {
          const quantity = Number(
            (
              evaluateConsumption(template.consumptionRule as Record<string, unknown> | null, {
                durationDays: activity.plannedDuration || 1,
              }) *
              (1 + (template.wasteFactor || 0))
            ).toFixed(2)
          );
          if (quantity <= 0) continue;

          const priority = template.criticality === 'CRITICA' ? 'CRITICA' : template.criticality === 'ALTA' ? 'ALTA' : 'NORMAL';
          if (onlyCritical && priority !== 'CRITICA') continue;

          const requiredOnSiteDate = activity.plannedStartDate || activity.plannedEndDate || addDays(referenceDate, 7);
          const suggestion = chooseSupplierOffer(
            template.material.offers,
            requiredOnSiteDate,
            strategy,
            referenceDate
          );
          const key = makeExistingKey({
            projectActivityId: activity.id,
            materialId: template.materialId,
            description: template.material.name,
            category: template.material.category,
          });
          if (existingKeys.has(key)) continue;

          const leadTimeDays = suggestion.offer?.leadTimeDays ?? null;
          const risk = evaluateScheduleRisk(requiredOnSiteDate, leadTimeDays, referenceDate);
          const expectedUnitCost = suggestion.offer?.unitCost ?? null;
          const expectedTotalCost = expectedUnitCost !== null ? Number((expectedUnitCost * quantity).toFixed(2)) : null;

          const supply = await db.projectSupply.create({
            data: {
              projectId: id,
              description: template.material.name,
              category: template.material.category,
              originSource: 'ACTIVITY',
              materialId: template.materialId,
              suggestedSupplierId: suggestion.offer?.supplier?.id || null,
              suggestedSupplierOfferId: suggestion.offer?.id || null,
              projectActivityId: activity.id,
              locationId: activity.locationId || null,
              wbsId: activity.wbsId || null,
              requiredOnSiteDate: requiredOnSiteDate ? new Date(requiredOnSiteDate) : null,
              leadTimeDays,
              priority,
              status: 'IDENTIFICADA',
              responsible: activity.responsible || 'Compras / Produccion',
              quantity,
              unit: template.unit || template.material.baseUnit,
              suggestedUnitCost: suggestion.offer?.unitCost ?? null,
              expectedUnitCost,
              expectedTotalCost,
              suggestedSupplierReason: suggestion.reason,
              scheduleRisk: risk.risk,
              isCriticalForSchedule: template.material.isCriticalForSchedule || template.criticality === 'CRITICA',
              observations: `Generado desde actividad ${activity.name}${suggestion.offer?.supplier?.name ? ` | Proveedor sugerido: ${suggestion.offer.supplier.name}` : ''}`,
            },
          });

          existingKeys.add(key);
          created.push({ id: supply.id, description: supply.description, material: template.material.code });
        }
      }
    }

    if (discoveryHints.length > 0) {
      for (const hint of discoveryHints) {
        const key = makeExistingKey({
          projectActivityId: null,
          materialId: null,
          description: hint.description,
          category: hint.category,
        });
        if (existingKeys.has(key)) continue;
        if (onlyCritical && hint.priority !== 'CRITICA') continue;

        const supply = await db.projectSupply.create({
          data: {
            projectId: id,
            description: hint.description,
            category: hint.category,
            originSource: 'DISCOVERY_EXECUTION_CONTEXT',
            requiredOnSiteDate: addDays(referenceDate, 10),
            leadTimeDays: 7,
            priority: hint.priority,
            status: 'IDENTIFICADA',
            responsible: 'Compras / Produccion',
            quantity: hint.quantity,
            unit: hint.unit,
            scheduleRisk: 'PENDIENTE_ANALISIS',
            observations: `Generado desde contexto estructurado de discovery${hint.requiredSpaceId ? ` | Espacio ${hint.requiredSpaceId}` : ''}`,
          },
        });
        existingKeys.add(key);
        created.push({ id: supply.id, description: supply.description, material: null });
      }
    }

    return NextResponse.json({
      created: created.length,
      source: mode === 'hybrid' ? 'HYBRID' : mode.toUpperCase(),
      supplies: created,
      issues,
      discoveryContextUsed: Boolean(executionContext),
    });
  } catch (error) {
    console.error('Error generating supplies:', error);
    return NextResponse.json({ error: 'No se pudieron generar los suministros automaticos' }, { status: 500 });
  }
}
