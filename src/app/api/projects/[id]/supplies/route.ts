import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureProcurementCatalog } from '@/lib/procurement/catalog';
import { evaluateScheduleRisk, suggestSupplierForMaterial } from '@/lib/procurement/sourcing';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await ensureProcurementCatalog();

    const supplies = await (db as any).projectSupply.findMany({
      where: { projectId: id },
      include: {
        projectActivity: {
          select: { id: true, name: true, code: true, plannedStartDate: true, plannedEndDate: true }
        },
        location: {
          select: { id: true, name: true }
        },
        wbs: {
          select: { id: true, name: true, code: true }
        },
        material: true,
        supplier: {
          select: { id: true, name: true, email: true, phone: true }
        },
        supplierOffer: {
          include: {
            supplier: {
              select: { id: true, name: true }
            },
            material: {
              select: { id: true, name: true, code: true }
            }
          }
        },
        estimateInternalLine: {
          select: { id: true, code: true, description: true, chapter: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(supplies);
  } catch (error) {
    console.error('Error fetching supplies:', error);
    return NextResponse.json({ error: 'Error al cargar suministros' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await ensureProcurementCatalog();
    const data = await req.json();

    let material = null;
    if (data.materialId) {
      material = await db.material.findUnique({
        where: { id: data.materialId },
      });
      if (!material) {
        return NextResponse.json({ error: 'Material no valido' }, { status: 400 });
      }
    }

    let chosenOffer = null;
    let suggestedReason = data.suggestedSupplierReason || null;
    if (data.supplierOfferId) {
      chosenOffer = await db.supplierMaterialOffer.findUnique({
        where: { id: data.supplierOfferId },
        include: { supplier: true },
      });
      if (!chosenOffer) {
        return NextResponse.json({ error: 'Oferta no valida' }, { status: 400 });
      }
    } else if (data.materialId) {
      const suggestion = await suggestSupplierForMaterial({
        materialId: data.materialId,
        requiredOnSiteDate: data.requiredOnSiteDate ? new Date(data.requiredOnSiteDate) : null,
      });
      chosenOffer = suggestion.offer;
      suggestedReason = suggestion.reason;
    }

    const leadTimeDays = chosenOffer?.leadTimeDays ?? (data.leadTimeDays ? parseInt(data.leadTimeDays) : null);
    const quantity = data.quantity ? parseFloat(data.quantity) : null;
    const expectedUnitCost = chosenOffer?.unitCost ?? (data.expectedUnitCost ? Number(data.expectedUnitCost) : null);
    const expectedTotalCost = expectedUnitCost !== null && quantity !== null ? Number((expectedUnitCost * quantity).toFixed(2)) : null;
    const risk = evaluateScheduleRisk(
      data.requiredOnSiteDate ? new Date(data.requiredOnSiteDate) : null,
      leadTimeDays,
      data.orderDate ? new Date(data.orderDate) : new Date()
    );

    const supplierId =
      ('supplierId' in (chosenOffer || {}) ? (chosenOffer as any).supplierId : null) ||
      (chosenOffer as any)?.supplier?.id ||
      data.supplierId ||
      null;

    const supply = await (db as any).projectSupply.create({
      data: {
        projectId: id,
        description: data.description,
        category: data.category || 'OTROS',
        originSource: data.originSource || 'MANUAL',
        materialId: data.materialId || null,
        supplierId,
        supplierOfferId: chosenOffer?.id || data.supplierOfferId || null,
        estimateInternalLineId: data.estimateInternalLineId || null,
        projectActivityId: data.projectActivityId || null,
        locationId: data.locationId || null,
        wbsId: data.wbsId || null,
        requiredOnSiteDate: data.requiredOnSiteDate ? new Date(data.requiredOnSiteDate) : null,
        leadTimeDays,
        orderDate: data.orderDate ? new Date(data.orderDate) : null,
        priority: data.priority || 'NORMAL',
        status: data.status || 'IDENTIFICADA',
        responsible: data.responsible,
        quantity,
        unit: data.unit || chosenOffer?.unit || material?.baseUnit || null,
        expectedUnitCost,
        expectedTotalCost,
        suggestedSupplierReason: suggestedReason,
        scheduleRisk: risk.risk,
        isCriticalForSchedule: Boolean(data.isCriticalForSchedule ?? material?.isCriticalForSchedule),
        observations: data.observations
      }
    });

    return NextResponse.json(supply);
  } catch (error) {
    console.error('Error creating supply:', error);
    return NextResponse.json({ error: 'Error al registrar abastecimiento' }, { status: 500 });
  }
}
