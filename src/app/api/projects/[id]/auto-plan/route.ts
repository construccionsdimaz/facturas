import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generatePlanningBlueprint } from '@/lib/automation/planning-generator';
import type { DerivedInput } from '@/lib/discovery/types';
import {
  getDefaultProjectCalendarData,
  scheduleProjectActivities,
} from '@/lib/scheduling/project-scheduler';

function parseArea(text: string) {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*m2/i);
  return match ? Number(match[1].replace(',', '.')) : 0;
}

function inferSiteType(projectType?: string | null, description?: string | null, name?: string | null) {
  const text = `${projectType || ''} ${description || ''} ${name || ''}`.toLowerCase();
  if (text.includes('cambio de uso')) return 'CAMBIO_USO';
  if (text.includes('obra nueva') || text.includes('nueva planta')) return 'OBRA_NUEVA';
  if (text.includes('edificio') || text.includes('rehabilitacion integral edificio') || text.includes('reestructuracion')) return 'EDIFICIO';
  if (text.includes('local') || text.includes('comercial')) return 'LOCAL';
  if (text.includes('oficina')) return 'OFICINA';
  if (text.includes('nave') || text.includes('industrial')) return 'NAVE';
  if (text.includes('unifamiliar') || text.includes('casa')) return 'VIVIENDA_UNIFAMILIAR';
  return 'PISO';
}

function inferScopeType(text: string, siteType: string) {
  const lower = text.toLowerCase();
  if (lower.includes('cambio de uso')) return 'CAMBIO_USO';
  if (lower.includes('obra nueva')) return 'OBRA_NUEVA';
  if (lower.includes('reestructuracion') || (siteType === 'EDIFICIO' && lower.includes('varias viviendas'))) return 'REESTRUCTURACION';
  if (lower.includes('rehabilit')) return 'REHABILITACION';
  if (lower.includes('parcial')) return 'REFORMA_PARCIAL';
  if (lower.includes('adecuacion') || siteType === 'LOCAL' || siteType === 'OFICINA' || siteType === 'NAVE') return 'ADECUACION';
  return 'REFORMA_INTEGRAL';
}

function inferWorkType(scopeType: string) {
  switch (scopeType) {
    case 'CAMBIO_USO':
      return 'ADECUACION_LOCAL';
    case 'OBRA_NUEVA':
      return 'REFORMA_PARCIAL';
    case 'REHABILITACION':
      return 'REHABILITACION_LIGERA';
    case 'ADECUACION':
      return 'ADECUACION_LOCAL';
    case 'REFORMA_PARCIAL':
      return 'REFORMA_PARCIAL';
    default:
      return 'REFORMA_INTEGRAL_VIVIENDA';
  }
}

function inferAccessLevel(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes('muy complicado') || lower.includes('sin ascensor') || lower.includes('6 plantas')) return 'MUY_COMPLICADO';
  if (lower.includes('complicado') || lower.includes('escalera estrecha') || lower.includes('centro')) return 'COMPLICADO';
  if (lower.includes('facil')) return 'FACIL';
  return 'NORMAL';
}

function inferCount(text: string, patterns: RegExp[], fallback = 0) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  return fallback;
}

function parseDiscoveryDerivedInput(value: unknown): DerivedInput | null {
  if (!value || typeof value !== 'object') return null;
  return value as DerivedInput;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const replaceExisting = Boolean(body.replaceExisting);
    const schedulingStart = body.referenceStartDate || null;

    const project = await db.project.findUnique({
      where: { id },
      include: {
        client: true,
        calendar: true,
        estimates: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            discoverySession: {
              select: {
                id: true,
                derivedInput: true,
                status: true,
              },
            },
            items: true,
            internalAnalysis: {
              include: {
                lines: true,
              },
            },
          },
        },
        wbs: true,
        locations: true,
        activities: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });
    }

    if (!replaceExisting && (project.activities.length > 0 || project.wbs.length > 0 || project.locations.length > 0)) {
      return NextResponse.json(
        { error: 'La obra ya tiene estructura. Usa replaceExisting=true si quieres regenerarla.' },
        { status: 409 }
      );
    }

    const sourceText = `${project.name} ${project.description || ''} ${project.observations || ''} ${project.projectType || ''}`;
    const latestEstimate = project.estimates[0];
    const warnings: string[] = [];
    const estimateText = latestEstimate?.items?.map((item) => `${item.description} ${item.chapter} ${item.unit}`).join(' ') || '';
    const combinedText = `${sourceText} ${estimateText}`;
    const discoveryDerivedInput = parseDiscoveryDerivedInput(latestEstimate?.discoverySession?.derivedInput);

    const siteType = discoveryDerivedInput?.siteType || inferSiteType(project.projectType, project.description, project.name);
    const scopeType = discoveryDerivedInput?.scopeType || inferScopeType(combinedText, siteType);
    const workType = discoveryDerivedInput?.workType || inferWorkType(scopeType);
    const accessLevel = discoveryDerivedInput?.accessLevel || inferAccessLevel(combinedText);
    const detectedArea = parseArea(combinedText);
    const area = Number(discoveryDerivedInput?.area) || detectedArea || (siteType === 'EDIFICIO' ? 420 : siteType === 'LOCAL' ? 140 : siteType === 'OBRA_NUEVA' ? 180 : 95);
    const bathrooms = discoveryDerivedInput?.bathrooms ?? inferCount(combinedText, [/(\d+)\s*ba(?:n|ñ)os?/i, /ba(?:n|ñ)os?\s*(\d+)/i], siteType === 'LOCAL' ? 1 : 2);
    const kitchens = discoveryDerivedInput?.kitchens ?? inferCount(combinedText, [/(\d+)\s*cocinas?/i, /cocinas?\s*(\d+)/i], siteType === 'PISO' ? 1 : 0);
    const rooms = discoveryDerivedInput?.rooms ?? inferCount(combinedText, [/(\d+)\s*habitaciones?/i, /habitaciones?\s*(\d+)/i], siteType === 'EDIFICIO' ? 0 : 3);
    const units = discoveryDerivedInput?.units ?? inferCount(combinedText, [/(\d+)\s*viviendas?/i, /(\d+)\s*unidades?/i], siteType === 'EDIFICIO' ? 4 : 1);
    const floors = discoveryDerivedInput?.floors ?? inferCount(combinedText, [/(\d+)\s*plantas?/i, /(\d+)\s*niveles?/i], siteType === 'EDIFICIO' ? 4 : 1);
    const structuralWorks = discoveryDerivedInput?.structuralWorks ?? /estructura|portante|forjado|pilar|redistrib|reconfigur|varias viviendas/i.test(combinedText);
    const hasElevator = discoveryDerivedInput?.hasElevator ?? !/sin ascensor|no ascensor/i.test(combinedText);
    const worksText =
      discoveryDerivedInput?.worksText ||
      latestEstimate?.items?.map((item) => item.description).join(', ') ||
      project.description ||
      '';
    const finishLevel = discoveryDerivedInput?.finishLevel || (latestEstimate?.items?.length ? 'MEDIO_ALTO' : 'MEDIO');
    const conditions = discoveryDerivedInput?.conditions || project.observations || project.description || '';

    if (!latestEstimate) {
      warnings.push('No hay estimate vinculado; el planning se genera solo con datos de obra e inferencias.');
    }
    if (latestEstimate?.discoverySession && discoveryDerivedInput) {
      warnings.push('Se ha priorizado DiscoverySession.derivedInput como fuente principal del planning automatico.');
    }
    if (latestEstimate?.discoverySession && !discoveryDerivedInput) {
      warnings.push('La obra tiene discovery vinculado, pero el derivedInput no estaba utilizable; se usa estimate + inferencias.');
    }
    if (latestEstimate && !latestEstimate.internalAnalysis) {
      warnings.push('El ultimo estimate no conserva analisis interno; el planning automatico tiene menos base economica.');
    }
    if (!project.calendar) {
      warnings.push('La obra no tenia calendario propio y se ha usado un calendario de referencia.');
    }
    if (!discoveryDerivedInput && !detectedArea) {
      warnings.push(`No se ha detectado superficie explicita; se usa un area orientativa para ${siteType}.`);
    }
    if (!project.projectType && !discoveryDerivedInput) {
      warnings.push('Falta tipo de obra en setup y la tipologia se ha inferido desde texto libre.');
    }
    if (project.setupStatus === 'INCOMPLETE') {
      warnings.push('La obra sigue marcada como setup incompleto.');
    }

    const blueprint = await generatePlanningBlueprint({
      name: project.name,
      description: project.description,
      projectType: project.projectType,
      siteType,
      scopeType,
      workType,
      area,
      works: worksText,
      accessLevel,
      bathrooms,
      kitchens,
      rooms,
      units,
      floors,
      structuralWorks,
      hasElevator,
      finishLevel,
      conditions,
      areas: discoveryDerivedInput?.areas,
      actionsByArea: discoveryDerivedInput?.actionsByArea,
      discoverySubtypes: discoveryDerivedInput?.discoveryProfile?.subtypes,
      complexityProfile: discoveryDerivedInput?.discoveryProfile?.complexityProfile,
      inclusions: discoveryDerivedInput?.inclusions,
      currentVsTarget: discoveryDerivedInput?.currentVsTarget as Record<string, unknown> | undefined,
      executionConstraints: discoveryDerivedInput?.executionConstraints as Record<string, unknown> | undefined,
      certainty: discoveryDerivedInput?.certainty,
    });

    const calendarRecord =
      project.calendar || {
        ...getDefaultProjectCalendarData(),
      };

    const scheduling = scheduleProjectActivities({
      activities: blueprint.activityNodes.map((node) => ({
        id: node.key,
        name: node.name,
        durationDays: node.durationDays,
      })),
      dependencies: blueprint.dependencyNodes.map((dep) => ({
        predecessorId: dep.predecessorKey,
        successorId: dep.successorKey,
        type: dep.type,
        lagDays: dep.lagDays,
      })),
      calendar: calendarRecord,
      startDate: schedulingStart,
    });

    const scheduleByKey = new Map(
      scheduling.activities.map((activity) => [activity.id, activity])
    );

    const result = await db.$transaction(async (tx) => {
      if (!project.calendar) {
        await tx.projectCalendar.upsert({
          where: { projectId: id },
          update: getDefaultProjectCalendarData(),
          create: {
            projectId: id,
            ...getDefaultProjectCalendarData(),
          },
        });
      }

      if (replaceExisting) {
        await tx.activityDependency.deleteMany({
          where: {
            OR: [
              { predecessor: { projectId: id } },
              { successor: { projectId: id } },
            ],
          },
        });
        await tx.weeklyPlanActivity.deleteMany({
          where: { weeklyPlan: { projectId: id } },
        });
        await tx.projectActivity.deleteMany({ where: { projectId: id } });
        await tx.projectWBS.deleteMany({ where: { projectId: id } });
        await tx.projectLocation.deleteMany({ where: { projectId: id } });
      }

      const locationMap = new Map<string, string>();
      for (const node of blueprint.locationNodes) {
        const created = await tx.projectLocation.create({
          data: {
            projectId: id,
            parentId: node.parentKey ? locationMap.get(node.parentKey) || null : null,
            name: node.name,
            code: node.code || null,
            type: node.type,
            status: 'ACTIVA',
            description: node.description || null,
            observations: null,
          },
        });
        locationMap.set(node.key, created.id);
      }

      const wbsMap = new Map<string, string>();
      for (const node of blueprint.wbsNodes) {
        const created = await tx.projectWBS.create({
          data: {
            projectId: id,
            parentId: node.parentKey ? wbsMap.get(node.parentKey) || null : null,
            name: node.name,
            code: node.code || null,
            level: node.level,
            status: 'ACTIVA',
            description: node.description || null,
            observations: null,
          },
        });
        wbsMap.set(node.key, created.id);
      }

      const activityMap = new Map<string, string>();
      for (const node of blueprint.activityNodes) {
        const scheduled = scheduleByKey.get(node.key);
        const created = await tx.projectActivity.create({
          data: {
            projectId: id,
            wbsId: wbsMap.get(node.wbsKey) || null,
            locationId: node.locationKey ? locationMap.get(node.locationKey) || null : null,
            standardActivityId: node.standardActivityId || null,
            generationSource: node.generationSource || blueprint.source,
            originTypologyCode: node.originTypologyCode || blueprint.typologyCode || null,
            originActivityTemplateCode: node.originActivityTemplateCode || null,
            originCostItemCode: node.originCostItemCode || null,
            originProductivityRateName: node.productivityRateName || null,
            name: node.name,
            code: node.code,
            responsible: node.responsible || null,
            plannedDuration: node.durationDays,
            plannedStartDate: scheduled?.plannedStartDate || null,
            plannedEndDate: scheduled?.plannedEndDate || null,
            status: 'PLANIFICADA',
            observations: node.notes || null,
          },
        });
        activityMap.set(node.key, created.id);
      }

      for (const dep of blueprint.dependencyNodes) {
        const predecessorId = activityMap.get(dep.predecessorKey);
        const successorId = activityMap.get(dep.successorKey);
        if (!predecessorId || !successorId) continue;
        await tx.activityDependency.create({
          data: {
            predecessorId,
            successorId,
            dependencyType: dep.type || 'FS',
            lagDays: dep.lagDays || 0,
          },
        });
      }

      const baseline = await tx.projectBaseline.create({
        data: {
          projectId: id,
          name: replaceExisting ? 'Baseline automatica regenerada' : 'Baseline automatica inicial',
          description: 'Generada automaticamente desde la estructura y el contexto de la obra.',
          responsible: project.manager || null,
          status: 'VIGENTE',
          snapshotData: {
            scheduler: {
              scheduledWith: scheduling.scheduledWith,
              startDate: scheduling.startDate,
              startRule: scheduling.startRule,
              calendarSource: scheduling.calendar.source,
              timeCriteria: scheduling.calendar.timeCriteria,
              workHours: scheduling.calendar.workHours,
              bufferDays: scheduling.calendar.bufferDays,
              issues: scheduling.issues,
            },
            activities: blueprint.activityNodes.map((node) => {
              const scheduled = scheduleByKey.get(node.key);
              return {
                key: node.key,
                name: node.name,
                code: node.code,
                durationDays: node.durationDays,
                wbsKey: node.wbsKey,
                locationKey: node.locationKey || null,
                plannedStartDate: scheduled?.plannedStartDate || null,
                plannedEndDate: scheduled?.plannedEndDate || null,
                generationSource: node.generationSource || blueprint.source,
                originTypologyCode: node.originTypologyCode || blueprint.typologyCode || null,
                originActivityTemplateCode: node.originActivityTemplateCode || null,
                originCostItemCode: node.originCostItemCode || null,
                originProductivityRateName: node.productivityRateName || null,
                standardActivityId: node.standardActivityId || null,
              };
            }),
            dependencies: blueprint.dependencyNodes.map((dep) => ({
              predecessorKey: dep.predecessorKey,
              successorKey: dep.successorKey,
              type: dep.type || 'FS',
              lagDays: dep.lagDays || 0,
            })),
          },
        },
      });

      return {
        createdLocations: blueprint.locationNodes.length,
        createdWbs: blueprint.wbsNodes.length,
        createdActivities: blueprint.activityNodes.length,
        createdDependencies: blueprint.dependencyNodes.length,
        baselineId: baseline.id,
        scheduledActivities: scheduling.activities.length,
      };
    });

    return NextResponse.json({
      ...result,
      source: blueprint.source,
      typologyCode: blueprint.typologyCode || null,
      notes: blueprint.notes,
      warnings,
      contextSource: discoveryDerivedInput ? 'DISCOVERY' : latestEstimate ? 'ESTIMATE_AND_PROJECT' : 'PROJECT_FALLBACK',
      scheduling: {
        scheduledWith: scheduling.scheduledWith,
        startDate: scheduling.startDate,
        startRule: scheduling.startRule,
        calendarSource: scheduling.calendar.source,
        timeCriteria: scheduling.calendar.timeCriteria,
        bufferDays: scheduling.calendar.bufferDays,
        issues: scheduling.issues,
      },
    });
  } catch (error) {
    console.error('Error generating automatic planning:', error);
    return NextResponse.json({ error: 'No se pudo generar el planning automatico' }, { status: 500 });
  }
}
