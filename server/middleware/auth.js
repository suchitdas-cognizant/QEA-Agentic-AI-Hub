import jwt from 'jsonwebtoken';

/**
 * Factory: Express middleware requiring a valid JWT whose role is in `allowed`.
 * An empty `allowed` list means "any authenticated user".
 * Usage: router.get('/', requireRoles('admin', 'associate'), handler)
 */
export function requireRoles(...allowed) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (allowed.length && !allowed.includes(payload.role)) {
        return res.status(403).json({ error: 'You do not have access to this resource.' });
      }
      req.admin = { id: payload.sub, username: payload.username, role: payload.role };
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
  };
}

/** Admin only — agent CRUD, deletions. */
export const requireAdmin = requireRoles('admin');

/** Staff (admin or associate) — can view and review agent requests. */
export const requireStaff = requireRoles('admin', 'associate');

/** Any authenticated user (user, associate or admin). */
export const requireAuth = requireRoles();
