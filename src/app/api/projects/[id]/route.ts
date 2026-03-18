import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const project = await (db as any).project.findUnique({
      where: { id },
      include: {
        client: true,
        invoices: {
          orderBy: { createdAt: 'desc' }
        },
        estimates: {
          orderBy: { createdAt: 'desc' }
        },
        budgetLines: {
          orderBy: { createdAt: 'asc' }
        },
        expenses: {
          orderBy: { date: 'desc' }
        }
      }
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
    const { name, description, address, status, clientId } = data;

    const project = await (db as any).project.update({
      where: { id },
      data: {
        name,
        description,
        address,
        status,
        clientId
      }
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
