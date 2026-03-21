import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureProcurementCatalog } from '@/lib/procurement/catalog';
import { evaluateScheduleRisk, suggestSupplierForMaterial } from '@/lib/procurement/sourcing';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string, supplyId: string }> }
) {
  const { supplyId } = await params;
  try {
    await ensureProcurementCatalog();
    const supply = await (db as any).projectSupply.findUnique({
      where: { id: supplyId },
      include: {
        projectActivity: true,
        location: true,
        wbs: true,
        material: true,
        supplier: true,
        supplierOffer: {
          include: {
            supplier: true,
            material: true,
          }
        },
        estimateInternalLine: true,
      }
    });
    if (!supply) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    return NextResponse.json(supply);
  } catch (error) {
    return NextResponse.json({ error: 'Error cargando detalle' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string, supplyId: string }> }
) {
  const { supplyId } = await params;
  try {
    await ensureProcurementCatalog();
    const data = await req.json();

    let chosenOffer = null;
    if (data.supplierOfferId) {
      chosenOffer = await db.supplierMaterialOffer.findUnique({
        where: { id: data.supplierOfferId },
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
      if (data.suggestedSupplierReason === undefined) {
        data.suggestedSupplierReason = suggestion.reason;
      }
    }

    const leadTimeDays = chosenOffer?.leadTimeDays ?? (data.leadTimeDays !== undefined ? parseInt(data.leadTimeDays) : null);
    const quantity = data.quantity !== undefined ? (data.quantity ? parseFloat(data.quantity) : null) : undefined;
    const expectedUnitCost = chosenOffer?.unitCost ?? (data.expectedUnitCost !== undefined ? Number(data.expectedUnitCost) : null);
    const expectedTotalCost =
      quantity !== undefined && quantity !== null && expectedUnitCost !== null
        ? Number((expectedUnitCost * quantity).toFixed(2))
        : data.expectedTotalCost !== undefined
          ? Number(data.expectedTotalCost)
          : undefined;
    const risk = evaluateScheduleRisk(
      data.requiredOnSiteDate !== undefined ? (data.requiredOnSiteDate ? new Date(data.requiredOnSiteDate) : null) : null,
      leadTimeDays,
      data.orderDate ? new Date(data.orderDate) : new Date()
    );

    const supplierId =
      ('supplierId' in (chosenOffer || {}) ? (chosenOffer as any).supplierId : null) ||
      (chosenOffer as any)?.supplier?.id ||
      data.supplierId ||
      null;

    const updated = await (db as any).projectSupply.update({
      where: { id: supplyId },
      data: {
        description: data.description,
        category: data.category,
        originSource: data.originSource,
        materialId: data.materialId,
        supplierId,
        supplierOfferId: chosenOffer?.id || data.supplierOfferId,
        estimateInternalLineId: data.estimateInternalLineId,
        projectActivityId: data.projectActivityId,
        locationId: data.locationId,
        wbsId: data.wbsId,
        requiredOnSiteDate: data.requiredOnSiteDate ? new Date(data.requiredOnSiteDate) : null,
        leadTimeDays,
        orderDate: data.orderDate ? new Date(data.orderDate) : null,
        priority: data.priority,
        status: data.status,
        responsible: data.responsible,
        quantity,
        unit: data.unit,
        expectedUnitCost,
        expectedTotalCost,
        suggestedSupplierReason: data.suggestedSupplierReason,
        scheduleRisk: risk.risk,
        isCriticalForSchedule: data.isCriticalForSchedule,
        observations: data.observations
      },
      include: {
        material: true,
        supplier: true,
        supplierOffer: {
          include: {
            supplier: true,
            material: true,
          }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Error actualizando suministro' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string, supplyId: string }> }
) {
  const { supplyId } = await params;
  try {
    await (db as any).projectSupply.delete({
      where: { id: supplyId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
