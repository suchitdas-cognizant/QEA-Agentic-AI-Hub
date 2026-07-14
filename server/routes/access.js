import express from 'express';
import Associate from '../models/Associate.js';
import AccessRequest from '../models/AccessRequest.js';
import { requireAdmin, requireRoles } from '../middleware/auth.js';

const router = express.Router();

const normalizeEmail = (v = '') => v.trim().toLowerCase();

// ---------------------------------------------------------------------------
// Self-service: a signed-in user requests associate access
// ---------------------------------------------------------------------------

// GET /api/access/me — the caller's current associate status / pending request.
router.get('/me', requireRoles(), async (req, res) => {
  const email = normalizeEmail(req.admin.username);
  const [grant, pending] = await Promise.all([
    Associate.findOne({ email }),
    AccessRequest.findOne({ email, status: 'Pending' }),
  ]);
  res.json({
    role: req.admin.role,
    isAssociate: Boolean(grant) || req.admin.role !== 'user',
    pending: Boolean(pending),
  });
});

// POST /api/access/request — submit a request for associate access.
router.post('/request', requireRoles(), async (req, res) => {
  const email = normalizeEmail(req.admin.username);
  if (!email) return res.status(400).json({ error: 'Your account has no email.' });

  // Already an associate/admin? Nothing to request.
  if (req.admin.role !== 'user' || (await Associate.findOne({ email }))) {
    return res.status(409).json({ error: 'You already have associate access.' });
  }
  // One open request at a time.
  const existing = await AccessRequest.findOne({ email, status: 'Pending' });
  if (existing) return res.status(409).json({ error: 'You already have a pending request.' });

  const created = await AccessRequest.create({
    name: req.admin.displayName || '',
    email,
    message: (req.body?.message || '').trim(),
  });
  res.status(201).json({ ok: true, id: created._id, status: created.status });
});

// ---------------------------------------------------------------------------
// Admin: review requests + manage associate grants
// ---------------------------------------------------------------------------

// GET /api/access/requests — all access requests, newest first.
router.get('/requests', requireAdmin, async (_req, res) => {
  const rows = await AccessRequest.find().sort({ createdAt: -1 });
  res.json(rows);
});

// PATCH /api/access/requests/:id — approve or reject.
router.patch('/requests/:id', requireAdmin, async (req, res) => {
  const status = req.body?.status;
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be Approved or Rejected.' });
  }
  const reqDoc = await AccessRequest.findById(req.params.id);
  if (!reqDoc) return res.status(404).json({ error: 'Request not found.' });

  reqDoc.status = status;
  reqDoc.decidedBy = req.admin.username;
  await reqDoc.save();

  // Approving grants associate access (idempotent upsert).
  if (status === 'Approved') {
    await Associate.updateOne(
      { email: reqDoc.email },
      { $setOnInsert: { email: reqDoc.email, name: reqDoc.name, grantedVia: 'request', grantedBy: req.admin.username } },
      { upsert: true }
    );
  }
  res.json(reqDoc);
});

// GET /api/access/associates — current associate grants.
router.get('/associates', requireAdmin, async (_req, res) => {
  const rows = await Associate.find().sort({ createdAt: -1 });
  res.json(rows);
});

// POST /api/access/associates — admin manually grants associate access.
router.post('/associates', requireAdmin, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  if (await Associate.findOne({ email })) {
    return res.status(409).json({ error: 'That email already has associate access.' });
  }
  const created = await Associate.create({
    email,
    name: (req.body?.name || '').trim(),
    grantedVia: 'admin',
    grantedBy: req.admin.username,
  });
  res.status(201).json(created);
});

// DELETE /api/access/associates/:id — revoke a grant.
router.delete('/associates/:id', requireAdmin, async (req, res) => {
  const deleted = await Associate.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Associate not found.' });
  res.json({ ok: true });
});

export default router;
