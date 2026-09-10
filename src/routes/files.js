const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../middleware');
const { upload, userUploadDir } = require('../uploads');
const { hashPassword, verifyPassword } = require('../auth');

const router = express.Router();

// List current user's files
router.get('/', requireAuth, (req, res) => {
  const files = db.prepare('SELECT * FROM files WHERE user_id = ? ORDER BY uploaded_at DESC').all(req.user.id);
  res.render('dashboard', { user: req.user, files, section: 'my-files' });
});

// Upload a file
router.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).render('error', { user: req.user, message: 'No file provided' });
  }
  db.prepare(
    'INSERT INTO files (user_id, original_name, stored_name, mime_type, size) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size);
  res.redirect('/dashboard');
});

// Download own file
router.get('/download/:id', requireAuth, (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!file) return res.status(404).render('error', { user: req.user, message: 'File not found' });
  res.download(path.join(userUploadDir(file.user_id), file.stored_name), file.original_name);
});

// Delete own file
router.post('/delete/:id', requireAuth, (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (file) {
    const p = path.join(userUploadDir(file.user_id), file.stored_name);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
  }
  res.redirect('/dashboard');
});

// Profile page
router.get('/profile', requireAuth, (req, res) => {
  res.render('profile', { user: req.user });
});

router.post('/profile', requireAuth, (req, res) => {
  const { current, next } = req.body || {};
  if (!current || !next) return res.status(400).render('error', { user: req.user, message: 'Both passwords required' });
  const full = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!verifyPassword(current, full.password)) {
    return res.status(400).render('error', { user: req.user, message: 'Current password is incorrect' });
  }
  db.prepare("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?").run(hashPassword(next), req.user.id);
  res.redirect('/dashboard/profile');
});

module.exports = router;
