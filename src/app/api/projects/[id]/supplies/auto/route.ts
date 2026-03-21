import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function parseDescription(activityName: string) {
  const text = activityName.toLowerCase();
  if (/demolic|derribo|retirada/.test(text)) {
    return { category: 'RESIDUOS', description: 'Contenedor, retirada de escombros y gestion de residuos', priority: 'CRITICA', leadTimeDays: 3, quantity: 1, unit: 'ud' };
  }
  if (/estructura|forjado|pilar|redistrib/.test(text)) {
    return { category: 'ESTRUCTURA', description: 'Materiales y medios auxiliares de estructura', priority: 'CRITICA', leadTimeDays: 7, quantity: 1, unit: 'ud' };
  }
  if (/instal/.test(text)) {
    return { category: 'INSTALACIONES', description: 'Materiales electricos y de fontaneria vinculados a la actividad', priority: 'ALTA', leadTimeDays: 5, quantity: 1, unit: 'ud' };
  }
  if (/carpinter|puerta|armario/.test(text)) {
    return { category: 'CARPINTERIA', description: 'Carpinterias interiores y remates especiales', priority: 'ALTA', leadTimeDays: 12, quantity: 1, unit: 'ud' };
  }
  if (/alicat|revest|suelo|pintur|acabado/.test(text)) {
    return { category: 'ACABADOS', description: 'Acabados, revestimientos y consumibles de remate', priority: 'NORMAL', leadTimeDays: 4, quantity: 1, unit: 'ud' };
  }
  if (/fachada|envolvente|comun/.test(text)) {
    return { category: 'ACABADOS', description: 'Elementos de envolvente, zonas comunes y protecciones', priority: 'ALTA', leadTimeDays: 10, quantity: 1, unit: 'ud' };
  }
  if (/limpieza|entrega/.test(text)) {
    return { category: 'OTROS', description: 'Limpieza final, proteccion y entrega', priority: 'NORMAL', leadTimeDays: 2, quantity: 1, unit: 'ud' };
  }
  return { category: 'OTROS', description: `Suministro asociado a ${activityName}`, priority: 'NORMAL', leadTimeDays: 4, quantity: 1, unit: 'ud' };
}

function parseEstimateItem(description: string, unit?: string | null) {
  const text = description.toLowerCase();
  if (/demolic|derribo|retirada/.test(text)) {
    return { category: 'RESIDUOS', description: 'Contenedor, retirada de escombros y gestion de residuos', priority: 'CRITICA', leadTimeDays: 3, quantityFactor: 1, unit: unit || 'ud' };
  }
  if (/estructura|forjado|pilar|redistrib/.test(text)) {
    return { category: 'ESTRUCTURA', description: 'Materiales y medios auxiliares de estructura', priority: 'CRITICA', leadTimeDays: 7, quantityFactor: 1, unit: unit || 'ud' };
  }
  if (/electric|fontaner|instal/.test(text)) {
    return { category: 'INSTALACIONES', description: 'Materiales electricos y de fontaneria vinculados al presupuesto', priority: 'ALTA', leadTimeDays: 5, quantityFactor: 1, unit: unit || 'ud' };
  }
  if (/carpinter|puerta|armario/.test(text)) {
    return { category: 'CARPINTERIA', description: 'Carpinterias interiores y remates especiales', priority: 'ALTA', leadTimeDays: 12, quantityFactor: 1, unit: unit || 'ud' };
  }
  if (/alicat|revest|suelo|pintur|acabado/.test(text)) {
    return { category: 'ACABADOS', description: 'Acabados, revestimientos y consumibles de remate', priority: 'NORMAL', leadTimeDays: 4, quantityFactor: 1, unit: unit || 'ud' };
  }
  if (/fachada|envolvente|comun/.test(text)) {
    return { category: 'ACABADOS', description: 'Elementos de envolvente, zonas comunes y protecciones', priority: 'ALTA', leadTimeDays: 10, quantityFactor: 1, unit: unit || 'ud' };
  }
  if (/limpieza|entrega/.test(text)) {
    return { category: 'OTROS', description: 'Limpieza final, proteccion y entrega', priority: 'NORMAL', leadTimeDays: 2, quantityFactor: 1, unit: unit || 'ud' };
  }
  return {
    category: 'OTROS',
    description: `Suministro asociado a ${description}`,
    priority: 'NORMAL',
    leadTimeDays: 4,
    quantityFactor: 1,
    unit: unit || 'ud',
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const replaceExisting = Boolean(body.replaceExisting);
    const onlyCritical = Boolean(body.onlyCritical);

    const estimateMode = body.mode === 'estimate' || body.mode === 'budget' || body.useEstimate === true;

    const activities = await db.projectActivity.findMany({
      where: { projectId: id },
      include: { wbs: true, location: true },
      orderBy: [
        { plannedStartDate: 'asc' },
        { plannedEndDate: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    if (activities.length === 0) {
      return NextResponse.json({ error: 'No hay actividades para generar suministros' }, { status: 400 });
    }

    const existingSupplies = await db.projectSupply.findMany({
      where: { projectId: id },
      select: { description: true, projectActivityId: true, category: true },
    });

    if (replaceExisting) {
      await db.projectSupply.deleteMany({ where: { projectId: id } });
    }

    const existingKeys = new Set(
      existingSupplies.map((supply) => `${supply.projectActivityId || ''}|${supply.description.toLowerCase()}|${supply.category}`)
    );

    const created: { id: string; description: string }[] = [];
    const plannedDateBase = new Date();
    const latestEstimate = await db.estimate.findFirst({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
      },
    });

    if (estimateMode && latestEstimate?.items?.length) {
      for (const item of latestEstimate.items) {
        const heuristic = parseEstimateItem(item.description, item.unit);
        const key = `|${heuristic.description.toLowerCase()}|${heuristic.category}`;
        if (existingKeys.has(key)) continue;

        const supply = await db.projectSupply.create({
          data: {
            projectId: id,
            description: heuristic.description,
            category: heuristic.category,
            projectActivityId: null,
            locationId: null,
            wbsId: null,
            requiredOnSiteDate: addDays(plannedDateBase, -heuristic.leadTimeDays + 14),
            leadTimeDays: heuristic.leadTimeDays,
            orderDate: null,
            priority: heuristic.priority,
            status: 'IDENTIFICADA',
            responsible: 'Compras / Produccion',
            quantity: Number((item.quantity * heuristic.quantityFactor).toFixed(2)),
            unit: item.unit || heuristic.unit,
            observations: `Generado automaticamente desde presupuesto ${latestEstimate.number} | Partida: ${item.chapter || 'SIN CAPITULO'}`,
          },
        });

        created.push({ id: supply.id, description: supply.description });
      }
    }

    for (const activity of activities) {
      const heuristic = parseDescription(activity.name || '');
      if (onlyCritical && heuristic.priority !== 'CRITICA') continue;

      const targetDate = activity.plannedStartDate
        ? new Date(activity.plannedStartDate)
        : activity.plannedEndDate
          ? new Date(activity.plannedEndDate)
          : addDays(plannedDateBase, 14);

      const requiredOnSiteDate = addDays(targetDate, -heuristic.leadTimeDays);
      const key = `${activity.id}|${heuristic.description.toLowerCase()}|${heuristic.category}`;
      if (existingKeys.has(key)) continue;

      const supply = await db.projectSupply.create({
        data: {
          projectId: id,
          description: heuristic.description,
          category: heuristic.category,
          projectActivityId: activity.id,
          locationId: activity.locationId || null,
          wbsId: activity.wbsId || null,
          requiredOnSiteDate,
          leadTimeDays: heuristic.leadTimeDays,
          orderDate: null,
          priority: heuristic.priority,
          status: 'IDENTIFICADA',
          responsible: activity.responsible || 'Compras / Produccion',
          quantity: heuristic.quantity,
          unit: heuristic.unit,
          observations: `Generado automaticamente desde la actividad ${activity.name}${activity.location ? ` | Zona: ${activity.location.name}` : ''}${activity.wbs ? ` | WBS: ${activity.wbs.name}` : ''}`,
        },
      });

      created.push({ id: supply.id, description: supply.description });
    }

    return NextResponse.json({
      created: created.length,
      skipped: Math.max(0, activities.length - created.length),
      source: estimateMode && latestEstimate?.items?.length ? 'ESTIMATE+ACTIVITIES' : 'ACTIVITIES',
      supplies: created,
    });
  } catch (error) {
    console.error('Error generating supplies:', error);
    return NextResponse.json({ error: 'No se pudieron generar los suministros automaticos' }, { status: 500 });
  }
}
