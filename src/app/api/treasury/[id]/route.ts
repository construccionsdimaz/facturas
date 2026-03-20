import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const { paidAmount, source } = await req.json();
    
    if (source === 'PROJECT') {
      const expense = await (db as any).projectExpense.findUnique({ where: { id } });
      if (!expense) return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 });
      
      const newPaidAmount = Math.round(parseFloat(paidAmount) * 100) / 100;
      const status = newPaidAmount >= expense.amount ? 'PAGADO' : newPaidAmount > 0 ? 'PARCIAL' : 'PENDIENTE';
      
      const updated = await (db as any).projectExpense.update({
        where: { id },
        data: { paidAmount: newPaidAmount, status }
      });
      return NextResponse.json(updated);
    } else if (source === 'COMPANY') {
      const expense = await (db as any).companyExpense.findUnique({ where: { id } });
      if (!expense) return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 });
      
      const newPaidAmount = Math.round(parseFloat(paidAmount) * 100) / 100;
      const status = newPaidAmount >= expense.amount ? 'PAGADO' : newPaidAmount > 0 ? 'PARCIAL' : 'PENDIENTE';
      
      const updated = await (db as any).companyExpense.update({
        where: { id },
        data: { paidAmount: newPaidAmount, status }
      });
      return NextResponse.json(updated);
    }
    
    return NextResponse.json({ error: 'Source no especificado' }, { status: 400 });
  } catch (error) {
    console.error('Error updating treasury expense:', error);
    return NextResponse.json({ error: 'Error al actualizar el pago' }, { status: 500 });
  }
}
