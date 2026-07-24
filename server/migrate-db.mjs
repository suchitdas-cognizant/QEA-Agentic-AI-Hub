/**
 * Mirror all collections from a SOURCE MongoDB into a TARGET MongoDB.
 * The target collections are cleared and replaced with the source docs
 * (original _id values preserved, so references stay intact).
 *
 *   node migrate-db.mjs "<TARGET_URI>"                 # source defaults to local
 *   node migrate-db.mjs "<TARGET_URI>" "<SOURCE_URI>"
 *
 * Example (local -> Atlas):
 *   node migrate-db.mjs "mongodb+srv://user:pass@cluster.mongodb.net/cognizant_agents"
 */
import mongoose from 'mongoose';

const TARGET = process.argv[2];
const SOURCE = process.argv[3] || 'mongodb://127.0.0.1:27017/cognizant_agents';
if (!TARGET) {
  console.error('Usage: node migrate-db.mjs "<TARGET_URI>" ["<SOURCE_URI>"]');
  process.exit(1);
}

const COLLECTIONS = ['admins', 'users', 'associates', 'agents', 'agentrequests', 'feedbacks', 'accessrequests'];

const src = await mongoose.createConnection(SOURCE, { serverSelectionTimeoutMS: 15000 }).asPromise();
const dst = await mongoose.createConnection(TARGET, { serverSelectionTimeoutMS: 20000 }).asPromise();
console.log('Source :', src.host + '/' + src.name);
console.log('Target :', dst.host + '/' + dst.name);
console.log('');

for (const c of COLLECTIONS) {
  const docs = await src.db.collection(c).find({}).toArray();
  await dst.db.collection(c).deleteMany({});
  if (docs.length) await dst.db.collection(c).insertMany(docs, { ordered: false });
  const after = await dst.db.collection(c).countDocuments();
  console.log(`  ${c.padEnd(16)} copied ${String(docs.length).padStart(3)}  ->  target now ${after}`);
}

await src.close();
await dst.close();
console.log('\n✓ Mirror complete.');
process.exit(0);
