# Backend API

A modern Node.js backend API built with TypeScript and Express.js.

## Features

- ✅ TypeScript for type safety
- ✅ Express.js web framework
- ✅ Security middleware (Helmet, CORS)
- ✅ Request logging with Morgan
- ✅ Environment variables with dotenv
- ✅ Development server with hot reload
- ✅ Organized project structure

## Project Structure

```
backend/
├── src/
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   └── index.ts         # Main application file
├── dist/                # Compiled JavaScript (generated)
├── .env                 # Environment variables
├── .gitignore          # Git ignore file
├── package.json        # NPM dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   npm start
   ```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api` - Main API endpoint
- `GET /api/test` - Test endpoint

## Environment Variables

Create a `.env` file in the root directory:

```
PORT=3000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```
