import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: movementId } = await params;
    
    // Get movement before deleting to revert sync
    const movement = await (db as any).movement.findUnique({ where: { id: movementId } });
    if (!movement) return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });

    // REVERT SYNC LOGIC
    if (movement.type === 'ENTRY' && movement.invoiceId) {
      const invoice = await (db as any).invoice.findUnique({ where: { id: movement.invoiceId } });
      if (invoice) {
        const newPaid = Math.max(0, Math.round((invoice.paidAmount - movement.amount) * 100) / 100);
        const status = newPaid >= invoice.total ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'ISSUED';
        await (db as any).invoice.update({
          where: { id: movement.invoiceId },
          data: { paidAmount: newPaid, status }
        });
      }
    } else if (movement.type === 'EXIT' && movement.projectExpenseId) {
      const expense = await (db as any).projectExpense.findUnique({ where: { id: movement.projectExpenseId } });
      if (expense) {
        const newPaid = Math.max(0, Math.round((expense.paidAmount - movement.amount) * 100) / 100);
        const status = newPaid >= expense.amount ? 'PAGADO' : newPaid > 0 ? 'PARCIAL' : 'PENDIENTE';
        await (db as any).projectExpense.update({
          where: { id: movement.projectExpenseId },
          data: { paidAmount: newPaid, status }
        });
      }
    } else if (movement.type === 'EXIT' && movement.companyExpenseId) {
       const expense = await (db as any).companyExpense.findUnique({ where: { id: movement.companyExpenseId } });
       if (expense) {
         const newPaid = Math.max(0, Math.round((expense.paidAmount - movement.amount) * 100) / 100);
         const status = newPaid >= expense.amount ? 'PAGADO' : newPaid > 0 ? 'PARCIAL' : 'PENDIENTE';
         await (db as any).companyExpense.update({
           where: { id: movement.companyExpenseId },
           data: { paidAmount: newPaid, status }
         });
       }
    }

    await (db as any).movement.delete({ where: { id: movementId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting movement:', error);
    return NextResponse.json({ error: 'Error al eliminar el movimiento' }, { status: 500 });
  }
}
