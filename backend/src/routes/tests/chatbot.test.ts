import { Request, Response } from 'express';
import chatbotRouter from '../chatbot';
import { getChatbotResponse, sliceAndSanitizeHistory } from '../../services/chatbotService';

jest.mock('../../middleware/auth', () => ({
  optionalAuthenticate: (req: Request, res: Response, next: () => void) => next(),
}));

jest.mock('../../middleware/otpRateLimiter', () => ({
  chatbotLimiter: (req: Request, res: Response, next: () => void) => next(),
}));

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('Chatbot Service & Route - Conversational Memory (#1277)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('sliceAndSanitizeHistory', () => {
    it('returns empty array when history is not an array or empty', () => {
      expect(sliceAndSanitizeHistory(undefined as any)).toEqual([]);
      expect(sliceAndSanitizeHistory([] as any)).toEqual([]);
    });

    it('sanitizes invalid entries and normalizes roles and text', () => {
      const history = [
        null as any,
        { role: 'user', content: '  Hello  ' },
        { role: 'assistant', text: 'Hi there!' },
        { role: 'model', content: '' },
      ];
      const result = sliceAndSanitizeHistory(history);
      expect(result).toEqual([
        { role: 'user', text: 'Hello' },
        { role: 'assistant', text: 'Hi there!' },
      ]);
    });

    it('slices to most recent 10 messages', () => {
      const history = Array.from({ length: 15 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));
      const result = sliceAndSanitizeHistory(history);
      expect(result.length).toBe(10);
      expect(result[0].text).toBe('Message 5');
      expect(result[9].text).toBe('Message 14');
    });

    it('caps total character length to 8000 working backwards from latest', () => {
      const longText = 'a'.repeat(2000);
      const history = [
        { role: 'user', content: longText },
        { role: 'assistant', content: longText },
        { role: 'user', content: longText },
        { role: 'assistant', content: longText },
        { role: 'user', content: longText },
      ];
      const result = sliceAndSanitizeHistory(history);
      // 5 * 2000 = 10,000 > 8000, so oldest message should be dropped leaving 4 messages (8000 chars)
      expect(result.length).toBe(4);
    });
  });

  describe('getChatbotResponse with Gemini', () => {
    it('passes history with role mapping to Gemini endpoint', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      delete process.env.OPENAI_API_KEY;

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'The dosage is 500mg.' }] } }],
        }),
      });
      global.fetch = mockFetch;

      const history = [
        { role: 'user', content: 'What is the dosage for Paracetamol?' },
        { role: 'assistant', content: 'Paracetamol is 500mg every 4-6 hours.' },
      ];

      const response = await getChatbotResponse('What about for children?', history);

      expect(response).toBe('The dosage is 500mg.');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(fetchBody.contents).toEqual([
        { role: 'user', parts: [{ text: 'What is the dosage for Paracetamol?' }] },
        { role: 'model', parts: [{ text: 'Paracetamol is 500mg every 4-6 hours.' }] },
        { role: 'user', parts: [{ text: 'What about for children?' }] },
      ]);
    });
  });

  describe('getChatbotResponse with OpenAI', () => {
    it('passes system prompt and history to OpenAI endpoint when Gemini key is absent', async () => {
      delete process.env.GEMINI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-openai-key';

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'For children it is 250mg.' } }],
        }),
      });
      global.fetch = mockFetch;

      const history = [
        { role: 'user', content: 'What is the dosage for Paracetamol?' },
        { role: 'model', content: 'Paracetamol is 500mg.' },
      ];

      const response = await getChatbotResponse('What about children?', history);

      expect(response).toBe('For children it is 250mg.');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(fetchBody.messages).toEqual([
        { role: 'system', content: 'You are a medical AI assistant helping doctors and interns discuss cases. Answer clearly and concisely.' },
        { role: 'user', content: 'What is the dosage for Paracetamol?' },
        { role: 'assistant', content: 'Paracetamol is 500mg.' },
        { role: 'user', content: 'What about children?' },
      ]);
    });
  });

  describe('Chatbot Route POST /', () => {
    it('returns 400 if message is missing', async () => {
      const req = { method: 'POST', url: '/', body: {} } as Request;
      const res = mockResponse();

      await chatbotRouter(req, res, () => {});

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Message is required.' });
    });

    it('returns 400 if history is not an array', async () => {
      const req = { method: 'POST', url: '/', body: { message: 'Hello', history: 'invalid-history' } } as Request;
      const res = mockResponse();

      await chatbotRouter(req, res, () => {});

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'History must be an array.' });
    });

    it('returns 200 and reply when request includes valid message and history', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Response with history context.' }] } }],
        }),
      });

      const req = {
        method: 'POST',
        url: '/',
        body: {
          message: 'Follow-up question',
          history: [{ role: 'user', content: 'Initial message' }],
        },
      } as Request;
      const res = mockResponse();

      await chatbotRouter(req, res, () => {});
      await new Promise((r) => setImmediate(r));

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ reply: 'Response with history context.' });
    });
  });
});
