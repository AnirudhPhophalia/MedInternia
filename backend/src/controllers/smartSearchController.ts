import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import JobOpportunity from '../models/JobOpportunity';
import User from '../models/User';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface SmartSearchIntent {
  searchType: 'jobs' | 'doctors' | 'unknown';
  location?: string;
  specialization?: string;
  jobType?: 'internship' | 'full-time' | 'part-time' | 'fellowship';
  isRemote?: boolean;
  doctorName?: string;
  doctorSpecialization?: string;
  doctorLocation?: string;
  textQuery?: string;
}

/**
 * Parses user search query using regex heuristics.
 */
export const parseQueryLocally = (query: string): SmartSearchIntent => {
  const q = query.toLowerCase();
  
  // 1. Detect searchType
  let searchType: 'jobs' | 'doctors' | 'unknown' = 'unknown';
  if (/\b(job|jobs|internship|internships|fellowship|fellowships|opening|openings|work|salary|hiring|position|positions)\b/i.test(q)) {
    searchType = 'jobs';
  } else if (/\b(doctor|doctors|physician|physicians|cardiologist|neurologist|pediatrician|surgeon|oncologist|psychiatrist|radiologist|mentor|mentors|profile|profiles|people|internist)\b/i.test(q)) {
    searchType = 'doctors';
  }
  
  // 2. Detect jobType
  let jobType: SmartSearchIntent['jobType'];
  if (/\b(intern|internship|internships)\b/i.test(q)) jobType = 'internship';
  else if (/\b(fulltime|full-time|full time)\b/i.test(q)) jobType = 'full-time';
  else if (/\b(parttime|part-time|part time)\b/i.test(q)) jobType = 'part-time';
  else if (/\b(fellow|fellowship|fellowships)\b/i.test(q)) jobType = 'fellowship';

  // 3. Detect isRemote
  let isRemote: boolean | undefined;
  if (/\b(remote|wfh|work from home)\b/i.test(q)) {
    isRemote = true;
  }
  
  // 4. Detect specialization
  let specialization: string | undefined;
  const specMap: Record<string, string> = {
    'cardiology': 'cardiology', 'cardiologist': 'cardiology', 'cardio': 'cardiology',
    'neurology': 'neurology', 'neurologist': 'neurology', 'neuro': 'neurology',
    'oncology': 'oncology', 'oncologist': 'oncology', 'onco': 'oncology',
    'pediatrics': 'pediatrics', 'pediatrician': 'pediatrics', 'pediatric': 'pediatrics',
    'surgery': 'surgery', 'surgeon': 'surgery', 'surgical': 'surgery',
    'psychiatry': 'psychiatry', 'psychiatrist': 'psychiatry', 'psych': 'psychiatry',
    'radiology': 'radiology', 'radiologist': 'radiology',
    'emergency': 'emergency', 'er': 'emergency',
    'internal-medicine': 'internal-medicine', 'internal medicine': 'internal-medicine', 'internist': 'internal-medicine',
    'general': 'general'
  };
  
  for (const [key, val] of Object.entries(specMap)) {
    if (new RegExp(`\\b${key}\\b`, 'i').test(q)) {
      specialization = val;
      break;
    }
  }

  // 5. Detect location (e.g., "in Gujarat", "at Mumbai")
  let location: string | undefined;
  const locMatch = q.match(/\b(?:in|at|around|near|for)\s+([a-z\s]+)/i);
  if (locMatch && locMatch[1]) {
    const locClean = locMatch[1]
      .replace(/\b(jobs?|internships?|fellowships?|positions?|openings?|profiles?|doctors?|mentors?)\b/gi, '')
      .trim();
    if (locClean.length > 1) {
      location = locClean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }

  // Refine default searchType
  if (searchType === 'unknown') {
    if (jobType || isRemote) {
      searchType = 'jobs';
    } else if (specialization && /\b(cardiologist|neurologist|pediatrician|surgeon|oncologist|psychiatrist|radiologist|internist)\b/i.test(q)) {
      searchType = 'doctors';
    } else {
      searchType = 'jobs';
    }
  }

  const doctorSpecialization = searchType === 'doctors' ? specialization : undefined;
  const doctorLocation = searchType === 'doctors' ? location : undefined;

  let textQuery = query;
  if (location) textQuery = textQuery.replace(new RegExp(`in ${location}`, 'i'), '').replace(new RegExp(`at ${location}`, 'i'), '');
  if (specialization) textQuery = textQuery.replace(new RegExp(specialization, 'i'), '');
  if (jobType) textQuery = textQuery.replace(new RegExp(jobType, 'i'), '');
  textQuery = textQuery.replace(/\b(show|me|find|search|get|list|look|for|want|need)\b/gi, '').replace(/\s+/g, ' ').trim();

  return {
    searchType,
    location,
    specialization,
    jobType,
    isRemote,
    doctorSpecialization,
    doctorLocation,
    textQuery: textQuery || undefined
  };
};

/**
 * Parses user search query using Gemini API.
 */
export const parseQueryWithGemini = async (query: string): Promise<SmartSearchIntent> => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const prompt = `You are an AI assistant for a medical platform. Parse the following natural language query and extract search filters for jobs/internships or doctors/profiles.

Query: "${query}"

Return ONLY a JSON object (no markdown block, no explanation) with the following structure:
{
  "searchType": "jobs" | "doctors" | "unknown",
  "location": "extracted location if any (e.g. city, state, or country)",
  "specialization": "one of: general, cardiology, neurology, oncology, pediatrics, surgery, psychiatry, radiology, emergency, internal-medicine",
  "jobType": "one of: internship, full-time, part-time, fellowship",
  "isRemote": boolean value if query implies remote/work from home, otherwise null,
  "doctorName": "name of doctor if searching for a specific doctor",
  "doctorSpecialization": "specialization of doctor if searching for doctors",
  "textQuery": "any other general keywords/search terms"
}
Ensure specialization and jobType values are EXACTLY mapped to the allowed enum values if they match. Otherwise, map specialization to the closest allowed value, or leave it blank if no match.
Allowed specialization values: general, cardiology, neurology, oncology, pediatrics, surgery, psychiatry, radiology, emergency, internal-medicine.
Allowed jobType values: internship, full-time, part-time, fellowship.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      }),
      signal: AbortSignal.timeout(6000)
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: status ${response.status}`);
  }

  const data = (await response.json()) as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from Gemini API');
  }

  const cleanText = text
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  const parsed = JSON.parse(cleanText);

  const allowedSpecs = ['general', 'cardiology', 'neurology', 'oncology', 'pediatrics', 'surgery', 'psychiatry', 'radiology', 'emergency', 'internal-medicine'];
  const allowedJobTypes = ['internship', 'full-time', 'part-time', 'fellowship'];

  const searchType: 'jobs' | 'doctors' | 'unknown' = parsed.searchType || 'unknown';
  const specialization = allowedSpecs.find(s => s === String(parsed.specialization || '').toLowerCase()) || undefined;
  const jobType = allowedJobTypes.find(t => t === String(parsed.jobType || '').toLowerCase()) as any || undefined;

  return {
    searchType,
    location: parsed.location || undefined,
    specialization,
    jobType,
    isRemote: parsed.isRemote === true ? true : undefined,
    doctorSpecialization: parsed.doctorSpecialization || specialization || undefined,
    doctorLocation: parsed.doctorLocation || parsed.location || undefined,
    doctorName: parsed.doctorName || undefined,
    textQuery: parsed.textQuery || undefined
  };
};

/**
 * GET /api/search/smart
 */
export const smartSearch = async (req: AuthRequest, res: Response) => {
  try {
    const { q, type } = req.query;

    if (!q || typeof q !== 'string' || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const queryStr = q.trim();
    let intent: SmartSearchIntent;

    try {
      if (GEMINI_API_KEY) {
        intent = await parseQueryWithGemini(queryStr);
      } else {
        intent = parseQueryLocally(queryStr);
      }
    } catch (err) {
      console.warn('Gemini smart search parse failed, using local parser:', err);
      intent = parseQueryLocally(queryStr);
    }

    // Force type if specified by the route parameters (jobs or doctors page search context)
    if (type === 'jobs' || type === 'doctors') {
      intent.searchType = type;
    }

    let results: any[] = [];
    const searchType = intent.searchType;

    if (searchType === 'jobs') {
      const filter: any = { isActive: true };
      filter.applicationDeadline = { $gte: new Date() };

      if (intent.specialization) {
        filter.specialization = { $in: [intent.specialization] };
      }
      
      if (intent.jobType) {
        filter.type = intent.jobType;
      }
      
      if (intent.isRemote !== undefined) {
        filter['location.isRemote'] = intent.isRemote;
      }
      
      if (intent.location) {
        filter.$or = [
          { 'location.city': new RegExp(intent.location, 'i') },
          { 'location.state': new RegExp(intent.location, 'i') },
          { 'location.country': new RegExp(intent.location, 'i') }
        ];
      }

      if (intent.textQuery) {
        const textRegex = new RegExp(intent.textQuery, 'i');
        if (filter.$or) {
          filter.title = textRegex;
        } else {
          filter.$or = [
            { title: textRegex },
            { description: textRegex },
            { company: textRegex }
          ];
        }
      }

      results = await JobOpportunity.find(filter)
        .populate('postedBy', 'firstName lastName specialization isVerifiedDoctor')
        .populate('requirements.requiredBadges', 'name description icon')
        .sort({ createdAt: -1 })
        .limit(20);

    } else {
      // doctors
      const filter: any = { userType: 'doctor', isActive: true };

      if (intent.doctorSpecialization || intent.specialization) {
        filter.specialization = new RegExp(intent.doctorSpecialization || intent.specialization || '', 'i');
      }

      if (intent.doctorLocation || intent.location) {
        const loc = intent.doctorLocation || intent.location || '';
        filter.$or = [
          { 'address.city': new RegExp(loc, 'i') },
          { 'address.state': new RegExp(loc, 'i') },
          { 'address.country': new RegExp(loc, 'i') }
        ];
      }

      if (intent.doctorName) {
        const nameRegex = new RegExp(intent.doctorName, 'i');
        filter.$or = filter.$or || [];
        filter.$or.push(
          { firstName: nameRegex },
          { lastName: nameRegex }
        );
      }

      if (intent.textQuery) {
        const textRegex = new RegExp(intent.textQuery, 'i');
        filter.$or = filter.$or || [];
        filter.$or.push(
          { firstName: textRegex },
          { lastName: textRegex },
          { bio: textRegex }
        );
      }

      results = await User.find(filter)
        .select('firstName lastName specialization experience qualifications isVerifiedDoctor email phone averageRating profilePicture address')
        .sort({ points: -1 })
        .limit(20);
    }

    res.json({
      success: true,
      data: {
        results,
        intent,
        searchType
      }
    });

  } catch (error) {
    console.error('Smart search error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
