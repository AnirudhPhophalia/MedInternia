const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const askGemini = async (message: string): Promise<string> => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a medical AI assistant helping doctors and interns discuss cases. Answer clearly and concisely.\n\nUser: ${message}`
              }
            ]
          }
        ]
      })
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
          content: 'You are a medical AI assistant helping doctors and interns discuss cases.'
        },
        { role: 'user', content: message }
      ]
    })
  });

  if (!response.ok) throw new Error('OpenAI API failed');

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content ?? 'No response from OpenAI.';
};

export const getChatbotResponse = async (message: string): Promise<string> => {
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