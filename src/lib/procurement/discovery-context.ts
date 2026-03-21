import type { ExecutionContext } from '@/lib/discovery/types';

export type DiscoverySupplyHint = {
  description: string;
  category: string;
  quantity: number;
  unit: string;
  priority: 'CRITICA' | 'ALTA' | 'NORMAL';
  requiredSpaceId?: string | null;
};

export function buildDiscoverySupplyHints(context?: ExecutionContext | null): DiscoverySupplyHint[] {
  if (!context) return [];

  const hints: DiscoverySupplyHint[] = [];

  for (const space of context.resolvedSpaces) {
    const floorArea = space.measurementDrivers.floorSurfaceM2 ?? space.measurementDrivers.areaM2 ?? 0;
    if ((space.features.hasBathroom || space.features.countAsBathroom) && context.inclusions.SANITARIOS === 'INCLUIDO') {
      hints.push({
        description: `Sanitarios y griferia para ${space.label}`,
        category: 'BANOS',
        quantity: Math.max(1, space.measurementDrivers.sanitaryFixturesCount || 1),
        unit: 'ud',
        priority: 'ALTA',
        requiredSpaceId: space.spaceId,
      });
    }

    if ((space.features.hasKitchenette || space.features.countAsKitchen || space.areaType === 'COCINA') && context.inclusions.COCINA === 'INCLUIDO') {
      hints.push({
        description: `Equipamiento de cocina para ${space.label}`,
        category: 'COCINA',
        quantity: 1,
        unit: 'ud',
        priority: 'ALTA',
        requiredSpaceId: space.spaceId,
      });
    }

    if ((space.measurementDrivers.windowsCount || 0) > 0 && context.inclusions.VENTANAS === 'INCLUIDO') {
      hints.push({
        description: `Carpinteria exterior para ${space.label}`,
        category: 'CARPINTERIA',
        quantity: Math.max(1, space.measurementDrivers.windowsCount || 1),
        unit: 'ud',
        priority: 'ALTA',
        requiredSpaceId: space.spaceId,
      });
    }

    if (space.features.requiresLeveling && floorArea > 0) {
      hints.push({
        description: `Nivelacion y morteros para ${space.label}`,
        category: 'ACABADOS',
        quantity: Number(floorArea.toFixed(2)),
        unit: 'm2',
        priority: 'NORMAL',
        requiredSpaceId: space.spaceId,
      });
    }
  }

  return hints;
}
