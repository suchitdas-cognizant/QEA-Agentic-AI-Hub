import express from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Associate from '../models/Associate.js';
import User from '../models/User.js';

const router = express.Router();
// Associate is no longer a login-time choice — it's a grant applied after
// login. The only selectable access levels are "user" and "admin".
const VALID_ROLES = ['user', 'admin'];

const normalizeLogin = (value = '') => value.trim().toLowerCase();

function signPortalToken(account) {
  return jwt.sign(
    {
      sub: account.id || account.username,
      username: account.username,
      role: account.role,
      displayName: account.displayName,
    },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

// POST /api/auth/login  ->  { token, username }
router.post('/login', async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid access level.' });
  }

  const requestedRole = role || null;
  const loginId = normalizeLogin(username);

  const admin = await Admin.findOne({ username });
  const adminRole = admin?.role || 'admin';
  if (admin && (!requestedRole || adminRole === requestedRole) && (await admin.verifyPassword(password))) {
    const account = {
      id: admin._id.toString(),
      username: admin.username,
      role: adminRole,
      displayName: admin.displayName || admin.username,
    };
    return res.json({ token: signPortalToken(account), ...account });
  }

  // Self-registered users (role "user"), optionally upgraded via an associate grant.
  if (!requestedRole || requestedRole === 'user') {
    const user = await User.findOne({ email: loginId });
    if (user && (await user.verifyPassword(password))) {
      const grant = await Associate.findOne({ email: loginId });
      const account = {
        id: user._id.toString(),
        username: user.email,
        role: grant ? 'associate' : 'user',
        displayName: user.displayName || user.email,
      };
      return res.json({ token: signPortalToken(account), ...account });
    }
  }

  return res.status(401).json({ error: 'Invalid credentials for the selected access level.' });
});

// POST /api/auth/register  -> create a self-service user account and sign them in.
router.post('/register', async (req, res) => {
  const { email, password, displayName } = req.body || {};
  const em = normalizeLogin(email || '');

  if (!em || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  // Reject if the email is already taken by an admin or a registered user.
  const [adminTaken, userTaken] = await Promise.all([
    Admin.findOne({ username: em }),
    User.findOne({ email: em }),
  ]);
  if (adminTaken || userTaken) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const user = await User.create({
    email: em,
    passwordHash: await User.hashPassword(password),
    displayName: String(displayName || '').trim() || em.split('@')[0],
  });

  // Honour an existing associate grant for this email.
  const grant = await Associate.findOne({ email: em });
  const account = {
    id: user._id.toString(),
    username: user.email,
    role: grant ? 'associate' : 'user',
    displayName: user.displayName,
  };
  res.status(201).json({ token: signPortalToken(account), ...account });
});

export default router;
