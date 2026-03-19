import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documents = await db.projectDocument.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(documents);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, url, fileType, category } = body;

    const document = await db.projectDocument.create({
      data: {
        name,
        url,
        fileType,
        category: category || 'OTROS',
        projectId: id
      }
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}
