import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { setSocketIO } from './utils/socket';
import { verifyToken } from './utils/jwt';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import connectDB from './utils/database';
import { createDefaultBadges } from './utils/createDefaultBadges';
import apiRoutes from './routes/api';
import { errorHandler } from './middleware/errorHandler';

// ─────────────────────────────────────────────────────────────────────────────
// FIX for Issue #418: JWT_SECRET strength validation
// Must run BEFORE starting the server — catches weak secrets at startup
// so they never silently compromise production tokens.
// ─────────────────────────────────────────────────────────────────────────────

function validateEnvironment(): void {
  const errors: string[] = [];

  // JWT_SECRET validation
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push(
      'JWT_SECRET is not set.\n' +
      '  Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  } else if (jwtSecret.length < 64) {
    errors.push(
      `JWT_SECRET is too short (${jwtSecret.length} chars). Minimum: 64 characters.\n` +
      '  A short JWT_SECRET is vulnerable to brute-force attacks.\n' +
      '  Generate a strong one: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  } else if (['secret', 'password', 'jwt_secret', 'your_jwt_secret', 'medinternia'].includes(jwtSecret.toLowerCase())) {
    errors.push(
      'JWT_SECRET appears to be a placeholder or common word. Use a cryptographically random string.\n' +
      '  Generate one: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }

  // MONGODB_URI validation
  if (!process.env.MONGODB_URI) {
    errors.push('MONGODB_URI is not set.');
  }

  if (errors.length > 0) {
    console.error('\n╔══════════════════════════════════════════════════════════════╗');
    console.error('║     MedInternia — Environment Configuration Error            ║');
    console.error('╚══════════════════════════════════════════════════════════════╝\n');
    errors.forEach((err, i) => {
      console.error(`${i + 1}. ${err}\n`);
    });
    console.error('Fix these errors in your backend/.env file, then restart.\n');
    process.exit(1);   // Hard stop — don't run with bad config
  }
}

// Run validation before anything else
validateEnvironment();


// Process-level handlers to prevent crash-induced state loss
process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Initialize application
const initializeApp = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Create default badges if they don't exist
    await createDefaultBadges();
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
};

// Initialize the app
initializeApp();

// Middleware
app.use(helmet());
const defaultAllowedOrigins = [
  'https://medinternia.vercel.app',
  'https://med-internia.vercel.app',
  'http://localhost:3000',
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

const allowedOrigins = new Set(
  [
    ...defaultAllowedOrigins,
    ...(process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
      : [])
  ].map(normalizeOrigin)
);

const isAllowedOrigin = (origin: string): boolean => {
  const normalizedOrigin = normalizeOrigin(origin);
  return allowedOrigins.has(normalizedOrigin);
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
}));

// Ensure preflight OPTIONS requests are handled for all routes
app.options(/.*/, cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  optionsSuccessStatus: 204
}));
app.use(morgan('combined'));

// Serve uploads folder for profile images
import path from 'path';
// Serve uploads with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'Doctor-Intern Collaboration Platform is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '3.0.0',
    features: [
      'Medical case discussions',
      'Peer review system', 
      'Badge & certification system',
      'Job opportunities board',
      'Webinars & AMAs',
      'AI-powered case suggestions',
      'Live video conferencing'
    ]
  });
});

app.use('/api', apiRoutes);
app.use(errorHandler);

// Create HTTP server (required for Socket.io)
const httpServer = http.createServer(app);

// Initialize Socket.io with CORS matching existing config
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Register io instance globally so controllers can emit events
setSocketIO(io);

// Socket.io JWT Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Invalid or expired token'));
    }

    // Attach userId to socket for later use
    (socket as any).userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Socket authentication failed'));
  }
});

// Handle socket connections
io.on('connection', (socket) => {
  const userId = (socket as any).userId;

  // Each user joins their own private room
  // This lets us emit to a specific user from any controller
  socket.join(`user:${userId}`);
  console.log(`Socket connected: user ${userId} joined room user:${userId}`);

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: user ${userId}`);
  });
});

// Start server (httpServer instead of app.listen)
httpServer.listen(PORT, () => {
  console.log(`Doctor-Intern Collaboration Platform running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API docs: http://localhost:${PORT}/api`);
  console.log(`Socket.io ready`);
});

export { io };
export default app;
