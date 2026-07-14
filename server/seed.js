/**
 * Seeds the database with a default admin account and a handful of sample agents
 * so the dashboard isn't empty on first run.
 *
 *   npm run seed
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Admin from './models/Admin.js';
import Agent from './models/Agent.js';
import { SAMPLE_AGENTS } from './sampleAgents.js';

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cognizant_agents';
  await connectDB(uri);

  // --- Admin account ---
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const existing = await Admin.findOne({ username });
  if (existing) {
    console.log(`• Admin "${username}" already exists — leaving it untouched.`);
  } else {
    await Admin.create({ username, passwordHash: await Admin.hashPassword(password) });
    console.log(`✓ Created admin "${username}" (password: "${password}")`);
  }

  // --- Sample agents (only if the collection is empty) ---
  const count = await Agent.countDocuments();
  if (count === 0) {
    await Agent.insertMany(SAMPLE_AGENTS);
    console.log(`✓ Inserted ${SAMPLE_AGENTS.length} sample agents.`);
  } else {
    console.log(`• ${count} agents already present — skipping sample insert.`);
  }

  await mongoose.disconnect();
  console.log('✓ Seed complete.');
  process.exit(0);
}

run().catch((err) => {
  console.error('✗ Seed failed:', err.message);
  process.exit(1);
});
