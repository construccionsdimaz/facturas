import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Individual certification management
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Fetch certification and lines before deleting
    // @ts-ignore
    const cert = await db.projectCertification.findUnique({
      where: { id },
      include: {
        lines: true
      }
    });

    if (!cert) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
    }

    if (cert.status === 'ISSUED' || cert.invoiceId) {
      return NextResponse.json({ error: 'Cannot delete an issued or invoiced certification' }, { status: 400 });
    }

    // 2. Perform deletion and revert budget line certified amounts in a transaction
    await db.$transaction(async (tx) => {
      // Revert certified amount for each line
      for (const line of cert.lines) {
        await tx.projectBudgetLine.update({
          where: { id: line.budgetLineId },
          data: {
            // @ts-ignore
            certifiedAmount: {
              decrement: line.currentAmount
            }
          }
        });
      }

      // Delete certification (cascade handles lines)
      // @ts-ignore
      await tx.projectCertification.delete({
        where: { id }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting certification:', error);
    return NextResponse.json({ error: 'Failed to delete certification' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { number, date, period } = body;

    // @ts-ignore
    const updatedCert = await db.projectCertification.update({
      where: { id },
      data: {
        number: number || undefined,
        date: date ? new Date(date) : undefined,
        period: period || undefined,
      }
    });

    return NextResponse.json(updatedCert);
  } catch (error) {
    console.error('Error updating certification:', error);
    return NextResponse.json({ error: 'Failed to update certification' }, { status: 500 });
  }
}
