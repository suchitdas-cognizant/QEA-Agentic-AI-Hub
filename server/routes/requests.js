import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import AgentRequest from '../models/AgentRequest.js';
import Agent from '../models/Agent.js';
import Associate from '../models/Associate.js';
import { STATUSES, TIERS } from '../constants.js';
import { requireAdmin, requireStaff, requireAuth } from '../middleware/auth.js';
import { getBucket } from '../config/db.js';
import { uploadBuffer, deleteFile, findFile } from '../utils/gridfs.js';

const router = express.Router();

// Keep uploads in memory, then stream into GridFS. 200 MB cap per file.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

// File inputs on the form, each mapped to an attachment "kind".
const FILE_FIELDS = [
  { name: 'md', maxCount: 10 },
  { name: 'video', maxCount: 1 },
  { name: 'code', maxCount: 10 },
];

// Accepts a comma-separated string (or array) and returns a clean string array.
function parseTechStacks(raw) {
  let ts = raw;
  if (typeof ts === 'string') {
    try {
      const j = JSON.parse(ts);
      ts = Array.isArray(j) ? j : ts.split(',');
    } catch {
      ts = ts.split(',');
    }
  }
  return (Array.isArray(ts) ? ts : []).map((s) => String(s).trim()).filter(Boolean);
}

function parseBenefits(raw) {
  let kb = raw;
  if (typeof kb === 'string') {
    try {
      kb = JSON.parse(kb);
    } catch {
      kb = [];
    }
  }
  return (Array.isArray(kb) ? kb : [])
    .map((b) => ({
      title: String(b?.title || '').trim(),
      description: String(b?.description || '').trim(),
    }))
    .filter((b) => b.title || b.description);
}

// POST /api/requests  (any logged-in user) — submit a proposal.
//  • role "user"            -> an innovation IDEA: name + description only, no docs.
//  • role "associate"/"admin" -> a full SUBMISSION with benefits + attachments.
router.post('/', requireAuth, upload.fields(FILE_FIELDS), async (req, res) => {
  try {
    const agentName = String(req.body?.agentName || '').trim();
    if (!agentName) return res.status(400).json({ error: 'A name/title is required.' });

    const role = req.admin?.role || 'user';
    const isIdea = role === 'user';

    // Ideas (users) never carry documents; associates/admins may.
    const attachments = [];
    if (!isIdea) {
      for (const { name: kind } of FILE_FIELDS) {
        for (const f of req.files?.[kind] || []) {
          const fileId = await uploadBuffer(f.buffer, f.originalname, f.mimetype);
          attachments.push({
            fileId,
            filename: f.originalname,
            contentType: f.mimetype,
            kind,
            size: f.size,
          });
        }
      }
    }

    const created = await AgentRequest.create({
      type: isIdea ? 'idea' : 'submission',
      requesterName: req.admin?.username || '',
      submittedByUsername: req.admin?.username || '',
      submittedByRole: role,
      agentName,
      description: String(req.body?.description || '').trim(),
      useCase: String(req.body?.useCase || '').trim(),
      repoUrl: isIdea ? '' : String(req.body?.repoUrl || '').trim(),
      externalVideoUrl: isIdea ? '' : String(req.body?.externalVideoUrl || '').trim(),
      industry: isIdea ? '' : String(req.body?.industry || '').trim(),
      techStacks: isIdea ? [] : parseTechStacks(req.body?.techStacks),
      smeEmail: isIdea ? '' : String(req.body?.smeEmail || '').trim(),
      icon: isIdea ? '' : String(req.body?.icon || '').trim(),
      tier: isIdea ? 'Free' : (TIERS.includes(req.body?.tier) ? req.body.tier : 'Free'),
      keyBenefits: isIdea ? [] : parseBenefits(req.body?.keyBenefits),
      attachments,
    });
    res.status(201).json({ ok: true, id: created._id, type: created.type });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/requests  (staff) — newest first.
//  • admin      -> everything (ideas + full agent submissions).
//  • associate  -> only the innovation ideas an admin has forwarded to them.
router.get('/', requireStaff, async (req, res) => {
  let filter = {};
  if (req.admin?.role === 'associate') {
    const email = String(req.admin.username || '').trim().toLowerCase();
    filter = { type: 'idea', forwardedTo: email };
  }
  const requests = await AgentRequest.find(filter).sort({ createdAt: -1 });
  res.json(requests);
});

// GET /api/requests/attachment/:id  (public) — view/download a stored attachment.
// IDs are unguessable ObjectIds; kept public so <a>/<video> tags work without headers.
router.get('/attachment/:id', async (req, res) => {
  const file = await findFile(req.params.id);
  if (!file) return res.status(404).json({ error: 'Attachment not found.' });

  const bucket = getBucket();
  const fileId = new mongoose.Types.ObjectId(req.params.id);
  const total = file.length;
  const contentType = file.contentType || 'application/octet-stream';
  const disp = req.query.download === '1' ? 'attachment' : 'inline';
  const range = req.headers.range;

  // Range support so uploaded demo videos can be scrubbed.
  if (range && contentType.startsWith('video/')) {
    const [s, e] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(s, 10) || 0;
    const end = e ? parseInt(e, 10) : total - 1;
    if (start >= total || end >= total) {
      return res.status(416).set('Content-Range', `bytes */${total}`).end();
    }
    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': contentType,
    });
    return bucket.openDownloadStream(fileId, { start, end: end + 1 }).pipe(res);
  }

  res.status(200).set({
    'Content-Length': total,
    'Content-Type': contentType,
    'Content-Disposition': `${disp}; filename="${(file.filename || 'file').replace(/"/g, '')}"`,
    'Accept-Ranges': 'bytes',
  });
  bucket.openDownloadStream(fileId).pipe(res);
});

// PATCH /api/requests/:id  (staff) — update review status.
// Associates may only touch innovation ideas that were forwarded to them.
router.patch('/:id', requireStaff, async (req, res) => {
  const { status } = req.body || {};
  const doc = await AgentRequest.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Request not found.' });
  if (req.admin?.role === 'associate') {
    const email = String(req.admin.username || '').trim().toLowerCase();
    if (doc.type !== 'idea' || doc.forwardedTo !== email) {
      return res.status(403).json({ error: 'You do not have access to this request.' });
    }
  }
  doc.status = status;
  await doc.save();
  res.json(doc);
});

// POST /api/requests/:id/publish  (admin) — turn the submission into a live agent.
router.post('/:id/publish', requireAdmin, async (req, res) => {
  const reqDoc = await AgentRequest.findById(req.params.id);
  if (!reqDoc) return res.status(404).json({ error: 'Request not found.' });
  if (reqDoc.publishedAgent) {
    return res.status(409).json({ error: 'This request has already been published.' });
  }

  // Admin chooses the launch status at publish time (Active by default).
  const status = STATUSES.includes(req.body?.status) ? req.body.status : 'Active';
  // Access tier: admin's choice, else the associate's suggestion, else Free.
  const tier = TIERS.includes(req.body?.tier)
    ? req.body.tier
    : (TIERS.includes(reqDoc.tier) ? reqDoc.tier : 'Free');

  const videoAtt = reqDoc.attachments.find((a) => a.kind === 'video');
  // Carry the autonomy level detected by the ARA readiness evaluation, if run.
  const autonomyLevel = reqDoc.evaluation?.card?.autonomy_level || '';
  const agent = await Agent.create({
    name: reqDoc.agentName,
    tagline: reqDoc.useCase,
    description: reqDoc.description,
    keyBenefits: reqDoc.keyBenefits,
    autonomyLevel: autonomyLevel === 'UNKNOWN' ? '' : autonomyLevel,
    industry: reqDoc.industry || '',
    techStacks: reqDoc.techStacks || [],
    smeEmail: reqDoc.smeEmail || '',
    ...(reqDoc.icon ? { icon: reqDoc.icon } : {}),
    // Prefer an uploaded video file; otherwise carry the associate's external link.
    videoFileId: videoAtt ? videoAtt.fileId : null,
    externalVideoUrl: videoAtt ? '' : reqDoc.externalVideoUrl || '',
    repoUrl: reqDoc.repoUrl || '',
    attachments: reqDoc.attachments.filter((a) => a.kind !== 'video'),
    status,
    tier,
  });

  reqDoc.status = 'Approved';
  reqDoc.publishedAgent = agent._id;
  await reqDoc.save();
  res.status(201).json({ ok: true, agentId: agent._id, request: reqDoc });
});

// POST /api/requests/:id/forward  (admin) — forward an innovation idea to an
// associate to build out. Ideas are never published directly.
router.post('/:id/forward', requireAdmin, async (req, res) => {
  const email = String(req.body?.associateEmail || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Pick an associate to forward to.' });

  const doc = await AgentRequest.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Request not found.' });

  const associate = await Associate.findOne({ email });
  if (!associate) return res.status(404).json({ error: 'That associate no longer has access.' });

  doc.forwardedTo = associate.email;
  doc.forwardedToName = associate.name || associate.email;
  doc.forwardedAt = new Date();
  doc.status = 'In Review';
  await doc.save();
  res.json({ ok: true, request: doc });
});

// DELETE /api/requests/:id  (admin) — also remove its attachment files.
router.delete('/:id', requireAdmin, async (req, res) => {
  const doc = await AgentRequest.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Request not found.' });
  for (const a of doc.attachments) await deleteFile(a.fileId);
  await doc.deleteOne();
  res.json({ ok: true });
});

export default router;
