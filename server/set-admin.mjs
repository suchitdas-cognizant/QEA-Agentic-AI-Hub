/**
 * Create or update the admin login (username + password). Safe to run anytime.
 *
 *   # from env (server/.env: ADMIN_USERNAME / ADMIN_PASSWORD)
 *   npm run set-admin
 *
 *   # or pass them inline
 *   node set-admin.mjs admin@cognizant.com "MyStr0ng!Pass"
 *
 * If an admin with that username exists, its password is reset; otherwise a new
 * admin is created. Passwords are bcrypt-hashed — the plaintext is never stored.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Admin from './models/Admin.js';

const username = (process.argv[2] || process.env.ADMIN_USERNAME || '').trim();
const password = process.argv[3] || process.env.ADMIN_PASSWORD || '';

if (!username || !password) {
  console.error('Usage: node set-admin.mjs <username> <password>   (or set ADMIN_USERNAME / ADMIN_PASSWORD in .env)');
  process.exit(1);
}
if (String(password).length < 8) {
  console.error('✗ Choose a password of at least 8 characters.');
  process.exit(1);
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cognizant_agents';
await connectDB(uri);

const passwordHash = await Admin.hashPassword(password);
const existing = await Admin.findOne({ username });
if (existing) {
  existing.passwordHash = passwordHash;
  existing.role = 'admin';
  await existing.save();
  console.log(`✓ Password updated for admin "${username}".`);
} else {
  await Admin.create({ username, passwordHash, role: 'admin', displayName: username });
  console.log(`✓ Created admin "${username}".`);
}

await mongoose.disconnect();
process.exit(0);
