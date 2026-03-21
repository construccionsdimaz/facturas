import { db } from '@/lib/db';

type OfferLike = {
  id: string;
  unitCost: number;
  unit: string;
  leadTimeDays: number | null;
  isPreferred?: boolean | null;
  supplier?: { id: string; name: string } | null;
};

export function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

export function evaluateScheduleRisk(requiredOnSiteDate?: Date | string | null, leadTimeDays?: number | null, referenceDate = new Date()) {
  if (!requiredOnSiteDate) return { risk: 'SIN_FECHA', slackDays: null, expectedArrivalDate: null };
  if (typeof leadTimeDays !== 'number' || !Number.isFinite(leadTimeDays)) return { risk: 'SIN_OFERTA', slackDays: null, expectedArrivalDate: null };

  const required = new Date(requiredOnSiteDate);
  const arrival = addDays(referenceDate, Math.max(0, Math.round(leadTimeDays)));
  const slackDays = Math.floor((required.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));

  if (slackDays < 0) return { risk: 'RETRASO', slackDays, expectedArrivalDate: arrival };
  if (slackDays <= 1) return { risk: 'JUSTO', slackDays, expectedArrivalDate: arrival };
  return { risk: 'OK', slackDays, expectedArrivalDate: arrival };
}

export function evaluateConsumption(rule: Record<string, unknown> | null | undefined, source: { lineQuantity?: number; durationDays?: number }) {
  if (!rule || typeof rule !== 'object') return 0;
  const base = typeof rule.base === 'number' ? rule.base : 0;
  const factor = typeof rule.factor === 'number' ? rule.factor : 1;
  const minimum = typeof rule.minimum === 'number' ? rule.minimum : 0;
  const sourceKey = typeof rule.source === 'string' ? rule.source : 'lineQuantity';

  let metric = 0;
  switch (sourceKey) {
    case 'durationDays':
      metric = Math.max(0, source.durationDays || 0);
      break;
    case 'lineQuantity':
    default:
      metric = Math.max(0, source.lineQuantity || 0);
      break;
  }

  return Math.max(minimum, Number((base + metric * factor).toFixed(2)));
}

export function chooseSupplierOffer(
  offers: OfferLike[],
  requiredOnSiteDate?: Date | string | null,
  strategy: 'CHEAPEST' | 'FASTEST' | 'PREFERRED' | 'BALANCED' = 'BALANCED',
  referenceDate = new Date()
) {
  const validOffers = offers.filter(
    (offer) =>
      typeof offer.unitCost === 'number' &&
      Number.isFinite(offer.unitCost) &&
      offer.unitCost > 0 &&
      typeof offer.leadTimeDays === 'number' &&
      Number.isFinite(offer.leadTimeDays)
  );

  if (validOffers.length === 0) {
    return {
      offer: null,
      reason: 'No hay ofertas validas con precio y plazo.',
      risk: requiredOnSiteDate ? 'SIN_OFERTA' : 'SIN_FECHA',
    };
  }

  const scored = validOffers.map((offer) => {
    const timing = evaluateScheduleRisk(requiredOnSiteDate, offer.leadTimeDays, referenceDate);
    const onTime = timing.risk === 'OK' || timing.risk === 'JUSTO';
    const preferenceBoost = offer.isPreferred ? -0.2 : 0;
    let score = offer.unitCost;

    if (strategy === 'FASTEST') score = offer.leadTimeDays || 0;
    if (strategy === 'PREFERRED') score = (offer.isPreferred ? 0 : 1000) + (offer.leadTimeDays || 0) + offer.unitCost / 100;
    if (strategy === 'BALANCED') score = (offer.unitCost * 0.7) + ((offer.leadTimeDays || 0) * 6) + preferenceBoost;

    return { offer, timing, onTime, score };
  });

  const pool = scored.some((item) => item.onTime) ? scored.filter((item) => item.onTime) : scored;
  pool.sort((a, b) => a.score - b.score || (a.offer.unitCost - b.offer.unitCost));
  const chosen = pool[0];

  const reason = chosen.onTime
    ? `Se sugiere ${chosen.offer.supplier?.name || 'proveedor sin nombre'} porque cumple plazo y encaja mejor con el criterio ${strategy}.`
    : `No hay oferta que cumpla plazo. Se sugiere ${chosen.offer.supplier?.name || 'proveedor sin nombre'} como mejor contingencia disponible.`;

  return {
    offer: chosen.offer,
    reason,
    risk: chosen.timing.risk,
    expectedArrivalDate: chosen.timing.expectedArrivalDate,
    slackDays: chosen.timing.slackDays,
  };
}

export async function suggestSupplierForMaterial(input: {
  materialId: string;
  requiredOnSiteDate?: Date | string | null;
  strategy?: 'CHEAPEST' | 'FASTEST' | 'PREFERRED' | 'BALANCED';
  referenceDate?: Date;
}) {
  const offers = await db.supplierMaterialOffer.findMany({
    where: {
      materialId: input.materialId,
      status: 'ACTIVA',
    },
    include: {
      supplier: {
        select: { id: true, name: true },
      },
    },
    orderBy: [
      { isPreferred: 'desc' },
      { unitCost: 'asc' },
      { leadTimeDays: 'asc' },
    ],
  });

  return chooseSupplierOffer(
    offers,
    input.requiredOnSiteDate,
    input.strategy || 'BALANCED',
    input.referenceDate || new Date()
  );
}
