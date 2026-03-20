import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string, wbsId: string }> }
) {
  const { wbsId } = await params;
  try {
    const data = await req.json();
    
    if (data.parentId === wbsId) {
      return NextResponse.json({ error: 'Un elemento no puede ser su propio padre' }, { status: 400 });
    }

    const wbsItem = await (db as any).projectWBS.update({
      where: { id: wbsId },
      data: {
        parentId: data.parentId !== undefined ? data.parentId : undefined,
        name: data.name,
        code: data.code,
        level: data.level,
        status: data.status,
        description: data.description,
        observations: data.observations
      }
    });
    return NextResponse.json(wbsItem);
  } catch (error) {
    console.error('Error updating WBS item:', error);
    return NextResponse.json({ error: 'Error al actualizar el elemento WBS' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string, wbsId: string }> }
) {
  const { wbsId } = await params;
  try {
    const childrenCount = await (db as any).projectWBS.count({
      where: { parentId: wbsId }
    });

    if (childrenCount > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar un elemento que contiene sub-elementos. Elimina primero su contenido o recolócalo.' 
      }, { status: 400 });
    }

    await (db as any).projectWBS.delete({
      where: { id: wbsId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting WBS item:', error);
    return NextResponse.json({ error: 'Error al eliminar el elemento WBS' }, { status: 500 });
  }
}
