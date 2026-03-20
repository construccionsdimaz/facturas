import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const activities = await (db as any).standardActivity.findMany({
      orderBy: [
        { category: 'asc' },
        { code: 'asc' },
        { name: 'asc' }
      ]
    });
    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching standard activities:', error);
    return NextResponse.json({ error: 'Error al obtener el catálogo de actividades' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Check if code already exists if provided
    if (data.code) {
      const existing = await (db as any).standardActivity.findUnique({
        where: { code: data.code }
      });
      if (existing) {
        return NextResponse.json({ error: 'Ya existe una actividad con este código' }, { status: 400 });
      }
    }

    const activity = await (db as any).standardActivity.create({
      data: {
        code: data.code || null,
        name: data.name,
        category: data.category,
        description: data.description || null,
        observations: data.observations || null,
        status: data.status || 'ACTIVA',
        
        defaultUnit: data.defaultUnit || 'ud',
        requiresQuantity: data.requiresQuantity ?? false,
        requiresLocation: data.requiresLocation ?? true,
        requiresManager: data.requiresManager ?? false,
        requiresCrew: data.requiresCrew ?? false,
        
        canBeInSchedule: data.canBeInSchedule ?? true,
        canBeInLookahead: data.canBeInLookahead ?? true,
        canBeInWeeklyPlan: data.canBeInWeeklyPlan ?? true,
        
        requiresInspection: data.requiresInspection ?? false,
        relatedToPurchases: data.relatedToPurchases ?? false,
        generatesWait: data.generatesWait ?? false,
        actsAsMilestone: data.actsAsMilestone ?? false,
        allowsRepetition: data.allowsRepetition ?? true
      }
    });
    return NextResponse.json(activity);
  } catch (error) {
    console.error('Error creating standard activity:', error);
    return NextResponse.json({ error: 'Error al crear la actividad estándar' }, { status: 500 });
  }
}
