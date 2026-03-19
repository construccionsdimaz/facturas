import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const suppliers = await db.client.findMany({
      where: {
        category: 'PROVEEDOR',
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    return NextResponse.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, address, phone, taxId } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required to create a supplier' }, 
        { status: 400 }
      );
    }

    // Find the default user
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

    const newSupplier = await db.client.create({
      data: {
        name,
        email,
        address,
        phone,
        taxId,
        category: 'PROVEEDOR',
        userId: user.id,
      }
    });

    return NextResponse.json(newSupplier, { status: 201 });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 });
  }
}
