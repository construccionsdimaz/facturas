import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readCommercialEstimateReadModel } from '@/lib/estimates/internal-analysis';
import { buildBc3EstimateExport } from '@/lib/interoperability/bc3-export';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === '1';

    const estimate = await (db.estimate as any).findUnique({
      where: { id },
      include: {
        client: true,
        project: true,
        items: true,
        discoverySession: {
          select: {
            id: true,
            title: true,
            derivedInput: true,
          },
        },
        internalAnalysis: {
          include: {
            lines: true,
          },
        },
      },
    });

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    const commercialReadModel = estimate.internalAnalysis
      ? readCommercialEstimateReadModel({
          generationNotes: estimate.internalAnalysis.generationNotes,
        })
      : {
          source: 'LEGACY' as const,
          commercialRuntimeOutput: null,
          commercialEstimateProjection: null,
        };

    const exported = buildBc3EstimateExport({
      estimateId: estimate.id,
      estimateNumber: estimate.number,
      estimateName:
        estimate.project?.name ||
        estimate.discoverySession?.title ||
        `Estimate ${estimate.number}`,
      issueDate: estimate.issueDate,
      projectName: estimate.project?.name || null,
      clientName: estimate.client?.name || null,
      commercialReadModel,
      discoveryDerivedInput: estimate.discoverySession?.derivedInput,
      legacyItems: estimate.items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        unit: item.unit,
        chapter: item.chapter,
      })),
    });

    if (download) {
      return new NextResponse(exported.content, {
        status: 200,
        headers: {
          'Content-Type': exported.mediaType,
          'Content-Disposition': `attachment; filename="${exported.fileName}"`,
        },
      });
    }

    return NextResponse.json({
      fileName: exported.fileName,
      mediaType: exported.mediaType,
      summary: exported.summary,
      preview: exported.content.split('\n').slice(0, 24),
      downloadUrl: `/api/estimates/${estimate.id}/export/bc3?download=1`,
    });
  } catch (error) {
    console.error('Error exporting estimate to BC3:', error);
    return NextResponse.json({ error: 'No se pudo exportar el estimate en BC3' }, { status: 500 });
  }
}
