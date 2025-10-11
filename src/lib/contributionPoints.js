const POINTS_PER_APPROVED_CONTRIBUTION = 5;

export function getContributionAwardPoints(status) {
  if (status === 'approved') return POINTS_PER_APPROVED_CONTRIBUTION;
  return 0;
}