import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all company expense imputations for a specific project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    const imputations = await (db as any).imputedExpense.findMany({
      where: { projectId },
      include: {
        companyExpense: true
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    return NextResponse.json(imputations);
  } catch (error) {
    console.error('Error fetching project imputations:', error);
    return NextResponse.json({ error: 'Failed to fetch project imputations' }, { status: 500 });
  }
}
