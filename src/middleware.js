const db = require('./db');
const { verifyToken } = require('./auth');

function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(val);
  });
  return cookies;
}

function getCurrentUser(req) {
  const cookies = parseCookies(req);
  const token = cookies.token;
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(payload.id);
    return user || null;
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getCurrentUser(req);
  if (!user) {
    if (req.accepts('html')) return res.redirect('/login');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = getCurrentUser(req);
  if (!user) {
    if (req.accepts('html')) return res.redirect('/login');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (user.role !== 'admin') {
    if (req.accepts('html')) return res.status(403).render('error', { user, message: 'Admin access required' });
    return res.status(403).json({ error: 'Forbidden' });
  }
  req.user = user;
  next();
}

module.exports = { parseCookies, getCurrentUser, requireAuth, requireAdmin };
