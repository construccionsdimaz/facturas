import { NextResponse } from 'next/server';
import { buildOfferCatalogMetrics, buildOfferReviewQueue } from '@/lib/procurement/offer-intake';

export async function GET() {
  try {
    const [queue, metrics] = await Promise.all([
      buildOfferReviewQueue(),
      buildOfferCatalogMetrics(),
    ]);

    return NextResponse.json({
      queue,
      metrics,
    });
  } catch (error) {
    console.error('Error building offer review queue:', error);
    return NextResponse.json({ error: 'No se pudo construir la cola de revision de ofertas' }, { status: 500 });
  }
}
