import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all imputations for a specific company expense
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyExpenseId } = await params;
    
    const imputations = await (db as any).imputedExpense.findMany({
      where: { companyExpenseId },
      include: {
        project: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(imputations);
  } catch (error) {
    console.error('Error fetching imputations:', error);
    return NextResponse.json({ error: 'Failed to fetch imputations' }, { status: 500 });
  }
}

// POST a new imputation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyExpenseId } = await params;
    const body = await request.json();
    const { projectId, amount, notes, date } = body;

    if (!projectId || !amount) {
      return NextResponse.json(
        { error: 'Project ID and amount are required' }, 
        { status: 400 }
      );
    }

    const newImputation = await (db as any).imputedExpense.create({
      data: {
        companyExpenseId,
        projectId,
        amount: parseFloat(amount),
        notes,
        date: date ? new Date(date) : new Date()
      },
      include: {
        project: true
      }
    });

    return NextResponse.json(newImputation, { status: 201 });
  } catch (error) {
    console.error('Error creating imputation:', error);
    return NextResponse.json({ error: 'Failed to create imputation' }, { status: 500 });
  }
}
