import { NextResponse } from 'next/server';
import { previewOfferCsvImport } from '@/lib/procurement/offer-intake';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const csvText = typeof body.csvText === 'string' ? body.csvText : '';
    if (!csvText.trim()) {
      return NextResponse.json({ error: 'csvText es obligatorio' }, { status: 400 });
    }

    const preview = await previewOfferCsvImport(csvText);
    return NextResponse.json(preview);
  } catch (error) {
    console.error('Error previewing material offers CSV:', error);
    return NextResponse.json({ error: 'No se pudo previsualizar el CSV de ofertas' }, { status: 500 });
  }
}
