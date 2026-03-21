import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const projectInclude = {
  client: true,
  invoices: {
    orderBy: { createdAt: 'desc' as const }
  },
  estimates: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      items: true,
      internalAnalysis: {
        include: {
          lines: true,
        },
      },
    },
  },
  calendar: true,
  milestones: { orderBy: { targetDate: 'asc' as const } },
  constraints: { orderBy: { createdAt: 'desc' as const } },
  budgetLines: { orderBy: { createdAt: 'asc' as const } },
  expenses: { orderBy: { date: 'desc' as const } },
  certifications: {
    include: { lines: true },
    orderBy: { date: 'desc' as const }
  },
  activities: {
    orderBy: { createdAt: 'asc' as const },
  },
  supplies: {
    orderBy: { createdAt: 'desc' as const },
  },
  imputedExpenses: {
    include: { companyExpense: true },
    orderBy: { date: 'desc' as const }
  }
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const project = await (db as any).project.findUnique({
      where: { id },
      include: projectInclude
    });

    if (!project) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Error al obtener la obra' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await req.json();
    const { 
      name, description, address, status, clientId,
      code, projectType, manager, targetEndDate, contractualEndDate, observations, setupStatus
    } = data;

    const project = await (db as any).project.update({
      where: { id },
      data: {
        name,
        description,
        address,
        status,
        clientId,
        code, 
        projectType, 
        manager, 
        targetEndDate: targetEndDate ? new Date(targetEndDate) : null,
        contractualEndDate: contractualEndDate ? new Date(contractualEndDate) : null,
        observations,
        setupStatus
      },
      include: projectInclude
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Error al actualizar la obra' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // We don't delete invoices/estimates, just the project link.
    // Prisma relation on Invoice is optional projectId, so it works.
    await (db as any).project.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Error al eliminar la obra' }, { status: 500 });
  }
}
