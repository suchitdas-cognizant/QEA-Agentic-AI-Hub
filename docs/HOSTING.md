# Hosting & security guide

This covers what to set before deploying the QEA Agentic Hub, and how to manage
the admin login.

## 1. Change / set the admin login

The admin lives in the database (bcrypt-hashed — the password is never stored in
plaintext or in code). To create or change it:

```bash
cd server

# Option A — inline
node set-admin.mjs admin@cognizant.com "A-Strong-Password!"

# Option B — from .env (ADMIN_USERNAME / ADMIN_PASSWORD), then:
npm run set-admin
```

- If the username already exists, its **password is reset**.
- If it doesn't exist, a new admin is **created**.
- To rename the admin, create the new one, sign in, then remove the old grant.

`npm run seed` also creates the admin on first run, but `set-admin` is the way to
change it later.

## 2. Required environment variables (production)

Set these on your host (never commit `.env` — it is gitignored). See
`server/.env.example` for the full template.

| Variable | Why it matters |
|----------|----------------|
| `NODE_ENV=production` | Turns on the security checks below (fail-fast on weak secret, locked CORS, no error leakage). |
| `JWT_SECRET` | **Must** be a long random string. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `MONGODB_URI` | Your hosted MongoDB (e.g. Atlas) connection string. |
| `CLIENT_ORIGIN` | Your real site origin, e.g. `https://hub.example.com`. CORS is locked to this in production. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Strong admin credentials (>= 8 chars). |
| `QUERIES_EMAIL` | Footer contact email. |
| `BENCHMARK_URL` | Where AgentBench is hosted (admin Benchmarking tab). |

## 3. What was hardened

- **Fail-fast config check** — the server refuses to start in production with a
  missing/placeholder `JWT_SECRET`, and warns if CORS isn't locked down.
- **No hardcoded logins** — there are no built-in demo/backdoor accounts. Real
  users self-register; the admin lives in the database; associate access is a grant.
- **Security headers** via Helmet (nosniff, X-Frame-Options, HSTS, etc.).
- **Rate limiting** on `/api/auth` (30 requests / 15 min per IP) to blunt
  brute-force and credential stuffing.
- **CORS** restricted to `CLIENT_ORIGIN` in production.
- **No error leakage** — 500s return a generic message in production; details go
  to the server log only.
- **Passwords** are bcrypt-hashed (admin + self-registered users).
- **JSON body limit** of 1 MB; file uploads capped at 200 MB.

## 4. Pre-hosting checklist

- [ ] `NODE_ENV=production` set on the host
- [ ] Strong random `JWT_SECRET` set
- [ ] `MONGODB_URI` points at the hosted database
- [ ] `CLIENT_ORIGIN` set to the real frontend URL
- [ ] Admin password changed from any default (`npm run set-admin`)
- [ ] Frontend built with the API base pointing at the hosted API
- [ ] MongoDB reachable only by the API (network/firewall), with its own auth
