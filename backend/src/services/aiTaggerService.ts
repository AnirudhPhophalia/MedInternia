import { extractSymptoms } from './symptomExtractionService';
import { predictDiseaseInsights } from './diseaseInsightService';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface AITaggedOutput {
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  symptoms: string[];
  diagnosis: string;
  treatment: string;
  specialty?: string;
}

/**
 * Fallback tagging logic when Gemini API is unavailable or fails.
 * Uses local symptom lexicons and simple heuristics to tag the case.
 */
function getLocalFallbackTags(
  title: string,
  description: string,
  specialization: string
): AITaggedOutput {
  const extracted = extractSymptoms(description);
  
  // Heuristic for difficulty
  let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
  const textToAnalyze = (title + ' ' + description).toLowerCase();
  
  const advancedKeywords = ['severe', 'acute', 'critical', 'emergency', 'chronic', 'complication', 'advanced', 'shock', 'failure'];
  const intermediateKeywords = ['moderate', 'persistent', 'recurring', 'progressive', 'intermediate'];
  
  const hasAdvanced = advancedKeywords.some(keyword => textToAnalyze.includes(keyword));
  const hasIntermediate = intermediateKeywords.some(keyword => textToAnalyze.includes(keyword));
  
  if (extracted.length >= 5 || hasAdvanced) {
    difficulty = 'advanced';
  } else if (extracted.length >= 3 || hasIntermediate) {
    difficulty = 'intermediate';
  }
  
  // Predict disease condition & treatment using local diseaseInsightService
  let diagnosis = 'Clinical evaluation pending';
  let treatment = 'Further diagnostic workup recommended.';
  
  if (extracted.length > 0) {
    const predictions = predictDiseaseInsights({ symptoms: extracted });
    if (predictions.length > 0) {
      const topMatch = predictions[0];
      diagnosis = topMatch.condition;
      treatment = topMatch.recommendations.join('\n') || treatment;
    }
  }
  
  // Build key topics / tags
  const tagsSet = new Set<string>();
  
  // Add specialization as a tag
  if (specialization) {
    tagsSet.add(specialization.toLowerCase().trim());
  }
  
  // Add first few symptoms as tags
  extracted.slice(0, 4).forEach(s => tagsSet.add(s.toLowerCase().trim()));
  
  // Add some general clinical topics based on keywords
  if (textToAnalyze.includes('surgery') || textToAnalyze.includes('operative')) {
    tagsSet.add('surgery');
  }
  if (textToAnalyze.includes('pediatric') || textToAnalyze.includes('child') || textToAnalyze.includes('infant')) {
    tagsSet.add('pediatrics');
  }
  if (textToAnalyze.includes('therapy') || textToAnalyze.includes('medication') || textToAnalyze.includes('drug')) {
    tagsSet.add('pharmacology');
  }
  
  return {
    difficulty,
    tags: Array.from(tagsSet).slice(0, 8),
    symptoms: extracted,
    diagnosis,
    treatment
  };
}

/**
 * Automagically analyze a clinical case using Gemini,
 * falls back to local NLP heuristics if the key is missing or calls fail.
 */
export async function analyzeCase(
  title: string,
  description: string,
  specialization: string
): Promise<AITaggedOutput> {
  const localFallback = getLocalFallbackTags(title, description, specialization);
  const fallbackResult: AITaggedOutput = {
    specialty: specialization || 'General',
    difficulty: localFallback.difficulty,
    tags: localFallback.tags || [],
    symptoms: localFallback.symptoms || [],
    diagnosis: localFallback.diagnosis || 'Clinical evaluation pending',
    treatment: localFallback.treatment || 'Further diagnostic workup recommended.'
  };

  if (!GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY not found. Using local clinical fallback for AI tagging.');
    return fallbackResult;
  }

  try {
    const prompt = `You are an expert clinical medical AI assistant. Analyze the following medical case draft and extract structured metadata:
Title: ${title}
Description: ${description}

Provide the output in JSON format with the following fields:
{
  "specialty": "Cardiology | Neurology | Pulmonology | Gastroenterology | Orthopedics | General",
  "difficulty": "Beginner | Intermediate | Advanced",
  "key_topics": ["topic1", "topic2", "topic3"]
}
Ensure the output is ONLY valid JSON. Do not include markdown code block formatting or any explanation outside the JSON.`;

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
        signal: AbortSignal.timeout(10_000) // Timeout after 10 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = (await response.json()) as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    // Clean JSON markdown wraps
    const cleanText = text
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleanText);
    } catch (e) {
      throw new Error('JSON parsing failed');
    }

    const allowedSpecialties = ["Cardiology", "Neurology", "Pulmonology", "Gastroenterology", "Orthopedics", "General"];
    const allowedDifficulties = ["Beginner", "Intermediate", "Advanced"];

    // Case-insensitive matching and normalization
    const matchedSpecialty = allowedSpecialties.find(
      s => s.toLowerCase() === String(parsed.specialty || '').toLowerCase().trim()
    );
    const matchedDifficulty = allowedDifficulties.find(
      d => d.toLowerCase() === String(parsed.difficulty || '').toLowerCase().trim()
    );

    if (!matchedSpecialty || !matchedDifficulty || !Array.isArray(parsed.key_topics)) {
      throw new Error('Malformed JSON structure');
    }

    return {
      difficulty: matchedDifficulty.toLowerCase() as 'beginner' | 'intermediate' | 'advanced',
      tags: parsed.key_topics.map((t: any) => String(t).toLowerCase()),
      specialty: matchedSpecialty,
      symptoms: [],
      diagnosis: '',
      treatment: ''
    };

  } catch (error) {
    console.error('Failed to analyze case via Gemini API, using default fallback:', error);
    return fallbackResult;
  }
}
