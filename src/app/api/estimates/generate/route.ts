import { NextResponse } from 'next/server';
import { generateEstimateProposal } from '@/lib/automation/estimate-generator';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const proposal = generateEstimateProposal({
      workType: body.workType,
      siteType: body.siteType,
      scopeType: body.scopeType,
      area: Number(body.area) || 0,
      works: body.works || '',
      finishLevel: body.finishLevel,
      accessLevel: body.accessLevel || 'NORMAL',
      conditions: body.conditions || '',
      bathrooms: body.bathrooms ? Number(body.bathrooms) : 0,
      kitchens: body.kitchens ? Number(body.kitchens) : 0,
      rooms: body.rooms ? Number(body.rooms) : 0,
      units: body.units ? Number(body.units) : 1,
      floors: body.floors ? Number(body.floors) : 1,
      hasElevator: Boolean(body.hasElevator),
      structuralWorks: Boolean(body.structuralWorks),
    });

    return NextResponse.json(proposal);
  } catch (error) {
    console.error('Error generating estimate proposal:', error);
    return NextResponse.json(
      { error: 'No se pudo generar la propuesta automatica' },
      { status: 500 }
    );
  }
}
