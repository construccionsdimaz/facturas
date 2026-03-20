import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const expenses = await (db as any).companyExpense.findMany({
      include: {
        imputations: {
          include: {
            project: true
          }
        },
        client: true
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching company expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch company expenses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { description, amount, date, category, status, clientId } = body;

    if (!description || !amount || !category) {
      return NextResponse.json(
        { error: 'Description, amount and category are required' }, 
        { status: 400 }
      );
    }

    // Find the first user or create a default one
    let user = await db.user.findFirst();
    if (!user) {
      user = await db.user.create({
        data: {
          email: 'admin@nextgen.inc',
          name: 'Admin',
          role: 'ADMIN',
        }
      });
    }

    const newExpense = await (db as any).companyExpense.create({
      data: {
        description,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        category,
        status: status || 'PAGADO',
        userId: user.id,
        clientId: clientId || null
      }
    });

    return NextResponse.json(newExpense, { status: 201 });
  } catch (error) {
    console.error('Error creating company expense:', error);
    return NextResponse.json({ error: 'Failed to create company expense' }, { status: 500 });
  }
}
