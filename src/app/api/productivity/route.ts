import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const rates = await (db as any).productivityRate.findMany({
      include: {
        standardActivity: true
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
    return NextResponse.json(rates);
  } catch (error) {
    console.error('Error fetching productivity rates:', error);
    return NextResponse.json({ error: 'Error al obtener el banco de rendimientos' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Check required basic
    if (!data.name || !data.value || !data.unit || !data.category) {
       return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const rate = await (db as any).productivityRate.create({
      data: {
        name: data.name,
        standardActivityId: data.standardActivityId || null,
        value: parseFloat(data.value),
        unit: data.unit,
        category: data.category,
        complexity: data.complexity || 'MEDIA',
        workType: data.workType || 'GENERICO',
        locationType: data.locationType || 'INTERIOR',
        confidenceLevel: data.confidenceLevel || 'TEORICO',
        status: data.status || 'BORRADOR',
        description: data.description || null,
        observations: data.observations || null
      },
      include: {
        standardActivity: true
      }
    });

    return NextResponse.json(rate);
  } catch (error) {
    console.error('Error creating productivity rate:', error);
    return NextResponse.json({ error: 'Error al crear el rendimiento' }, { status: 500 });
  }
}
