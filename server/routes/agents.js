import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import Agent from '../models/Agent.js';
import Feedback from '../models/Feedback.js';
import { requireAdmin } from '../middleware/auth.js';
import { uploadBuffer, deleteFile } from '../utils/gridfs.js';

const router = express.Router();

// Keep uploads in memory, then stream into GridFS. 200 MB cap.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files are allowed.'));
  },
});

// Normalise incoming multipart/JSON fields into a clean agent payload.
function parseAgentBody(body) {
  const out = {};
  const str = (k) => (body[k] !== undefined ? String(body[k]).trim() : undefined);

  for (const key of ['name', 'tagline', 'description', 'category', 'stage', 'status', 'tier', 'autonomyLevel', 'industry', 'smeEmail', 'icon', 'externalVideoUrl', 'repoUrl']) {
    const v = str(key);
    if (v !== undefined) out[key] = v;
  }

  if (body.priority !== undefined) {
    const n = Number(body.priority);
    out.priority = Number.isFinite(n) ? n : 0;
  }

  if (body.keyBenefits !== undefined) {
    let kb = body.keyBenefits;
    if (typeof kb === 'string') {
      try {
        kb = JSON.parse(kb);
      } catch {
        kb = [];
      }
    }
    out.keyBenefits = (Array.isArray(kb) ? kb : [])
      .map((b) => ({
        title: String(b?.title || '').trim(),
        description: String(b?.description || '').trim(),
      }))
      .filter((b) => b.title || b.description);
  }

  if (body.techStacks !== undefined) {
    let ts = body.techStacks;
    if (typeof ts === 'string') {
      const trimmed = ts.trim();
      try {
        ts = JSON.parse(trimmed); // accept a JSON array string
      } catch {
        ts = trimmed.split(',').map((s) => s.trim()); // fall back to comma list
      }
    }
    out.techStacks = (Array.isArray(ts) ? ts : []).map((s) => String(s).trim()).filter(Boolean);
  }

  return out;
}

// GET /api/agents?category=DV&stage=MVP&q=profile  (public)
router.get('/', async (req, res) => {
  const { category, stage, status, industry, q } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (stage) filter.stage = stage;
  if (status) filter.status = status;
  if (industry) filter.industry = industry;
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { tagline: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { techStacks: { $regex: q, $options: 'i' } },
    ];
  }
  const agents = await Agent.find(filter).sort({ priority: -1, createdAt: -1 });
  res.json(agents);
});

// GET /api/agents/:id  (public)
router.get('/:id', async (req, res) => {
  const agent = await Agent.findById(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found.' });
  res.json(agent);
});

// POST /api/agents  (admin) — create, with optional video file under field "video"
router.post('/', requireAdmin, upload.single('video'), async (req, res) => {
  try {
    const data = parseAgentBody(req.body);
    if (!data.name) return res.status(400).json({ error: 'Agent name is required.' });

    if (req.file) {
      data.videoFileId = await uploadBuffer(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
    }

    const agent = await Agent.create(data);
    res.status(201).json(agent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/agents/:id  (admin) — update; uploads a new video if one is attached
router.put('/:id', requireAdmin, upload.single('video'), async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found.' });

    const data = parseAgentBody(req.body);
    Object.assign(agent, data);

    if (req.file) {
      if (agent.videoFileId) await deleteFile(agent.videoFileId); // remove the old one
      agent.videoFileId = await uploadBuffer(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
    }

    // Allow explicitly clearing the uploaded video.
    if (String(req.body.removeVideo) === 'true' && agent.videoFileId) {
      await deleteFile(agent.videoFileId);
      agent.videoFileId = null;
    }

    await agent.save();
    res.json(agent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/agents/:id  (admin) — also removes the stored video
router.delete('/:id', requireAdmin, async (req, res) => {
  const agent = await Agent.findById(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found.' });
  if (agent.videoFileId) await deleteFile(agent.videoFileId);
  await agent.deleteOne();
  res.json({ ok: true });
});

// POST /api/agents/:id/rate  (public) — add a star rating, keep a running average
// GET /api/agents/:id/feedback  (public) — recent ratings + comments
router.get('/:id/feedback', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid agent id.' });
  }
  const items = await Feedback.find({ agent: req.params.id })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(items);
});

// POST /api/agents/:id/feedback  (public) — submit a star rating + optional comment.
// Stores the feedback and recomputes the agent's average rating from all feedback.
router.post('/:id/feedback', async (req, res) => {
  const rating = Number(req.body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Please select a rating between 1 and 5 stars.' });
  }
  const agent = await Agent.findById(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found.' });

  const feedback = await Feedback.create({
    agent: agent._id,
    rating,
    comment: String(req.body?.comment || '').slice(0, 1000),
    name: String(req.body?.name || '').trim().slice(0, 80) || 'Anonymous',
  });

  // Recompute the running average straight from the feedback collection.
  const [stats] = await Feedback.aggregate([
    { $match: { agent: agent._id } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  agent.rating = Math.round((stats?.avg ?? rating) * 10) / 10;
  agent.ratingCount = stats?.count ?? 1;
  await agent.save();

  res.status(201).json({ rating: agent.rating, ratingCount: agent.ratingCount, feedback });
});

export default router;
