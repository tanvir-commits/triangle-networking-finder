import type { Place } from '../types/place';

const potentialScore: Record<Place['networkingPotential'], number> = {
  Excellent: 40,
  Good: 28,
  Moderate: 16,
};

export function calculateNetworkingScore(place: Place): number {
  let score = potentialScore[place.networkingPotential];

  if (place.couplesFriendly) score += 8;
  if (!place.membershipRequired) score += 10;
  if (place.bestFor.some((item) => /repeat|recurring|weekly|regular/i.test(item))) {
    score += 8;
  }
  if (place.category === 'Professional Networking') score += 6;
  if (place.category === 'Country & Social Club') score += 4;

  const proximityBonus = Math.max(0, 35 - place.driveTimeMinutes);
  score += Math.round(proximityBonus * 0.6);

  return Math.min(100, Math.max(1, score));
}

export function parseCostValue(cost: string): number {
  const match = cost.match(/\$(\d+)/);
  return match ? Number(match[1]) : 9999;
}
