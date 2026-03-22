import type { GeneratedEstimateProposal } from '@/lib/automation/estimate-generator';
import type { ExecutionContext } from '@/lib/discovery/types';
import type { MeasurementResult } from './measurement-types';
import type { PricingResult } from './pricing-types';
import type { RecipeResult } from './recipe-types';
import type { EstimateStatusSnapshot } from './estimate-status';
import {
  buildCommercialEstimateProjection,
  type CommercialEstimateProjection,
  type IntegratedEstimateBucketCode,
  type IntegratedEstimateCostBucket,
} from './commercial-estimate-projection';
import {
  adaptCommercialRuntimeOutputToLegacyProposal,
  buildCommercialEstimateRuntimeOutput,
  type CommercialEstimateRuntimeOutput,
} from './commercial-estimate-runtime';

export type { CommercialEstimateProjection, IntegratedEstimateBucketCode, IntegratedEstimateCostBucket };
export type { CommercialEstimateRuntimeOutput };

type IntegratedProposalResult = {
  runtimeOutput: CommercialEstimateRuntimeOutput;
  proposal: GeneratedEstimateProposal & {
    integratedCostBuckets: IntegratedEstimateCostBucket[];
    commercialEstimateProjection: CommercialEstimateProjection;
    commercialRuntimeOutput: CommercialEstimateRuntimeOutput;
  };
};

export function integratePricingIntoEstimateProposal(
  proposal: GeneratedEstimateProposal,
  pricingResult?: PricingResult,
  options?: {
    recipeResult?: RecipeResult;
    measurementResult?: MeasurementResult;
    executionContext?: ExecutionContext;
    estimateStatus?: EstimateStatusSnapshot;
  }
): IntegratedProposalResult {
  const projection = buildCommercialEstimateProjection({
    proposal,
    pricingResult,
    recipeResult: options?.recipeResult,
    measurementResult: options?.measurementResult,
    executionContext: options?.executionContext,
    estimateStatus: options?.estimateStatus || proposal.estimateStatus,
  });
  const runtimeOutput = buildCommercialEstimateRuntimeOutput({
    projection,
    baseProposal: proposal,
  });

  return {
    runtimeOutput,
    proposal: adaptCommercialRuntimeOutputToLegacyProposal(runtimeOutput, proposal),
  };
}
