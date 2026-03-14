import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const clients = await db.client.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, address, phone, taxId } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required to create a client' }, 
        { status: 400 }
      );
    }

    // Demo purpose: Find the first user or create a default one to attach the client to
    let user = await db.user.findFirst();
    if (!user) {
      user = await db.user.create({
        data: {
          email: 'admin@nextgen.inc',
          name: 'Admin',
          role: 'ADMIN',
        }
      });
    }

    const newClient = await db.client.create({
      data: {
        name,
        email,
        address,
        phone,
        taxId,
        userId: user.id,
      }
    });

    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
