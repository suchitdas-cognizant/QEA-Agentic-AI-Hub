import express from 'express';
import mongoose from 'mongoose';
import AgentRequest from '../models/AgentRequest.js';
import { requireAdmin } from '../middleware/auth.js';
import { getBucket } from '../config/db.js';

const router = express.Router();

// Where the ARA evaluation microservice runs (integrations/eval-service/app.py).
const EVAL_URL = process.env.EVAL_SERVICE_URL || 'http://127.0.0.1:8200';

// Read a GridFS file's contents as UTF-8 text.
function readGridText(fileId) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    getBucket()
      .openDownloadStream(new mongoose.Types.ObjectId(fileId))
      .on('data', (c) => chunks.push(c))
      .on('error', reject)
      .on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

// Typed-fields fallback spec (used only when there are no .md docs).
function specFromFields(r) {
  const parts = [`# ${r.agentName}`];
  if (r.useCase) parts.push(`\n## Purpose / use case\n${r.useCase}`);
  if (r.description) parts.push(`\n## Description\n${r.description}`);
  if (r.keyBenefits?.length) {
    parts.push('\n## Key benefits');
    r.keyBenefits.forEach((b) => parts.push(`- ${b.title}${b.description ? `: ${b.description}` : ''}`));
  }
  if (r.repoUrl) parts.push(`\n## Repository\n${r.repoUrl}`);
  return parts.join('\n');
}

// ARA is designed to evaluate an agent's markdown documentation, so we feed it
// the uploaded .md file(s). Falls back to the typed fields if none are attached.
async function buildSpec(r) {
  const mdFiles = (r.attachments || []).filter((a) => a.kind === 'md');
  const docs = [];
  for (const a of mdFiles) {
    try {
      const text = await readGridText(a.fileId);
      if (text.trim()) docs.push(`# ${a.filename || 'document.md'}\n\n${text}`);
    } catch {
      /* skip unreadable file */
    }
  }
  if (docs.length) {
    return { spec: docs.join('\n\n---\n\n'), source: `${docs.length} uploaded .md file${docs.length > 1 ? 's' : ''}` };
  }
  return { spec: specFromFields(r), source: 'typed description (no .md uploaded)' };
}

// POST /api/evaluation/run  { requestId }  (admin)
// Runs the Agent Readiness Analyzer on the submission's .md docs and caches the report.
router.post('/run', requireAdmin, async (req, res) => {
  const { requestId } = req.body || {};
  const doc = await AgentRequest.findById(requestId);
  if (!doc) return res.status(404).json({ error: 'Request not found.' });

  const { spec, source } = await buildSpec(doc);

  let report;
  try {
    const resp = await fetch(`${EVAL_URL}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spec }),
    });
    report = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(report.error || `HTTP ${resp.status}`);
  } catch (e) {
    return res.status(502).json({
      error: `Could not reach the evaluation service at ${EVAL_URL}. Is it running? (${e.message})`,
    });
  }

  doc.evaluation = {
    card: report.card || null,
    reasons: report.reasons || [],
    guard: report.guard || null,
    source,
    evaluatedAt: new Date().toISOString(),
  };
  doc.markModified('evaluation');
  await doc.save();
  res.json(doc.evaluation);
});

export default router;
