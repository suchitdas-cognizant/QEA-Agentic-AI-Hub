import express from 'express';
import mongoose from 'mongoose';
import { getBucket } from '../config/db.js';
import { findFile } from '../utils/gridfs.js';

const router = express.Router();

// GET /api/videos/:id  -> streams the video, supporting HTTP Range (seeking).
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const file = await findFile(id);
  if (!file) {
    return res.status(404).json({ error: 'Video not found.' });
  }

  const bucket = getBucket();
  const fileId = new mongoose.Types.ObjectId(id);
  const total = file.length;
  const contentType = file.contentType || 'video/mp4';
  const range = req.headers.range;

  if (range) {
    // e.g. "bytes=0-" or "bytes=1000-2000"
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10) || 0;
    const end = endStr ? parseInt(endStr, 10) : total - 1;

    if (start >= total || end >= total) {
      res.status(416).set('Content-Range', `bytes */${total}`).end();
      return;
    }

    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': contentType,
    });
    bucket.openDownloadStream(fileId, { start, end: end + 1 }).pipe(res);
  } else {
    res.status(200).set({
      'Content-Length': total,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });
    bucket.openDownloadStream(fileId).pipe(res);
  }
});

export default router;
