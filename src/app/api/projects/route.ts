import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // For now, we fetch all projects. In a fully multi-user app, we'd filter by userId.
    const projects = await (db as any).project.findMany({
      include: {
        client: true,
        _count: {
          select: {
            invoices: true,
            estimates: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Error al obtener las obras' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { name, description, address, clientId } = data;

    if (!name || !clientId) {
      return NextResponse.json({ error: 'Nombre y Cliente son obligatorios' }, { status: 400 });
    }

    // Get the first user for now (acting as current user)
    const user = await db.user.findFirst();
    if (!user) throw new Error('No user found');

    const project = await (db as any).project.create({
      data: {
        name,
        description,
        address,
        status: 'ACTIVE',
        clientId,
        userId: user.id
      }
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Error al crear la obra' }, { status: 500 });
  }
}
