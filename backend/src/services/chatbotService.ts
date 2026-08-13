export interface ChatMessage {
  role: string;
  content?: string;
  text?: string;
}

const SYSTEM_PROMPT = 'You are a medical AI assistant helping doctors and interns discuss cases. Answer clearly and concisely.';
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 10;
const MAX_TOTAL_HISTORY_CHARS = 8000;

export const sliceAndSanitizeHistory = (history: ChatMessage[] = []): Array<{ role: string; text: string }> => {
  if (!Array.isArray(history)) return [];

  const sanitized: Array<{ role: string; text: string }> = [];

  for (const item of history) {
    if (!item || typeof item !== 'object') continue;
    const rawRole = (item.role || 'user').toString().toLowerCase().trim();
    const rawText = (item.content ?? item.text ?? '').toString().trim();
    if (!rawText) continue;

    const truncatedText = rawText.length > MAX_MESSAGE_LENGTH
      ? rawText.substring(0, MAX_MESSAGE_LENGTH)
      : rawText;

    sanitized.push({
      role: rawRole,
      text: truncatedText,
    });
  }

  const recent = sanitized.slice(-MAX_HISTORY_MESSAGES);

  const result: Array<{ role: string; text: string }> = [];
  let totalChars = 0;

  for (let i = recent.length - 1; i >= 0; i--) {
    const msg = recent[i];
    if (totalChars + msg.text.length > MAX_TOTAL_HISTORY_CHARS) {
      break;
    }
    totalChars += msg.text.length;
    result.unshift(msg);
  }

  return result;
};

const askGemini = async (message: string, history: ChatMessage[] = []): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  const sanitizedHistory = sliceAndSanitizeHistory(history);

  const formattedContents = sanitizedHistory.map((item) => {
    const role = (item.role === 'assistant' || item.role === 'bot' || item.role === 'model') ? 'model' : 'user';
    return {
      role,
      parts: [{ text: item.text }],
    };
  });

  formattedContents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey ?? '',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: formattedContents,
      }),
      signal: AbortSignal.timeout(15_000)
    }
  );

  if (!response.ok) throw new Error('Gemini API failed');

  const data = await response.json() as any;
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response from Gemini.';
};

const askOpenAI = async (message: string, history: ChatMessage[] = []): Promise<string> => {
  const apiKey = process.env.OPENAI_API_KEY;
  const sanitizedHistory = sliceAndSanitizeHistory(history);

  const formattedMessages = sanitizedHistory.map((item) => {
    const role = (item.role === 'model' || item.role === 'bot' || item.role === 'assistant') ? 'assistant' : 'user';
    return {
      role,
      content: item.text,
    };
  });

  const messagesPayload = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    ...formattedMessages,
    { role: 'user', content: message }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: messagesPayload
    }),
    signal: AbortSignal.timeout(15_000)
  });

  if (!response.ok) throw new Error('OpenAI API failed');

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content ?? 'No response from OpenAI.';
};

export const getChatbotResponse = async (
  message: string,
  history: ChatMessage[] = []
): Promise<string> => {
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters.`);
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      return await askGemini(message, history);
    } catch (err) {
      console.warn('Gemini failed, falling back to OpenAI:', err);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      return await askOpenAI(message, history);
    } catch (err) {
      console.warn('OpenAI also failed:', err);
    }
  }

  return 'AI service is currently unavailable. Please try again later.';
};