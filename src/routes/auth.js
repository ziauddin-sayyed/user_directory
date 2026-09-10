const express = require('express');
const db = require('../db');
const { hashPassword, verifyPassword, signToken } = require('../auth');
const { getCurrentUser } = require('../middleware');

const router = express.Router();

router.post('/register', (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).render('error', { user: null, message: 'Username, email and password required' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (exists) {
    return res.status(409).render('error', { user: null, message: 'Username or email already taken' });
  }
  const role = 'user';
  const info = db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)').run(
    username,
    email,
    hashPassword(password),
    role
  );
  const token = signToken({ id: info.lastInsertRowid, username, role });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
  res.redirect('/dashboard');
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).render('error', { user: null, message: 'Invalid credentials' });
  }
  const token = signToken(user);
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
  res.redirect('/dashboard');
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

router.post('/change-password', (req, res) => {
  const user = getCurrentUser(req);
  if (!user) return res.redirect('/login');
  const { current, next } = req.body || {};
  const full = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  if (!verifyPassword(current, full.password)) {
    return res.status(400).render('error', { user, message: 'Current password is incorrect' });
  }
  db.prepare("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?").run(hashPassword(next), user.id);
  res.redirect('/dashboard');
});

module.exports = router;
