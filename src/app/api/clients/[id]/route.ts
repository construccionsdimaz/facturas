import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, address, taxId } = body;

    const updated = await db.client.update({
      where: { id },
      data: { name, email, address, taxId }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Optional: Check if client has invoices
    const invoiceCount = await db.invoice.count({
      where: { clientId: id }
    });

    if (invoiceCount > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un cliente que tiene facturas asociadas.' }, 
        { status: 400 }
      );
    }

    await db.client.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
