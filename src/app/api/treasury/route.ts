import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Fetch pending project expenses
    const projectExpenses = await (db as any).projectExpense.findMany({
      where: {
        status: { not: 'PAGADO' }
      },
      include: {
        project: {
          select: { name: true }
        },
        client: {
          select: { name: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    // Fetch pending company expenses
    const companyExpenses = await (db as any).companyExpense.findMany({
      where: {
        status: { not: 'PAGADO' }
      },
      include: {
        client: {
          select: { name: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    // Normalize and combine
    const allPending = [
      ...projectExpenses.map((e: any) => ({
        id: e.id,
        source: 'PROJECT',
        description: e.description,
        amount: e.amount,
        paidAmount: e.paidAmount || 0,
        pendingAmount: e.amount - (e.paidAmount || 0),
        date: e.date,
        dueDate: e.dueDate,
        category: e.category,
        projectName: e.project?.name,
        projectId: e.projectId,
        supplierName: e.client?.name || 'S/N',
        status: e.status
      })),
      ...companyExpenses.map((e: any) => ({
        id: e.id,
        source: 'COMPANY',
        description: e.description,
        amount: e.amount,
        paidAmount: e.paidAmount || 0,
        pendingAmount: e.amount - (e.paidAmount || 0),
        date: e.date,
        dueDate: e.dueDate,
        category: e.category,
        projectName: 'Estructura / Empresa',
        projectId: null,
        supplierName: e.client?.name || 'S/N',
        status: e.status
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(allPending);
  } catch (error) {
    console.error('Error fetching treasury data:', error);
    return NextResponse.json({ error: 'Error al obtener datos de tesorería' }, { status: 500 });
  }
}
