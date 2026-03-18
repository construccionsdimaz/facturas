import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all certifications for a project
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    // @ts-ignore - Prisma types might be out of sync
    const certifications = await db.projectCertification.findMany({
      where: { projectId: id },
      include: {
        lines: {
          include: {
            budgetLine: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    
    return NextResponse.json(certifications);
  } catch (error) {
    console.error('Error fetching certifications:', error);
    return NextResponse.json({ error: 'Failed to fetch certifications' }, { status: 500 });
  }
}

// POST new certification
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { number, date, period, lines, totalAmount, retentionAmount, netAmount } = body;

    // Create Certification and lines in a transaction
    const certification = await db.$transaction(async (tx) => {
      // @ts-ignore - Prisma types might be out of sync
      const newCert = await tx.projectCertification.create({
        data: {
          number,
          date: new Date(date),
          period,
          totalAmount,
          retentionAmount,
          netAmount,
          projectId: id,
          status: 'DRAFT',
          lines: {
            create: lines.map((line: any) => ({
              budgetLineId: line.budgetLineId,
              previousAmount: line.previousAmount || 0,
              currentAmount: line.currentAmount || 0,
              totalToDate: line.totalToDate || 0,
              percentage: line.percentage || 0,
            }))
          }
        },
        include: {
          lines: true
        }
      });

      // Update ProjectBudgetLine certified amounts
      for (const line of lines) {
        await tx.projectBudgetLine.update({
          where: { id: line.budgetLineId },
          data: {
            // @ts-ignore - Prisma types might be out of sync
            certifiedAmount: {
              increment: line.currentAmount
            }
          }
        });
      }

      return newCert;
    });

    return NextResponse.json(certification, { status: 201 });
  } catch (error) {
    console.error('Error creating certification:', error);
    return NextResponse.json({ error: 'Failed to create certification' }, { status: 500 });
  }
}
