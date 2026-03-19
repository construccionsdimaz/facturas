import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const logs = await db.projectLog.findMany({
      where: { projectId: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { content, weather, incidents, photos } = body;

    const log = await db.projectLog.create({
      data: {
        content,
        weather,
        incidents,
        projectId: params.id,
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
