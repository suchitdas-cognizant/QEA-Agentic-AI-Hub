import mongoose from 'mongoose';
import { getBucket } from '../config/db.js';

/**
 * Store a buffer in GridFS and resolve with the new file's ObjectId.
 */
export function uploadBuffer(buffer, filename, contentType) {
  return new Promise((resolve, reject) => {
    const bucket = getBucket();
    const uploadStream = bucket.openUploadStream(filename, { contentType });
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => resolve(uploadStream.id));
    uploadStream.end(buffer);
  });
}

/**
 * Remove a file from GridFS. Silently ignores a missing/invalid id.
 */
export async function deleteFile(fileId) {
  if (!fileId) return;
  try {
    await getBucket().delete(new mongoose.Types.ObjectId(fileId));
  } catch {
    /* file already gone — nothing to do */
  }
}

/**
 * Look up a GridFS file document by id (or null if not found).
 */
export async function findFile(fileId) {
  if (!mongoose.Types.ObjectId.isValid(fileId)) return null;
  const files = await getBucket()
    .find({ _id: new mongoose.Types.ObjectId(fileId) })
    .toArray();
  return files[0] || null;
}
