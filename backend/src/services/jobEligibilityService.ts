import { IJobOpportunity } from '../models/JobOpportunity';
import { IUser } from '../models/User';
import UserBadge from '../models/UserBadge';

export interface JobEligibility {
  isEligible: boolean;
  reasons: string[];
  pointsRequirement: {
    required: number;
    current: number;
    meets: boolean;
  };
  badgeRequirements: Array<{
    badge: unknown;
    required: true;
    hasIt: boolean;
  }>;
}

const getDocumentId = (document: any): string =>
  (document?._id ?? document).toString();

export const calculateJobEligibility = async (
  jobOpportunity: IJobOpportunity,
  user: IUser
): Promise<JobEligibility> => {
  const requiredPoints = jobOpportunity.requirements.minimumPoints || 0;
  const eligibility: JobEligibility = {
    isEligible: true,
    reasons: [],
    pointsRequirement: {
      required: requiredPoints,
      current: user.points,
      meets: user.points >= requiredPoints
    },
    badgeRequirements: []
  };

  if (!eligibility.pointsRequirement.meets) {
    eligibility.isEligible = false;
    eligibility.reasons.push(`Minimum ${requiredPoints} points required`);
  }

  const requiredBadges = jobOpportunity.requirements.requiredBadges || [];
  if (requiredBadges.length) {
    const requiredBadgeIds = requiredBadges.map(getDocumentId);
    const userBadges = await UserBadge.find({
      user: user._id,
      badge: { $in: requiredBadgeIds }
    }).select('badge');
    const userBadgeIds = new Set(userBadges.map(userBadge => getDocumentId(userBadge.badge)));

    for (const requiredBadge of requiredBadges) {
      const badgeId = getDocumentId(requiredBadge);
      const hasBadge = userBadgeIds.has(badgeId);

      eligibility.badgeRequirements.push({
        badge: requiredBadge,
        required: true,
        hasIt: hasBadge
      });

      if (!hasBadge) {
        eligibility.isEligible = false;
        const badgeName = (requiredBadge as any).name || badgeId;
        eligibility.reasons.push(`Required badge: ${badgeName}`);
      }
    }
  }

  return eligibility;
};
