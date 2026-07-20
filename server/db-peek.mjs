/**
 * Prints the contents of the main collections (accounts, agents, requests).
 * Passwords are masked — bcrypt hashes are never printed in full.
 *
 *   npm run db            # everything
 *   node db-peek.mjs admins            # one collection
 *   node db-peek.mjs users associates  # a few
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';

const ALL = ['admins', 'users', 'associates', 'agents', 'agentrequests', 'accessrequests'];
const want = process.argv.slice(2).length ? process.argv.slice(2) : ALL;

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cognizant_agents';
await connectDB(uri);
const db = mongoose.connection.db;

const mask = (v) => (v ? String(v).slice(0, 10) + '…(hidden)' : undefined);

for (const coll of want) {
  const rows = await db.collection(coll).find({}).toArray();
  console.log(`\n=== ${coll} (${rows.length}) ===`);
  for (const r of rows) {
    if (r.passwordHash) r.passwordHash = mask(r.passwordHash);
    // Trim noisy/large fields for readability.
    delete r.__v;
    if (r.evaluation) r.evaluation = '…(evaluation cached)';
    console.log(JSON.stringify(r));
  }
}

await mongoose.disconnect();
process.exit(0);
