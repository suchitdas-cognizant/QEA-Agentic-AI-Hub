/**
 * Live end-to-end test against the MONGODB_URI configured in server/.env
 * (e.g. your MongoDB Atlas cluster). It boots the real Express app and
 * exercises the full flow, then DELETES everything it created so your
 * database is left with only the seeded sample data.
 *
 *   node live-test.mjs
 */
import 'dotenv/config';

const PORT = process.env.TEST_PORT || 5099;
const BASE = `http://localhost:${PORT}`;
let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? '✓' : '✗'} ${label}`);
  if (!cond) failures++;
};

async function waitForHealth() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Server never became healthy — check MONGODB_URI in server/.env');
}

try {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set in server/.env');
  process.env.PORT = String(PORT); // run the test server on a side port

  await import('./server.js'); // connects to the configured DB + listens
  await waitForHealth();
  ok(true, 'Server connected to MongoDB and is healthy');

  // Make sure an admin exists (seed normally does this).
  const Admin = (await import('./models/Admin.js')).default;
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  if (!(await Admin.findOne({ username }))) {
    await Admin.create({ username, passwordHash: await Admin.hashPassword(password) });
    console.log(`  (created admin "${username}")`);
  }

  // Login
  let r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const { token } = await r.json();
  ok(r.status === 200 && !!token, 'Admin login returns a JWT');

  // Auth guard
  ok((await fetch(`${BASE}/api/agents`, { method: 'POST' })).status === 401, 'Unauthenticated create is blocked');

  // Create agent with a GridFS video
  const bytes = new Uint8Array(4096).fill(9);
  const fd = new FormData();
  fd.append('name', '__LIVE_TEST__ Agent');
  fd.append('tagline', 'temporary — safe to ignore');
  fd.append('techStacks', 'GenAI, Node.js, React');
  fd.append('category', 'DV');
  fd.append('stage', 'POV');
  fd.append('video', new Blob([bytes], { type: 'video/mp4' }), 'demo.mp4');
  r = await fetch(`${BASE}/api/agents`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  const agent = await r.json();
  ok(r.status === 201 && agent._id, 'Agent created');
  ok(agent.techStacks?.length === 3, 'Tech stacks parsed');
  ok(!!agent.videoFileId, 'Video stored in GridFS');

  // Stream + range
  r = await fetch(`${BASE}/api/videos/${agent.videoFileId}`);
  ok(r.status === 200 && (await r.arrayBuffer()).byteLength === 4096, 'Video streams back fully');
  r = await fetch(`${BASE}/api/videos/${agent.videoFileId}`, { headers: { Range: 'bytes=0-99' } });
  ok(r.status === 206, 'Range request returns 206 (seekable)');

  // Rate
  r = await fetch(`${BASE}/api/agents/${agent._id}/rate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: 5 }),
  });
  ok((await r.json()).rating === 5, 'Rating recorded');

  // Request flow
  r = await fetch(`${BASE}/api/requests`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requesterName: 'LiveTest', email: 't@t.com', agentName: '__LIVE_TEST__ Req' }),
  });
  const reqRes = await r.json();
  ok(r.status === 201 && reqRes.id, 'Public request submitted');
  r = await fetch(`${BASE}/api/requests`, { headers: { Authorization: `Bearer ${token}` } });
  ok((await r.json()).some((x) => x._id === reqRes.id), 'Admin can see the request');

  // Cleanup
  await fetch(`${BASE}/api/agents/${agent._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  ok((await fetch(`${BASE}/api/videos/${agent.videoFileId}`)).status === 404, 'Video removed after agent delete');
  await fetch(`${BASE}/api/requests/${reqRes.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  console.log('  (cleaned up test agent + request)');
} catch (err) {
  console.error('✗ Live test crashed:', err.message);
  failures++;
} finally {
  const mongoose = (await import('mongoose')).default;
  await mongoose.disconnect().catch(() => {});
  console.log(failures === 0 ? '\n✅ ALL CHECKS PASSED' : `\n❌ ${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
