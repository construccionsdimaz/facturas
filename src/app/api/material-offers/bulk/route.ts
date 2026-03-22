import { NextResponse } from 'next/server';
import { applyBulkOfferAction } from '@/lib/procurement/offer-intake';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action;
    const offerIds = Array.isArray(body.offerIds) ? body.offerIds.filter((value: unknown) => typeof value === 'string') : [];

    if (!action || offerIds.length === 0) {
      return NextResponse.json({ error: 'action y offerIds son obligatorios' }, { status: 400 });
    }

    let result;
    switch (action) {
      case 'ASSIGN_MATERIAL':
        if (typeof body.materialId !== 'string' || !body.materialId) {
          return NextResponse.json({ error: 'materialId es obligatorio para ASSIGN_MATERIAL' }, { status: 400 });
        }
        result = await applyBulkOfferAction({
          action,
          offerIds,
          materialId: body.materialId,
          activate: typeof body.activate === 'boolean' ? body.activate : undefined,
        });
        break;
      case 'CONFIRM_CANDIDATE':
        result = await applyBulkOfferAction({
          action,
          offerIds,
          materialId: typeof body.materialId === 'string' ? body.materialId : undefined,
        });
        break;
      case 'SET_ACTIVE':
        if (typeof body.isActive !== 'boolean') {
          return NextResponse.json({ error: 'isActive es obligatorio para SET_ACTIVE' }, { status: 400 });
        }
        result = await applyBulkOfferAction({
          action,
          offerIds,
          isActive: body.isActive,
        });
        break;
      case 'MARK_NO_MATCH':
      case 'MARK_NEEDS_REVIEW':
        result = await applyBulkOfferAction({
          action,
          offerIds,
        });
        break;
      case 'DEDUPLICATE_KEEP':
        if (typeof body.keepOfferId !== 'string' || !body.keepOfferId) {
          return NextResponse.json({ error: 'keepOfferId es obligatorio para DEDUPLICATE_KEEP' }, { status: 400 });
        }
        result = await applyBulkOfferAction({
          action,
          offerIds,
          keepOfferId: body.keepOfferId,
        });
        break;
      default:
        return NextResponse.json({ error: 'Accion bulk no soportada' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error applying bulk material offer action:', error);
    return NextResponse.json({ error: 'No se pudo ejecutar la accion masiva de ofertas' }, { status: 500 });
  }
}
