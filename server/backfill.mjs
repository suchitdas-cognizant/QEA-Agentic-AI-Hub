/**
 * One-off: adds keyBenefits + implementation to existing sample agents that
 * don't have them yet (matched by name). Safe to re-run; never overwrites an
 * agent that already has key benefits.
 *
 *   node backfill.mjs
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Agent from './models/Agent.js';
import { SAMPLE_AGENTS } from './sampleAgents.js';

await connectDB(process.env.MONGODB_URI || 'mongodb://localhost:27017/cognizant_agents');

let updated = 0;
for (const sample of SAMPLE_AGENTS) {
  const agent = await Agent.findOne({ name: sample.name });
  if (!agent) continue;
  if (agent.keyBenefits && agent.keyBenefits.length > 0) {
    console.log(`• "${sample.name}" already has key benefits — skipped.`);
    continue;
  }
  agent.keyBenefits = sample.keyBenefits;
  await agent.save();
  updated++;
  console.log(`✓ Updated "${sample.name}" (${sample.keyBenefits.length} benefits).`);
}

console.log(`\nDone — ${updated} agent(s) updated.`);
await mongoose.disconnect();
process.exit(0);
