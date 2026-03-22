import type {
  GeneratedEstimateLine,
  GeneratedEstimateProposal,
} from '@/lib/automation/estimate-generator';

export type IntegratedEstimateBucketCode =
  | 'ROOMS'
  | 'BATHS'
  | 'KITCHENETTES'
  | 'LEVELING'
  | 'COMMON_AREAS';

export type CommercialLineGeneratedFrom =
  | 'TECHNICAL'
  | 'LEGACY_STRUCTURE'
  | 'LEGACY_FALLBACK'
  | 'HYBRID';

export type LegacyBucketMatchStrategy =
  | 'CANONICAL_CODE'
  | 'HEURISTIC_TEXT'
  | 'NONE';

export type CommercialStructureScaffoldEntry = {
  bucketCode: IntegratedEstimateBucketCode;
  chapter: string;
  code: string;
  description: string;
  unit: 'lot';
  order: number;
};

export type LegacyBucketMatch = {
  bucketCode: IntegratedEstimateBucketCode;
  strategy: LegacyBucketMatchStrategy;
  lineIndexes: number[];
  lines: GeneratedEstimateLine[];
};

const CANONICAL_BUCKET_SCAFFOLD: Record<
  IntegratedEstimateBucketCode,
  CommercialStructureScaffoldEntry
> = {
  ROOMS: {
    bucketCode: 'ROOMS',
    chapter: '05 ACABADOS Y EQUIPAMIENTO',
    code: 'INT-ROOMS',
    description: 'Habitaciones / unidades tipo',
    unit: 'lot',
    order: 50,
  },
  BATHS: {
    bucketCode: 'BATHS',
    chapter: '05 ACABADOS Y EQUIPAMIENTO',
    code: 'INT-BATHS',
    description: 'Banos repetitivos',
    unit: 'lot',
    order: 51,
  },
  KITCHENETTES: {
    bucketCode: 'KITCHENETTES',
    chapter: '05 ACABADOS Y EQUIPAMIENTO',
    code: 'INT-KITCH',
    description: 'Kitchenettes',
    unit: 'lot',
    order: 52,
  },
  LEVELING: {
    bucketCode: 'LEVELING',
    chapter: '03 ALBANILERIA Y REDISTRIBUCION',
    code: 'INT-LEVEL',
    description: 'Nivelacion y regularizacion',
    unit: 'lot',
    order: 30,
  },
  COMMON_AREAS: {
    bucketCode: 'COMMON_AREAS',
    chapter: '06 ZONAS COMUNES Y REMATES',
    code: 'INT-COMMON',
    description: 'Zonas comunes',
    unit: 'lot',
    order: 60,
  },
};

const LEGACY_CODE_TO_BUCKET: Partial<
  Record<string, IntegratedEstimateBucketCode>
> = {
  ACABADOS_HAB: 'ROOMS',
  BANOS_REPETITIVOS: 'BATHS',
  COCINAS_OFFICE: 'KITCHENETTES',
  PAVIMENTOS: 'LEVELING',
  ZONAS_COMUNES: 'COMMON_AREAS',
};

function bucketFromHeuristicText(
  line: GeneratedEstimateLine
): IntegratedEstimateBucketCode | null {
  const text = `${line.chapter} ${line.description}`.toUpperCase();

  if (/HABITACI|UNIDADES|COLIVING/.test(text)) return 'ROOMS';
  if (/BANOS|SANITARIOS/.test(text)) return 'BATHS';
  if (/COCINA|KITCHENETTE|OFFICE/.test(text)) return 'KITCHENETTES';
  if (/ZONAS COMUNES|PORTAL|PASILLOS|ESCALERAS/.test(text)) {
    return 'COMMON_AREAS';
  }
  if (/NIVELACI|REGULARIZACI|PAVIMENT/.test(text)) return 'LEVELING';

  return null;
}

export function getCommercialStructureScaffold(
  bucketCode: IntegratedEstimateBucketCode
): CommercialStructureScaffoldEntry {
  return CANONICAL_BUCKET_SCAFFOLD[bucketCode];
}

export function matchLegacyProposalLineToBucket(line: GeneratedEstimateLine): {
  bucketCode: IntegratedEstimateBucketCode;
  strategy: LegacyBucketMatchStrategy;
} | null {
  const explicitCode = (line.code || '').toUpperCase();
  if (explicitCode && LEGACY_CODE_TO_BUCKET[explicitCode]) {
    return {
      bucketCode: LEGACY_CODE_TO_BUCKET[explicitCode] as IntegratedEstimateBucketCode,
      strategy: 'CANONICAL_CODE',
    };
  }

  const heuristicBucket = bucketFromHeuristicText(line);
  if (heuristicBucket) {
    return {
      bucketCode: heuristicBucket,
      strategy: 'HEURISTIC_TEXT',
    };
  }

  return null;
}

export function buildLegacyStructureScaffold(
  proposal: GeneratedEstimateProposal
): {
  bucketMatches: Map<IntegratedEstimateBucketCode, LegacyBucketMatch>;
  unmatchedLineIndexes: number[];
  globalCommercialFactor: number;
} {
  const bucketMatches = new Map<IntegratedEstimateBucketCode, LegacyBucketMatch>();
  const matchedIndexes = new Set<number>();

  proposal.lines.forEach((line, index) => {
    const match = matchLegacyProposalLineToBucket(line);
    if (!match) return;

    matchedIndexes.add(index);
    const existing = bucketMatches.get(match.bucketCode);
    if (existing) {
      existing.lineIndexes.push(index);
      existing.lines.push(line);
      if (existing.strategy !== 'CANONICAL_CODE' && match.strategy === 'CANONICAL_CODE') {
        existing.strategy = 'CANONICAL_CODE';
      }
      return;
    }

    bucketMatches.set(match.bucketCode, {
      bucketCode: match.bucketCode,
      strategy: match.strategy,
      lineIndexes: [index],
      lines: [line],
    });
  });

  const unmatchedLineIndexes = proposal.lines
    .map((_line, index) => index)
    .filter((index) => !matchedIndexes.has(index));

  const globalCommercialFactor =
    proposal.summary.internalCost > 0
      ? proposal.summary.commercialSubtotal / proposal.summary.internalCost
      : 1.24;

  return {
    bucketMatches,
    unmatchedLineIndexes,
    globalCommercialFactor,
  };
}
