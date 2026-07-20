import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());

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

app.use('/api/auth', authRoutes);
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
  res.status(err.status || 500).json({ error: err.message || 'Server error.' });
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
