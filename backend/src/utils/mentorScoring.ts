import User from '../models/User';
import Case from '../models/Case';

/**
 * Scoring weights:
 *  - 10 pts per case posted
 *  - 15 pts per unique intern who engaged with the doctor's cases
 *  - up to 20 pts from average comment rating quality (rating × 4 mapped to 0-20)
 *  - 2 pts per discussion comment across all cases
 */
export const computeMentorScore = async (doctorId: string): Promise<number> => {
  const doctor = await User.findById(doctorId);
  if (!doctor || doctor.userType !== 'doctor') return 0;

  const cases = await Case.find({ doctor: doctorId });
  const casesPosted = cases.length;

  const internIds = new Set<string>();
  let totalDiscussions = 0;
  let totalRatings = 0;
  let ratingCount = 0;

  for (const c of cases) {
    for (const comment of c.comments) {
      internIds.add(comment.author.toString());
      totalDiscussions++;
      if (typeof comment.rating === 'number' && comment.rating > 0) {
        totalRatings += comment.rating;
        ratingCount++;
      }
    }
  }

  const internsTrainedCount = internIds.size;
  const caseQualityAvg = ratingCount > 0 ? totalRatings / ratingCount : 0;
  const discussionUsageCount = totalDiscussions;

  const mentorScore = Math.round(
    casesPosted * 10 +
    internsTrainedCount * 15 +
    caseQualityAvg * 4 * 5 + // scale 0-5 rating to 0-20 pts
    discussionUsageCount * 2
  );

  await User.findByIdAndUpdate(doctorId, {
    mentorScore,
    casesPosted,
    internsTrainedCount,
    discussionUsageCount,
  });

  return mentorScore;
};
