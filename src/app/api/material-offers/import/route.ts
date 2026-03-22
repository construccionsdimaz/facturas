import { NextResponse } from 'next/server';
import { csvRowsToOfferPayloads, intakeSupplierOffer } from '@/lib/procurement/offer-intake';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const csvText = typeof body.csvText === 'string' ? body.csvText : '';
    if (!csvText.trim()) {
      return NextResponse.json({ error: 'csvText es obligatorio' }, { status: 400 });
    }

    const rows = csvRowsToOfferPayloads(csvText);
    const results = [];

    for (const row of rows) {
      if (!row.unit || !Number.isFinite(row.unitCost) || !Number.isFinite(row.leadTimeDays)) {
        results.push({
          status: 'NEEDS_REVIEW',
          mappingStatus: 'NEEDS_REVIEW',
          mappingReason: 'Fila CSV incompleta o sin datos numericos suficientes.',
          supplierName: row.supplierName || null,
          procurementMaterialCode: row.procurementMaterialCode || null,
          supplierProductName: row.supplierProductName || null,
        });
        continue;
      }

      const result = await intakeSupplierOffer({
        payload: row,
        source: 'CSV_IMPORT',
        updateExisting: Boolean(body.updateExisting),
      });
      results.push({
        ...result,
        supplierName: row.supplierName || null,
        procurementMaterialCode: row.procurementMaterialCode || null,
        supplierProductName: row.supplierProductName || null,
      });
    }

    return NextResponse.json({
      totalRows: rows.length,
      created: results.filter((row) => row.status === 'CREATED').length,
      updated: results.filter((row) => row.status === 'UPDATED').length,
      duplicates: results.filter((row) => row.status === 'DUPLICATE_SKIPPED').length,
      needsReview: results.filter((row) => row.mappingStatus === 'NEEDS_REVIEW').length,
      results,
    });
  } catch (error) {
    console.error('Error importing material offers:', error);
    return NextResponse.json({ error: 'No se pudo importar el CSV de ofertas' }, { status: 500 });
  }
}
