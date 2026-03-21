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
        suggestedSupplier: true,
        supplierOffer: {
          include: {
            supplier: true,
            material: true,
          }
        },
        suggestedSupplierOffer: {
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
    const currentSupply = await (db as any).projectSupply.findUnique({
      where: { id: supplyId },
      include: {
        supplierOffer: true,
        suggestedSupplierOffer: true,
      }
    });

    if (!currentSupply) {
      return NextResponse.json({ error: 'Suministro no encontrado' }, { status: 404 });
    }

    let chosenOffer = null;
    let suggestedOffer = null;
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
      suggestedOffer = suggestion.offer;
      if (data.suggestedSupplierReason === undefined) {
        data.suggestedSupplierReason = suggestion.reason;
      }
    }

    const activeOffer = chosenOffer || suggestedOffer || currentSupply.supplierOffer || currentSupply.suggestedSupplierOffer;
    const leadTimeDays = activeOffer?.leadTimeDays ?? (data.leadTimeDays !== undefined ? parseInt(data.leadTimeDays) : currentSupply.leadTimeDays);
    const quantity = data.quantity !== undefined ? (data.quantity ? parseFloat(data.quantity) : null) : undefined;
    const suggestedUnitCost =
      suggestedOffer?.unitCost ??
      (data.suggestedUnitCost !== undefined && data.suggestedUnitCost !== '' ? Number(data.suggestedUnitCost) : undefined);
    const expectedUnitCost = activeOffer?.unitCost ?? (data.expectedUnitCost !== undefined && data.expectedUnitCost !== '' ? Number(data.expectedUnitCost) : null);
    const expectedTotalCost =
      quantity !== undefined && quantity !== null && expectedUnitCost !== null
        ? Number((expectedUnitCost * quantity).toFixed(2))
        : data.expectedTotalCost !== undefined
          ? Number(data.expectedTotalCost)
          : undefined;
    const actualUnitCost =
      data.actualUnitCost !== undefined && data.actualUnitCost !== ''
        ? Number(data.actualUnitCost)
        : chosenOffer?.unitCost ?? undefined;
    const actualTotalCost =
      quantity !== undefined && quantity !== null && actualUnitCost !== undefined && actualUnitCost !== null
        ? Number((actualUnitCost * quantity).toFixed(2))
        : data.actualTotalCost !== undefined && data.actualTotalCost !== ''
          ? Number(data.actualTotalCost)
          : undefined;
    const risk = evaluateScheduleRisk(
      data.requiredOnSiteDate !== undefined
        ? (data.requiredOnSiteDate ? new Date(data.requiredOnSiteDate) : null)
        : currentSupply.requiredOnSiteDate,
      leadTimeDays,
      data.orderDate !== undefined
        ? (data.orderDate ? new Date(data.orderDate) : new Date())
        : currentSupply.orderDate || new Date()
    );

    const supplierId =
      ('supplierId' in (chosenOffer || {}) ? (chosenOffer as any).supplierId : null) ||
      (chosenOffer as any)?.supplier?.id ||
      (data.supplierId !== undefined ? (data.supplierId || null) : undefined);
    const suggestedSupplierId =
      ('supplierId' in (suggestedOffer || {}) ? (suggestedOffer as any).supplierId : null) ||
      (suggestedOffer as any)?.supplier?.id ||
      (data.suggestedSupplierId !== undefined ? (data.suggestedSupplierId || null) : undefined);
    const normalizedStatus = data.status;
    const receivedDate =
      data.receivedDate !== undefined
        ? (data.receivedDate ? new Date(data.receivedDate) : null)
        : normalizedStatus === 'RECIBIDA'
          ? new Date()
          : undefined;

    const updated = await (db as any).projectSupply.update({
      where: { id: supplyId },
      data: {
        description: data.description !== undefined ? data.description : undefined,
        category: data.category !== undefined ? data.category : undefined,
        originSource: data.originSource !== undefined ? data.originSource : undefined,
        materialId: data.materialId !== undefined ? data.materialId : undefined,
        supplierId,
        suggestedSupplierId,
        supplierOfferId: chosenOffer?.id || (data.supplierOfferId !== undefined ? (data.supplierOfferId || null) : undefined),
        suggestedSupplierOfferId: suggestedOffer?.id || (data.suggestedSupplierOfferId !== undefined ? (data.suggestedSupplierOfferId || null) : undefined),
        estimateInternalLineId: data.estimateInternalLineId !== undefined ? data.estimateInternalLineId : undefined,
        projectActivityId: data.projectActivityId !== undefined ? data.projectActivityId : undefined,
        locationId: data.locationId !== undefined ? data.locationId : undefined,
        wbsId: data.wbsId !== undefined ? data.wbsId : undefined,
        requiredOnSiteDate: data.requiredOnSiteDate !== undefined ? (data.requiredOnSiteDate ? new Date(data.requiredOnSiteDate) : null) : undefined,
        leadTimeDays: leadTimeDays !== null ? leadTimeDays : (data.leadTimeDays !== undefined ? null : undefined),
        orderDate: data.orderDate !== undefined ? (data.orderDate ? new Date(data.orderDate) : null) : undefined,
        receivedDate,
        priority: data.priority !== undefined ? data.priority : undefined,
        status: normalizedStatus !== undefined ? normalizedStatus : undefined,
        responsible: data.responsible !== undefined ? data.responsible : undefined,
        quantity,
        unit: data.unit !== undefined ? data.unit : undefined,
        suggestedUnitCost,
        expectedUnitCost,
        expectedTotalCost,
        actualUnitCost,
        actualTotalCost,
        suggestedSupplierReason: data.suggestedSupplierReason !== undefined ? data.suggestedSupplierReason : undefined,
        scheduleRisk: risk.risk,
        isCriticalForSchedule: data.isCriticalForSchedule !== undefined ? data.isCriticalForSchedule : undefined,
        observations: data.observations !== undefined ? data.observations : undefined
      },
      include: {
        material: true,
        supplier: true,
        suggestedSupplier: true,
        supplierOffer: {
          include: {
            supplier: true,
            material: true,
          }
        },
        suggestedSupplierOffer: {
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
