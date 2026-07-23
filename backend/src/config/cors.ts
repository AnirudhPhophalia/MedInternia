import { CorsOptions } from 'cors';

const defaultAllowedOrigins = [
  'https://medinternia.vercel.app',
  'https://med-internia.vercel.app',
  'http://localhost:3005',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173'
];

const normalizeOrigin = (value: string): string => {
  const trimmed = value.trim();
  try {
    return new URL(trimmed).origin.toLowerCase();
  } catch {
    return trimmed.replace(/\/+$/, '').toLowerCase();
  }
};

const getAllowedOrigins = (): Set<string> =>
  new Set(
    [
      ...defaultAllowedOrigins,
      ...(process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
        : [])
    ].map(normalizeOrigin)
  );

export const isAllowedOrigin = (origin: string): boolean => {
  const normalizedOrigin = normalizeOrigin(origin);
  return getAllowedOrigins().has(normalizedOrigin);
};

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-KEY'
  ],
  optionsSuccessStatus: 204
};
