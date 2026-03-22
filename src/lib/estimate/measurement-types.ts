import type {
  ResolvedSpecSourceLevel,
  VerticalSolutionCode,
} from '@/lib/discovery/technical-spec-types';

export type MeasurementStatus =
  | 'MEASURED'
  | 'PARTIAL'
  | 'ASSUMED'
  | 'BLOCKED';

export type MeasurementLine = {
  id: string;
  spaceId: string;
  solutionCode: VerticalSolutionCode;
  measurementCode: string;
  description: string;
  quantity: number;
  unit: 'm2' | 'ml' | 'ud' | 'lot' | 'pt';
  sourceLevel: ResolvedSpecSourceLevel;
  sourceRefId?: string;
  assumedFields: string[];
  status: MeasurementStatus;
};

export type MeasurementResult = {
  status: 'READY' | 'PARTIAL' | 'BLOCKED';
  lines: MeasurementLine[];
  coverage: {
    measuredLines: number;
    partialLines: number;
    assumedLines: number;
    blockedLines: number;
    specifiedScopePercent: number;
  };
  warnings: string[];
  assumptions: string[];
};
