import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logs = await (db as any).projectLog.findMany({
      where: { projectId: id },
      include: { photos: true },
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, weather, incidents, photos } = body;

    const log = await (db as any).projectLog.create({
      data: {
        content,
        weather,
        incidents,
        projectId: id,
        photos: photos ? {
          create: photos.map((p: any) => ({
            url: p.url,
            caption: p.caption
          }))
        } : undefined
      },
      include: { photos: true }
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create log' }, { status: 500 });
  }
}
