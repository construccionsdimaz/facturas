import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type');
    
    const where: any = {};
    if (projectId) {
      // Find movements directly linked or via imputations
      where.OR = [
        { projectId: projectId },
        { imputations: { some: { projectId: projectId } } }
      ];
    }
    if (type) where.type = type;

    const movements = await (db as any).movement.findMany({
      where,
      include: {
        project: { select: { name: true } },
        client: { select: { name: true } },
        invoice: { select: { number: true } },
        imputations: {
          include: { project: { select: { name: true } } }
        }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(movements);
  } catch (error) {
    console.error('Error fetching movements:', error);
    return NextResponse.json({ error: 'Error al obtener movimientos' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { 
      amount, date, method, description, type, category, 
      projectId, clientId, invoiceId, projectExpenseId, companyExpenseId,
      isFacturado, imputations 
    } = data;

    if (!amount || !type || !category) {
      return NextResponse.json({ error: 'Importe, tipo y categoría son obligatorios' }, { status: 400 });
    }

    const floatAmount = parseFloat(amount);

    // Create movement and imputations in a transaction
    const movement = await db.$transaction(async (tx) => {
      const mov = await (tx as any).movement.create({
        data: {
          amount: floatAmount,
          date: date ? new Date(date) : new Date(),
          method: method || 'TRANSFERENCIA',
          description,
          type,
          category,
          projectId, // Main project (optional)
          clientId,
          invoiceId,
          projectExpenseId,
          companyExpenseId,
          isFacturado: isFacturado || (category === 'COBRO_FACTURA')
        }
      });

      // Handle granular imputations
      if (imputations && Array.isArray(imputations) && imputations.length > 0) {
        for (const imp of imputations) {
          await (tx as any).movementImputation.create({
            data: {
              amount: parseFloat(imp.amount),
              projectId: imp.projectId,
              movementId: mov.id
            }
          });
        }
      } else if (projectId) {
        // Automatic 100% imputation if single projectId provided
        await (tx as any).movementImputation.create({
          data: {
            amount: floatAmount,
            projectId: projectId,
            movementId: mov.id
          }
        });
      }

      return mov;
    });

    // SYNC LOGIC: Update paidAmount in related entities (omitted details for brevity, using same logic as before)
    if (type === 'ENTRY' && invoiceId) {
      const invoice = await (db as any).invoice.findUnique({ where: { id: invoiceId } });
      if (invoice) {
        const newPaid = Math.round((invoice.paidAmount + floatAmount) * 100) / 100;
        const status = newPaid >= invoice.total ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'ISSUED';
        await (db as any).invoice.update({
          where: { id: invoiceId },
          data: { paidAmount: newPaid, status }
        });
      }
    } else if (type === 'EXIT' && projectExpenseId) {
      const expense = await (db as any).projectExpense.findUnique({ where: { id: projectExpenseId } });
      if (expense) {
        const newPaid = Math.round((expense.paidAmount + floatAmount) * 100) / 100;
        const status = newPaid >= expense.amount ? 'PAGADO' : newPaid > 0 ? 'PARCIAL' : 'PENDIENTE';
        await (db as any).projectExpense.update({
          where: { id: projectExpenseId },
          data: { paidAmount: newPaid, status }
        });
      }
    } else if (type === 'EXIT' && companyExpenseId) {
      const expense = await (db as any).companyExpense.findUnique({ where: { id: companyExpenseId } });
      if (expense) {
        const newPaid = Math.round((expense.paidAmount + floatAmount) * 100) / 100;
        const status = newPaid >= expense.amount ? 'PAGADO' : newPaid > 0 ? 'PARCIAL' : 'PENDIENTE';
        await (db as any).companyExpense.update({
          where: { id: companyExpenseId },
          data: { paidAmount: newPaid, status }
        });
      }
    }

    return NextResponse.json(movement);
  } catch (error) {
    console.error('Error creating movement:', error);
    return NextResponse.json({ error: 'Error al registrar el movimiento' }, { status: 500 });
  }
}
