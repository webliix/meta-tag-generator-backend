import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetchRouter from './routes/fetch.js';
import generateRouter from './routes/generate.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ──────────────────────────────────────────────
// CORS — allow frontend to call from any origin
// Set CORS_ORIGIN=https://your-frontend.com in .env for production
// ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ──────────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────────
app.use('/api/fetch',    fetchRouter);     // GET  /api/fetch?url=<url>
app.use('/api/generate', generateRouter);  // POST /api/generate

// Health check
app.get('/health', (_, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '2.0.0',
}));


app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀  Meta Generator API  →  http://localhost:${PORT}`);
  console.log(`──────────────────────────────────────`);
  console.log(`   GET   /api/fetch?url=<url>`);
  console.log(`   POST  /api/generate`);
  console.log(`   GET   /health\n`);
});