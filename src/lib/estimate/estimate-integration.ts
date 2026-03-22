import type { GeneratedEstimateProposal } from '@/lib/automation/estimate-generator';
import type { ExecutionContext } from '@/lib/discovery/types';
import type { MeasurementResult } from './measurement-types';
import type { PricingResult } from './pricing-types';
import type { RecipeResult } from './recipe-types';
import type { EstimateStatusSnapshot } from './estimate-status';
import {
  applyCommercialEstimateProjectionToProposal,
  buildCommercialEstimateProjection,
  type CommercialEstimateProjection,
  type IntegratedEstimateBucketCode,
  type IntegratedEstimateCostBucket,
} from './commercial-estimate-projection';

export type { CommercialEstimateProjection, IntegratedEstimateBucketCode, IntegratedEstimateCostBucket };

type IntegratedProposalResult = {
  proposal: GeneratedEstimateProposal & {
    integratedCostBuckets: IntegratedEstimateCostBucket[];
    commercialEstimateProjection: CommercialEstimateProjection;
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

  return {
    proposal: applyCommercialEstimateProjectionToProposal(proposal, projection),
  };
}
