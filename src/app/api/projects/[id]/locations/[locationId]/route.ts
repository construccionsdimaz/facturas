import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string, locationId: string }> }
) {
  const { locationId } = await params;
  try {
    const data = await req.json();
    
    // Check for circular dependency if changing parent
    if (data.parentId === locationId) {
      return NextResponse.json({ error: 'Una ubicación no puede ser su propio padre' }, { status: 400 });
    }

    const location = await (db as any).projectLocation.update({
      where: { id: locationId },
      data: {
        parentId: data.parentId !== undefined ? data.parentId : undefined,
        name: data.name,
        code: data.code,
        type: data.type,
        status: data.status,
        description: data.description,
        observations: data.observations
      }
    });
    return NextResponse.json(location);
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json({ error: 'Error al actualizar ubicación' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string, locationId: string }> }
) {
  const { locationId } = await params;
  try {
    // Check if it has children
    const childrenCount = await (db as any).projectLocation.count({
      where: { parentId: locationId }
    });

    if (childrenCount > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar una ubicación que contiene sub-ubicaciones. Elimina primero o mueve las partes interiores.' 
      }, { status: 400 });
    }

    await (db as any).projectLocation.delete({
      where: { id: locationId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json({ error: 'Error al eliminar ubicación' }, { status: 500 });
  }
}
