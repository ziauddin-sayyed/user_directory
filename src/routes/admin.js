const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAdmin } = require('../middleware');
const { hashPassword, randomToken } = require('../auth');
const { userUploadDir } = require('../uploads');

const router = express.Router();

// List all users
router.get('/users', requireAdmin, (req, res) => {
  const users = db
    .prepare('SELECT id, username, email, role, created_at FROM users ORDER BY id')
    .all();
  const fileCounts = db.prepare('SELECT user_id, COUNT(*) AS c FROM files GROUP BY user_id').all();
  const counts = Object.fromEntries(fileCounts.map((r) => [r.user_id, r.c]));
  res.render('admin-users', { user: req.user, users, counts });
});

// Create user
router.post('/users', requireAdmin, (req, res) => {
  const { username, email, password, role } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).render('error', { user: req.user, message: 'Username, email and password required' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (exists) {
    return res.status(409).render('error', { user: req.user, message: 'Username or email already taken' });
  }
  db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)').run(
    username,
    email,
    hashPassword(password),
    role === 'admin' ? 'admin' : 'user'
  );
  res.redirect('/admin/users');
});

// Update user (username/email/role)
router.post('/users/:id', requireAdmin, (req, res) => {
  const { username, email, role } = req.body || {};
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).render('error', { user: req.user, message: 'User not found' });
  // Prevent admin from demoting the last admin
  if (target.role === 'admin' && role !== 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
    if (adminCount <= 1) {
      return res.status(400).render('error', { user: req.user, message: 'Cannot remove the last admin' });
    }
  }
  db.prepare("UPDATE users SET username = ?, email = ?, role = ?, updated_at = datetime('now') WHERE id = ?").run(
    username || target.username,
    email || target.email,
    role === 'admin' ? 'admin' : 'user',
    target.id
  );
  res.redirect('/admin/users');
});

// Reset password
router.post('/users/:id/reset-password', requireAdmin, (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).render('error', { user: req.user, message: 'New password required' });
  db.prepare("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?").run(
    hashPassword(password),
    req.params.id
  );
  res.redirect('/admin/users');
});

// Delete user (and their files)
router.post('/users/:id/delete', requireAdmin, (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).render('error', { user: req.user, message: 'User not found' });
  if (target.role === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
    if (adminCount <= 1) {
      return res.status(400).render('error', { user: req.user, message: 'Cannot delete the last admin' });
    }
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  const dir = userUploadDir(target.id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  res.redirect('/admin/users');
});

// ---- Admin: view all users' files ----
router.get('/files', requireAdmin, (req, res) => {
  const { user_id } = req.query;
  const users = db.prepare('SELECT id, username FROM users ORDER BY username').all();
  let files;
  if (user_id && user_id !== 'all') {
    files = db
      .prepare(
        `SELECT f.*, u.username FROM files f JOIN users u ON u.id = f.user_id WHERE f.user_id = ? ORDER BY f.uploaded_at DESC`
      )
      .all(user_id);
  } else {
    files = db
      .prepare(
        `SELECT f.*, u.username FROM files f JOIN users u ON u.id = f.user_id ORDER BY f.uploaded_at DESC`
      )
      .all();
  }
  res.render('admin-files', { user: req.user, files, users, filterUser: user_id || 'all' });
});

router.get('/files/:id/download', requireAdmin, (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).render('error', { user: req.user, message: 'File not found' });
  res.download(path.join(userUploadDir(file.user_id), file.stored_name), file.original_name);
});

router.post('/files/:id/delete', requireAdmin, (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (file) {
    const p = path.join(userUploadDir(file.user_id), file.stored_name);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
  }
  res.redirect('/admin/files');
});

module.exports = router;
