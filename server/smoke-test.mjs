/**
 * End-to-end smoke test against an in-memory MongoDB.
 * Boots the real Express app, then exercises auth, agent CRUD,
 * GridFS video upload + streaming, and the request flow.
 *
 *   node smoke-test.mjs        (requires the dev dep mongodb-memory-server)
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

const PORT = 5099;
const BASE = `http://localhost:${PORT}`;
let mem;
let failures = 0;

const ok = (cond, label) => {
  console.log(`${cond ? '✓' : '✗'} ${label}`);
  if (!cond) failures++;
};

async function waitForHealth() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((res) => setTimeout(res, 200));
  }
  throw new Error('Server never became healthy');
}

try {
  mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri('cognizant_agents_test');
  process.env.PORT = String(PORT);
  process.env.JWT_SECRET = 'smoke-secret';
  process.env.CLIENT_ORIGIN = '*';

  // Boot the actual server (connects + listens).
  await import('./server.js');
  await waitForHealth();
  ok(true, 'Server boots and connects to MongoDB');

  // Create an admin directly so we can log in.
  const Admin = (await import('./models/Admin.js')).default;
  await Admin.create({ username: 'admin', passwordHash: await Admin.hashPassword('admin123') });

  // --- Login ---
  let r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const { token } = await r.json();
  ok(r.status === 200 && !!token, 'Admin login returns a JWT');

  // --- Reject bad credentials ---
  r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'wrong' }),
  });
  ok(r.status === 401, 'Bad password is rejected (401)');

  // --- Create agent without auth is blocked ---
  r = await fetch(`${BASE}/api/agents`, { method: 'POST' });
  ok(r.status === 401, 'Creating an agent without a token is blocked (401)');

  // --- Create agent WITH a video upload (GridFS) ---
  const videoBytes = new Uint8Array(2048).fill(7); // fake "video"
  const fd = new FormData();
  fd.append('name', 'Smoke Test Agent');
  fd.append('tagline', 'verifies the pipeline');
  fd.append('description', 'An agent created by the smoke test.');
  fd.append('techStacks', 'GenAI, Node.js, React');
  fd.append('category', 'DV');
  fd.append('stage', 'POV');
  fd.append('video', new Blob([videoBytes], { type: 'video/mp4' }), 'demo.mp4');

  r = await fetch(`${BASE}/api/agents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const agent = await r.json();
  ok(r.status === 201 && agent._id, 'Agent created with auth');
  ok(Array.isArray(agent.techStacks) && agent.techStacks.length === 3, 'Tech stacks parsed from CSV');
  ok(!!agent.videoFileId, 'Video stored in GridFS (videoFileId set)');

  // --- Stream the video back ---
  r = await fetch(`${BASE}/api/videos/${agent.videoFileId}`);
  const buf = new Uint8Array(await r.arrayBuffer());
  ok(r.status === 200 && buf.length === 2048, 'Video streams back with correct length');

  // --- Range request (seeking) ---
  r = await fetch(`${BASE}/api/videos/${agent.videoFileId}`, { headers: { Range: 'bytes=0-99' } });
  ok(r.status === 206 && r.headers.get('content-range')?.includes('/2048'), 'Range request returns 206 partial content');

  // --- List & filter ---
  r = await fetch(`${BASE}/api/agents?q=smoke`);
  const list = await r.json();
  ok(r.status === 200 && list.some((a) => a._id === agent._id), 'Search returns the new agent');

  // --- Rate the agent ---
  r = await fetch(`${BASE}/api/agents/${agent._id}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating: 4 }),
  });
  const rated = await r.json();
  ok(r.status === 200 && rated.rating === 4 && rated.ratingCount === 1, 'Rating updates the running average');

  // --- Submit a request (public) ---
  r = await fetch(`${BASE}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requesterName: 'Suchit', email: 's@x.com', agentName: 'New Idea' }),
  });
  ok(r.status === 201, 'Public request submitted');

  // --- Admin sees the request ---
  r = await fetch(`${BASE}/api/requests`, { headers: { Authorization: `Bearer ${token}` } });
  const reqs = await r.json();
  ok(r.status === 200 && reqs.length === 1, 'Admin can list submitted requests');

  // --- Delete the agent (also removes the video) ---
  r = await fetch(`${BASE}/api/agents/${agent._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  ok(r.status === 200, 'Agent deleted');
  r = await fetch(`${BASE}/api/videos/${agent.videoFileId}`);
  ok(r.status === 404, 'Video is gone after agent deletion');
} catch (err) {
  console.error('✗ Smoke test crashed:', err);
  failures++;
} finally {
  if (mem) await mem.stop();
  console.log(failures === 0 ? '\n✅ ALL CHECKS PASSED' : `\n❌ ${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
