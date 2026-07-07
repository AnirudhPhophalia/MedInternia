/**
 * Smart Search Service
 * ====================
 * Turns a free-text query ("remote cardiology internships in Texas")
 * into structured filters that can be applied directly to Mongo queries
 * for JobOpportunity listings and User (doctor/intern) profiles.
 *
 * Strategy:
 *  1. If an LLM key (Gemini or OpenAI) is configured, ask the model to
 *     extract structured filters as JSON (same pattern as chatbotService.ts).
 *  2. Regardless of whether the LLM step ran, a lightweight rule-based
 *     parser also runs and its results are merged in as a safety net —
 *     this keeps search fully functional in dev/test environments with
 *     no API keys configured, and guards against malformed LLM output.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const KNOWN_SPECIALIZATIONS = [
  'general',
  'cardiology',
  'neurology',
  'oncology',
  'pediatrics',
  'surgery',
  'psychiatry',
  'radiology',
  'emergency',
  'internal-medicine',
];

export const KNOWN_JOB_TYPES = ['internship', 'full-time', 'part-time', 'fellowship'];

export interface ParsedSearchFilters {
  keywords: string[];          // free-text fallback terms for title/company/description search
  specialization?: string[];   // matched against KNOWN_SPECIALIZATIONS
  type?: string;               // matched against KNOWN_JOB_TYPES
  location?: string;           // free-text city/state/country fragment
  isRemote?: boolean;
}

const JSON_PROMPT = (query: string) => `
You are a search-query parser for a medical education platform.
Extract structured filters from the user's search query and respond with
ONLY a JSON object (no markdown, no commentary) matching this shape:

{
  "specialization": string[],   // any of: ${KNOWN_SPECIALIZATIONS.join(', ')} — omit if none matched
  "type": string | null,        // any of: ${KNOWN_JOB_TYPES.join(', ')} — omit if none matched
  "location": string | null,    // a city, state, or country mentioned, else null
  "isRemote": boolean | null,   // true if remote/work-from-home is requested, else null
  "keywords": string[]          // remaining important free-text keywords (skills, roles, company names)
}

Query: "${query}"
`.trim();

const stripCodeFences = (text: string): string =>
  text.replace(/```json/gi, '').replace(/```/g, '').trim();

const askGeminiForFilters = async (query: string): Promise<string> => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: JSON_PROMPT(query) }] }],
      }),
    }
  );

  if (!response.ok) throw new Error('Gemini API failed');

  const data = (await response.json()) as any;
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
};

const askOpenAIForFilters = async (query: string): Promise<string> => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a search-query parser. Respond with JSON only.' },
        { role: 'user', content: JSON_PROMPT(query) },
      ],
    }),
  });

  if (!response.ok) throw new Error('OpenAI API failed');

  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content ?? '';
};

/**
 * Rule-based parser used as a fallback (and as a sanity backstop for LLM
 * output). Cheap, deterministic, and requires no external API calls.
 */
const ruleBasedParse = (query: string): ParsedSearchFilters => {
  const lower = query.toLowerCase();

  const specialization = KNOWN_SPECIALIZATIONS.filter((s) =>
    lower.includes(s.replace('-', ' ')) || lower.includes(s)
  );

  const type = KNOWN_JOB_TYPES.find((t) => lower.includes(t.replace('-', ' ')) || lower.includes(t));

  const isRemote = /\bremote\b|\bwork from home\b|\bwfh\b/.test(lower) ? true : undefined;

  // Very simple "in <location>" / "near <location>" extraction.
  const locationMatch = lower.match(/\b(?:in|near|at)\s+([a-z\s]+?)(?:$|,|\.|\bfor\b)/);
  const location = locationMatch ? locationMatch[1].trim() : undefined;

  // Remaining keywords: strip out matched terms and stopwords for a
  // free-text fallback search over title/company/description.
  const stopwords = new Set([
    'in', 'near', 'at', 'for', 'the', 'a', 'an', 'to', 'of', 'and', 'remote',
    'internship', 'internships', 'job', 'jobs', 'opportunity', 'opportunities',
    ...specialization,
    ...(type ? [type] : []),
  ]);
  const keywords = lower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !stopwords.has(w) && w.length > 2);

  return {
    keywords: Array.from(new Set(keywords)),
    specialization: specialization.length ? specialization : undefined,
    type,
    location,
    isRemote,
  };
};

const safeJsonParse = (raw: string): Partial<ParsedSearchFilters> | null => {
  try {
    const parsed = JSON.parse(stripCodeFences(raw));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Merge LLM-derived filters (if any/valid) with the rule-based parse.
 * The rule-based parse always runs so search degrades gracefully.
 */
export const parseSearchQuery = async (query: string): Promise<ParsedSearchFilters> => {
  const trimmed = query.trim();
  const fallback = ruleBasedParse(trimmed);

  if (!trimmed) return fallback;

  let llmRaw = '';
  if (GEMINI_API_KEY) {
    try {
      llmRaw = await askGeminiForFilters(trimmed);
    } catch (err) {
      console.warn('Search: Gemini parse failed, falling back:', err);
    }
  }
  if (!llmRaw && OPENAI_API_KEY) {
    try {
      llmRaw = await askOpenAIForFilters(trimmed);
    } catch (err) {
      console.warn('Search: OpenAI parse failed, falling back:', err);
    }
  }

  const llmParsed = llmRaw ? safeJsonParse(llmRaw) : null;
  if (!llmParsed) return fallback;

  const specialization = Array.isArray(llmParsed.specialization)
    ? llmParsed.specialization.filter((s) => KNOWN_SPECIALIZATIONS.includes(s))
    : fallback.specialization;

  const type =
    typeof llmParsed.type === 'string' && KNOWN_JOB_TYPES.includes(llmParsed.type)
      ? llmParsed.type
      : fallback.type;

  return {
    keywords: Array.isArray(llmParsed.keywords) && llmParsed.keywords.length
      ? llmParsed.keywords
      : fallback.keywords,
    specialization: specialization && specialization.length ? specialization : undefined,
    type,
    location: typeof llmParsed.location === 'string' && llmParsed.location
      ? llmParsed.location
      : fallback.location,
    isRemote: typeof llmParsed.isRemote === 'boolean' ? llmParsed.isRemote : fallback.isRemote,
  };
};
