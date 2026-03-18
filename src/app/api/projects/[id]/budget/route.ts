import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  try {
    const { name, description, estimatedAmount } = await req.json();
    
    const budgetLine = await (db as any).projectBudgetLine.create({
      data: {
        name,
        description,
        estimatedAmount: parseFloat(estimatedAmount) || 0,
        projectId
      }
    });

    return NextResponse.json(budgetLine);
  } catch (error) {
    console.error('Error creating budget line:', error);
    return NextResponse.json({ error: 'Error al crear la partida' }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  try {
    const budgetLines = await (db as any).projectBudgetLine.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(budgetLines);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener las partidas' }, { status: 500 });
  }
}
