import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generatePlanningBlueprint } from '@/lib/automation/planning-generator';

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const replaceExisting = Boolean(body.replaceExisting);

    const project = await db.project.findUnique({
      where: { id },
      include: {
        client: true,
        calendar: true,
        estimates: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { items: true },
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
    const estimateText = latestEstimate?.items?.map((item) => `${item.description} ${item.chapter} ${item.unit}`).join(' ') || '';
    const combinedText = `${sourceText} ${estimateText}`;

    const siteType = inferSiteType(project.projectType, project.description, project.name);
    const scopeType = inferScopeType(combinedText, siteType);
    const workType = inferWorkType(scopeType);
    const accessLevel = inferAccessLevel(combinedText);
    const area = parseArea(combinedText) || (siteType === 'EDIFICIO' ? 420 : siteType === 'LOCAL' ? 140 : siteType === 'OBRA_NUEVA' ? 180 : 95);
    const bathrooms = inferCount(combinedText, [/(\d+)\s*ba(?:n|ñ)os?/i, /ba(?:n|ñ)os?\s*(\d+)/i], siteType === 'LOCAL' ? 1 : 2);
    const kitchens = inferCount(combinedText, [/(\d+)\s*cocinas?/i, /cocinas?\s*(\d+)/i], siteType === 'PISO' ? 1 : 0);
    const rooms = inferCount(combinedText, [/(\d+)\s*habitaciones?/i, /habitaciones?\s*(\d+)/i], siteType === 'EDIFICIO' ? 0 : 3);
    const units = inferCount(combinedText, [/(\d+)\s*viviendas?/i, /(\d+)\s*unidades?/i], siteType === 'EDIFICIO' ? 4 : 1);
    const floors = inferCount(combinedText, [/(\d+)\s*plantas?/i, /(\d+)\s*niveles?/i], siteType === 'EDIFICIO' ? 4 : 1);
    const structuralWorks = /estructura|portante|forjado|pilar|redistrib|reconfigur|varias viviendas/i.test(combinedText);
    const hasElevator = !/sin ascensor|no ascensor/i.test(combinedText);

    const blueprint = generatePlanningBlueprint({
      name: project.name,
      description: project.description,
      projectType: project.projectType,
      siteType,
      scopeType,
      workType,
      area,
      works: latestEstimate?.items?.map((item) => item.description).join(', ') || project.description || '',
      accessLevel,
      bathrooms,
      kitchens,
      rooms,
      units,
      floors,
      structuralWorks,
      hasElevator,
    });

    const result = await db.$transaction(async (tx) => {
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
        const created = await tx.projectActivity.create({
          data: {
            projectId: id,
            wbsId: wbsMap.get(node.wbsKey) || null,
            locationId: node.locationKey ? locationMap.get(node.locationKey) || null : null,
            standardActivityId: null,
            name: node.name,
            code: node.code,
            responsible: node.responsible || null,
            plannedDuration: node.durationDays,
            plannedStartDate: null,
            plannedEndDate: null,
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
          snapshotData: blueprint.activityNodes.map((node) => ({
            key: node.key,
            name: node.name,
            code: node.code,
            durationDays: node.durationDays,
            wbsKey: node.wbsKey,
            locationKey: node.locationKey || null,
          })),
        },
      });

      return {
        createdLocations: blueprint.locationNodes.length,
        createdWbs: blueprint.wbsNodes.length,
        createdActivities: blueprint.activityNodes.length,
        createdDependencies: blueprint.dependencyNodes.length,
        baselineId: baseline.id,
      };
    });

    return NextResponse.json({
      ...result,
      notes: blueprint.notes,
    });
  } catch (error) {
    console.error('Error generating automatic planning:', error);
    return NextResponse.json({ error: 'No se pudo generar el planning automatico' }, { status: 500 });
  }
}

