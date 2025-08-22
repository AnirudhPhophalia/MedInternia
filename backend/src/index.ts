import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './utils/database';
import { createDefaultBadges } from './utils/createDefaultBadges';

// Import routes
import apiRoutes from './routes/api';

dotenv.config();

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
const allowedOrigins = [
  "https://med-internia.vercel.app",
  "http://localhost:3001"
];
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Start server
app.listen(PORT, () => {
  console.log(`Doctor-Intern Collaboration Platform running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API docs: http://localhost:${PORT}/api`);
});

export default app;
