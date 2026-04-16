import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
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

// ──────────────────────────────────────────────
// Static frontend (optional — remove/comment out
// if hosting frontend separately on Vercel/Netlify)
// ──────────────────────────────────────────────
app.use(express.static(join(__dirname, 'public')));
app.get('*', (_, res) => res.sendFile(join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`\n🚀  Meta Generator API  →  http://localhost:${PORT}`);
  console.log(`──────────────────────────────────────`);
  console.log(`   GET   /api/fetch?url=<url>`);
  console.log(`   POST  /api/generate`);
  console.log(`   GET   /health\n`);
});