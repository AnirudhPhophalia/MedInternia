import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Case from '../models/Case';
import User from '../models/User';
import JobOpportunity from '../models/JobOpportunity';
import ResearchPaper from '../models/ResearchPaper';
import Webinar from '../models/Webinar';
import {
  createSafeRegexFilter,
  escapeRegexForArray,
  validateSearchInput,
} from '../utils/searchUtils';

export type GlobalSearchResult = {
  id: string;
  type: 'case' | 'internship' | 'paper' | 'webinar' | 'clinician';
  title: string;
  subtitle?: string;
  href: string;
};

const publishedCaseFilter = {
  isActive: { $ne: false },
  $or: [
    { moderationStatus: 'approved' },
    { moderationStatus: { $exists: false } },
  ],
};

/**
 * Cross-content search for the global /search page.
 * Returns a normalized result list across cases, jobs, papers, webinars, and clinicians.
 */
export const globalSearch = async (req: AuthRequest, res: Response) => {
  try {
    const rawQuery = (req.query.q ?? req.query.query) as string | undefined;
    const safeQuery = validateSearchInput(rawQuery, 100);

    if (!safeQuery) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const safeFilter = createSafeRegexFilter(safeQuery, 100);
    if (!safeFilter) {
      return res.status(400).json({
        success: false,
        message: 'Invalid search query',
      });
    }

    const tagRegex = new RegExp(escapeRegexForArray(safeQuery), 'i');
    const limitPerType = Math.min(
      20,
      Math.max(1, parseInt(String(req.query.limit ?? '10'), 10) || 10),
    );

    const [cases, jobs, papers, webinars, clinicians] = await Promise.all([
      Case.find({
        ...publishedCaseFilter,
        $and: [
          {
            $or: [
              { title: safeFilter },
              { description: safeFilter },
              { diagnosis: safeFilter },
              { specialization: safeFilter },
              { tags: { $in: [tagRegex] } },
            ],
          },
        ],
      })
        .select('_id title description specialization')
        .sort({ createdAt: -1 })
        .limit(limitPerType)
        .lean(),
      JobOpportunity.find({
        isActive: { $ne: false },
        $or: [
          { title: safeFilter },
          { company: safeFilter },
          { description: safeFilter },
          { 'location.city': safeFilter },
          { 'location.state': safeFilter },
          { 'location.country': safeFilter },
          { specialization: { $in: [tagRegex] } },
        ],
      })
        .select('_id title company location specialization type')
        .sort({ createdAt: -1 })
        .limit(limitPerType)
        .lean(),
      ResearchPaper.find({
        $or: [
          { title: safeFilter },
          { description: safeFilter },
          { field: safeFilter },
        ],
      })
        .select('_id title description field')
        .sort({ createdAt: -1 })
        .limit(limitPerType)
        .lean(),
      Webinar.find({
        isActive: { $ne: false },
        $or: [
          { title: safeFilter },
          { description: safeFilter },
          { specialization: { $in: [tagRegex] } },
          { tags: { $in: [tagRegex] } },
        ],
      })
        .select('_id title description specialization')
        .sort({ createdAt: -1 })
        .limit(limitPerType)
        .lean(),
      User.find({
        userType: { $in: ['doctor', 'intern'] },
        $or: [
          { firstName: safeFilter },
          { lastName: safeFilter },
          { specialization: safeFilter },
          { medicalSchool: safeFilter },
        ],
      })
        .select('_id firstName lastName specialization userType')
        .sort({ points: -1 })
        .limit(limitPerType)
        .lean(),
    ]);

    const formatJobLocation = (location: any) => {
      if (!location || typeof location !== 'object') return '';
      if (location.isRemote) return 'Remote';
      return [location.city, location.state, location.country].filter(Boolean).join(', ');
    };

    const results: GlobalSearchResult[] = [
      ...cases.map((item: any) => ({
        id: String(item._id),
        type: 'case' as const,
        title: item.title || 'Untitled case',
        subtitle: item.specialization || item.description || undefined,
        href: `/cases/${item._id}`,
      })),
      ...jobs.map((item: any) => ({
        id: String(item._id),
        type: 'internship' as const,
        title: item.title || 'Untitled opportunity',
        subtitle:
          [item.company, formatJobLocation(item.location), Array.isArray(item.specialization) ? item.specialization.join(', ') : '']
            .filter(Boolean)
            .join(' · ') || undefined,
        href: `/jobs/${item._id}`,
      })),
      ...papers.map((item: any) => ({
        id: String(item._id),
        type: 'paper' as const,
        title: item.title || 'Untitled paper',
        subtitle: item.field || item.description || undefined,
        href: `/research_paper`,
      })),
      ...webinars.map((item: any) => ({
        id: String(item._id),
        type: 'webinar' as const,
        title: item.title || 'Untitled webinar',
        subtitle:
          (Array.isArray(item.specialization) ? item.specialization.join(', ') : '') ||
          item.description ||
          undefined,
        href: `/webinars/${item._id}`,
      })),
      ...clinicians.map((item: any) => ({
        id: String(item._id),
        type: 'clinician' as const,
        title: `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unnamed clinician',
        subtitle: item.specialization || item.userType || undefined,
        href: `/people?id=${item._id}`,
      })),
    ];

    res.json({
      success: true,
      data: {
        query: safeQuery,
        results,
        counts: {
          cases: cases.length,
          internships: jobs.length,
          papers: papers.length,
          webinars: webinars.length,
          clinicians: clinicians.length,
          total: results.length,
        },
      },
    });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
