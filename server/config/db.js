import mongoose from 'mongoose';

let bucket = null;

/**
 * Connect to MongoDB and initialise the GridFS bucket used for video storage.
 */
export async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);

  const { GridFSBucket } = mongoose.mongo;
  bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'videos' });

  console.log(`✓ MongoDB connected (${mongoose.connection.name})`);
  return mongoose.connection;
}

/**
 * Returns the initialised GridFS bucket for streaming video files.
 */
export function getBucket() {
  if (!bucket) {
    throw new Error('GridFS bucket not initialised — call connectDB() first.');
  }
  return bucket;
}
