import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const budgetLines = await (db as any).projectBudgetLine.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(budgetLines);
  } catch (error) {
    console.error('Error fetching budget lines:', error);
    return NextResponse.json({ error: 'Error al obtener las partidas' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const data = await req.json();
    const { name, description, estimatedAmount } = data;

    if (!name) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    const budgetLine = await (db as any).projectBudgetLine.create({
      data: {
        name,
        description,
        estimatedAmount: parseFloat(estimatedAmount) || 0,
        projectId: id
      }
    });

    return NextResponse.json(budgetLine);
  } catch (error) {
    console.error('Error creating budget line:', error);
    return NextResponse.json({ error: 'Error al crear la partida' }, { status: 500 });
  }
}
