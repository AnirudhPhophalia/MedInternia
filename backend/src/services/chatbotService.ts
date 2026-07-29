const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = 'You are a medical AI assistant helping doctors and interns discuss cases. Answer clearly and concisely.';
const MAX_MESSAGE_LENGTH = 2000;

const askGemini = async (message: string): Promise<string> => {
  // Bug fix: API key moved to x-goog-api-key header — keeps it out of server
  // access logs and reverse-proxy logs that record request URLs.
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY ?? '',
      },
      body: JSON.stringify({
        // Bug fix: user message is sent as a separate 'user' role turn rather
        // than being string-interpolated into the system prompt. This prevents
        // prompt injection — a user cannot override the system instruction by
        // embedding instructions like "Ignore previous instructions..." in
        // their message.
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: message }],
          },
        ],
      }),
      signal: AbortSignal.timeout(15_000)
    }
  );

  if (!response.ok) throw new Error('Gemini API failed');

  const data = await response.json() as any;
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response from Gemini.';
};

const askOpenAI = async (message: string): Promise<string> => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        { role: 'user', content: message }
      ]
    }),
    signal: AbortSignal.timeout(15_000)
  });

  if (!response.ok) throw new Error('OpenAI API failed');

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content ?? 'No response from OpenAI.';
};

export const getChatbotResponse = async (message: string): Promise<string> => {
  // Guard against excessively long messages that would consume paid API tokens.
  // The route already enforces 500 chars; this defence-in-depth check catches
  // direct service calls that bypass the route middleware.
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters.`);
  }

  if (GEMINI_API_KEY) {
    try {
      return await askGemini(message);
    } catch (err) {
      console.warn('Gemini failed, falling back to OpenAI:', err);
    }
  }

  if (OPENAI_API_KEY) {
    try {
      return await askOpenAI(message);
    } catch (err) {
      console.warn('OpenAI also failed:', err);
    }
  }

  return 'AI service is currently unavailable. Please try again later.';
};