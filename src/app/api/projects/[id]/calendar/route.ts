import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const data = await req.json();
    const { workingDays, workHours, worksSaturdays, worksHolidays, bufferDays, timeCriteria } = data;

    const calendar = await (db as any).projectCalendar.upsert({
      where: { projectId: id },
      update: {
        workingDays: JSON.stringify(workingDays || []),
        workHours,
        worksSaturdays,
        worksHolidays,
        bufferDays: Number(bufferDays),
        timeCriteria
      },
      create: {
        projectId: id,
        workingDays: JSON.stringify(workingDays || []),
        workHours,
        worksSaturdays,
        worksHolidays,
        bufferDays: Number(bufferDays),
        timeCriteria
      }
    });

    return NextResponse.json(calendar);
  } catch (error) {
    console.error('Error updating calendar:', error);
    return NextResponse.json({ error: 'Error al actualizar calendario' }, { status: 500 });
  }
}
