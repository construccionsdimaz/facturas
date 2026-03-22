import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    const logs = await (prisma as any).projectProductionLog.findMany({
      where: { projectId },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching production logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const data = await request.json();

    const log = await (prisma as any).projectProductionLog.create({
      data: {
        projectId,
        date: data.date ? new Date(data.date) : new Date(),
        actor: data.actor || 'System',
        activityId: data.activityId,
        familyCode: data.familyCode,
        spaceId: data.spaceId,
        locationId: data.locationId,
        tradeCode: data.tradeCode,
        crewCode: data.crewCode,
        actualHours: Number(data.actualHours || 0),
        actualQuantity: Number(data.actualQuantity || 0),
        actualUnit: data.actualUnit || 'ud',
        progressPercent: Number(data.progressPercent || 0),
        notes: data.notes,
        status: data.status || 'VALIDATED',
      },
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error('Error creating production log:', error);
    return NextResponse.json({ error: 'Failed to create log' }, { status: 500 });
  }
}
