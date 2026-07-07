import { Request, Response } from 'express';
import JobOpportunity from '../models/JobOpportunity';
import User from '../models/User';
import { parseSearchQuery } from '../services/searchService';

// GET /api/search?q=...&scope=jobs|profiles|all&page=&limit=
export const smartSearch = async (req: Request, res: Response) => {
  try {
    const {
      q = '',
      scope = 'all',
      page = 1,
      limit = 10,
    } = req.query;

    const query = String(q).trim();
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "q" is required',
      });
    }

    const filters = await parseSearchQuery(query);
    const skip = (Number(page) - 1) * Number(limit);
    const wantJobs = scope === 'all' || scope === 'jobs';
    const wantProfiles = scope === 'all' || scope === 'profiles';

    let jobOpportunities: any[] = [];
    let jobsTotal = 0;

    if (wantJobs) {
      const jobFilter: any = { applicationDeadline: { $gte: new Date() } };

      if (filters.type) jobFilter.type = filters.type;
      if (filters.specialization?.length) {
        jobFilter.specialization = { $in: filters.specialization };
      }
      if (filters.isRemote !== undefined) {
        jobFilter['location.isRemote'] = filters.isRemote;
      }
      if (filters.location) {
        jobFilter.$or = [
          { 'location.city': new RegExp(filters.location, 'i') },
          { 'location.state': new RegExp(filters.location, 'i') },
          { 'location.country': new RegExp(filters.location, 'i') },
        ];
      }
      if (filters.keywords.length) {
        const keywordRegex = new RegExp(filters.keywords.join('|'), 'i');
        const keywordOr = [
          { title: keywordRegex },
          { company: keywordRegex },
          { description: keywordRegex },
          { 'requirements.skills': keywordRegex },
        ];
        // Combine with any existing $or (location) using $and so both
        // conditions are required rather than one overriding the other.
        if (jobFilter.$or) {
          jobFilter.$and = [{ $or: jobFilter.$or }, { $or: keywordOr }];
          delete jobFilter.$or;
        } else {
          jobFilter.$or = keywordOr;
        }
      }

      [jobOpportunities, jobsTotal] = await Promise.all([
        JobOpportunity.find(jobFilter)
          .populate('postedBy', 'firstName lastName specialization isVerifiedDoctor')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        JobOpportunity.countDocuments(jobFilter),
      ]);
    }

    let profiles: any[] = [];
    let profilesTotal = 0;

    if (wantProfiles) {
      const profileFilter: any = { isActive: true, userType: { $in: ['doctor', 'intern'] } };

      if (filters.specialization?.length) {
        profileFilter.specialization = { $in: filters.specialization };
      }
      if (filters.location) {
        const locRegex = new RegExp(filters.location, 'i');
        profileFilter.$or = [
          { 'address.city': locRegex },
          { 'address.state': locRegex },
          { 'address.country': locRegex },
        ];
      }
      if (filters.keywords.length) {
        const keywordRegex = new RegExp(filters.keywords.join('|'), 'i');
        const keywordOr = [
          { firstName: keywordRegex },
          { lastName: keywordRegex },
          { bio: keywordRegex },
          { specialization: keywordRegex },
          { medicalSchool: keywordRegex },
          { interests: keywordRegex },
        ];
        if (profileFilter.$or) {
          profileFilter.$and = [{ $or: profileFilter.$or }, { $or: keywordOr }];
          delete profileFilter.$or;
        } else {
          profileFilter.$or = keywordOr;
        }
      }

      [profiles, profilesTotal] = await Promise.all([
        User.find(profileFilter)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        User.countDocuments(profileFilter),
      ]);
    }

    res.json({
      success: true,
      data: {
        query,
        parsedFilters: filters,
        jobOpportunities,
        profiles,
        total: jobsTotal + profilesTotal,
        page: Number(page),
        totalPages: Math.ceil(Math.max(jobsTotal, profilesTotal) / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Smart search error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
