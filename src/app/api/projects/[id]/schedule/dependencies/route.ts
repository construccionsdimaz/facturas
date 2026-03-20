import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// O(V+E) DFS para detectar ciclos (Bucles infinitos)
async function hasCircularDependency(newPredecessorId: string, newSuccessorId: string, projectId: string) {
  // 1. Cargamos todas las relaciones del proyecto actual
  const allActivitiesInProject = await (db as any).projectActivity.findMany({
    where: { projectId },
    select: { id: true, successorLinks: { select: { successorId: true } } }
  });

  // 2. Construimos una tabla hash del grafo dirigido (Adjacency List)
  const graph: Record<string, string[]> = {};
  allActivitiesInProject.forEach((act: any) => {
    graph[act.id] = act.successorLinks.map((link: any) => link.successorId);
  });

  // 3. Añadimos el enlace "futuro" al grafo
  if (!graph[newPredecessorId]) graph[newPredecessorId] = [];
  graph[newPredecessorId].push(newSuccessorId);

  // 4. Búsqueda DFS desde el nodo inicial modificado
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) return true; // Ciclo detectado!
    if (visited.has(nodeId)) return false; // Ya explorado

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = graph[nodeId] || [];
    for (const neighbor of neighbors) {
      if (dfs(neighbor)) return true;
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Verificamos partiendo del ancestro inyectado
  return dfs(newPredecessorId);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const dependencies = await (db as any).activityDependency.findMany({
      where: {
        predecessor: { projectId: id }
      },
      include: {
        predecessor: {
          select: { id: true, name: true, code: true }
        },
        successor: {
          select: { id: true, name: true, code: true }
        }
      }
    });
    return NextResponse.json(dependencies);
  } catch (error) {
    console.error('Error fetching dependencies:', error);
    return NextResponse.json({ error: 'Error visualizando dependencias' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await req.json();

    if (data.predecessorId === data.successorId) {
      return NextResponse.json({ error: 'Una actividad no puede depender de sí misma' }, { status: 400 });
    }

    // Prevención de Ciclos Infinitos Críticos
    const isCircular = await hasCircularDependency(data.predecessorId, data.successorId, id);
    if (isCircular) {
      return NextResponse.json({ 
        error: 'Secuencia circular detectada. Esta relación crearía un bucle temporal infinito.' 
      }, { status: 400 });
    }

    const dependency = await (db as any).activityDependency.create({
      data: {
        predecessorId: data.predecessorId,
        successorId: data.successorId,
        dependencyType: data.dependencyType || 'FS',
        lagDays: data.lagDays ? parseFloat(data.lagDays) : 0,
        observations: data.observations || null
      },
      include: {
        predecessor: { select: { id: true, name: true, code: true } },
        successor: { select: { id: true, name: true, code: true } }
      }
    });

    return NextResponse.json(dependency);
  } catch (error: any) {
    console.error('Error creating dependency:', error);
    if (error.code === 'P2002') return NextResponse.json({ error: 'Ya existe un vínculo directo entre estas actividades' }, { status: 400 });
    return NextResponse.json({ error: 'Error al registrar la dependencia constructiva' }, { status: 500 });
  }
}
