import api from './api';

export interface TopContributor {
  _id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  points: number;
  casesAnalyzed?: number;
  medicalSchool?: string;
  rank: number;
}

/**
 * Fetches the top interns from the platform leaderboard, ranked by points.
 * Backed by GET /api/users/leaderboard (public, no auth required).
 */
export async function fetchTopContributors(limit = 3): Promise<TopContributor[]> {
  const res = await api.get('/users/leaderboard', {
    params: { userType: 'intern', metric: 'points', limit },
  });

  return res.data?.data?.leaderboard ?? [];
}