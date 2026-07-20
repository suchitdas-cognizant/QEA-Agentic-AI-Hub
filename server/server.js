import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import { CATEGORY_CODES, STAGES, STATUSES } from './constants.js';

import authRoutes from './routes/auth.js';
import agentRoutes from './routes/agents.js';
import videoRoutes from './routes/videos.js';
import requestRoutes from './routes/requests.js';
import assistantRoutes from './routes/assistant.js';
import accessRoutes from './routes/access.js';
import evaluationRoutes from './routes/evaluation.js';

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// --- Fail fast on insecure configuration in production ---------------------
const WEAK_SECRETS = ['', undefined, 'change-me-to-a-long-random-secret', 'secret'];
if (!process.env.JWT_SECRET || (isProd && WEAK_SECRETS.includes(process.env.JWT_SECRET))) {
  console.error('✗ JWT_SECRET is missing or insecure. Set a long random JWT_SECRET in the environment.');
  console.error('  Generate one with:  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  if (isProd) process.exit(1);
}
if (isProd && (!process.env.CLIENT_ORIGIN || process.env.CLIENT_ORIGIN === '*')) {
  console.warn('⚠ CLIENT_ORIGIN is not restricted. Set it to your site origin (e.g. https://hub.example.com) for production.');
}

// --- Security middleware ---------------------------------------------------
app.set('trust proxy', 1); // honour X-Forwarded-* behind a hosting proxy/load balancer
app.use(helmet({
  // Assets/videos are served cross-origin to <img>/<video>; relax COEP/CORP for that.
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // The API returns JSON only, so CSP adds no value and its strict default would
  // break the frontend if it's later served from this same server. If you do
  // serve the built client from Express, add a proper CSP tuned to your assets.
  contentSecurityPolicy: false,
}));
// In production, only allow the configured site origin. In dev, allow any (Vite).
app.use(cors({ origin: isProd ? (process.env.CLIENT_ORIGIN || false) : (process.env.CLIENT_ORIGIN || '*') }));
app.use(express.json({ limit: '1mb' }));

// Throttle auth endpoints to blunt brute-force / credential-stuffing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

// Public config the frontend uses to render the legend, filters and queries email.
app.get('/api/config', (_req, res) => {
  res.json({
    categories: CATEGORY_CODES,
    stages: STAGES,
    statuses: STATUSES,
    queriesEmail: process.env.QUERIES_EMAIL || '',
    // URL of the integrated AgentBench benchmarking app (submodule at integrations/agentbench).
    benchmarkUrl: process.env.BENCHMARK_URL || 'http://localhost:5199',
  });
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/evaluation', evaluationRoutes);

// Multer / generic error handler so failed uploads return clean JSON.
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'A file exceeds the 200 MB upload limit.' });
  }
  const status = err.status || 500;
  // Don't leak internal error details on 500s in production.
  const message = status < 500 ? err.message : (isProd ? 'Server error.' : (err.message || 'Server error.'));
  res.status(status).json({ error: message });
});

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cognizant_agents';

connectDB(uri)
  .then(() => {
    app.listen(PORT, () => console.log(`✓ API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('✗ Failed to connect to MongoDB:', err.message);
    console.error('  Make sure MongoDB is running and MONGODB_URI in server/.env is correct.');
    process.exit(1);
  });
