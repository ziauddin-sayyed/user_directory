const db = require('./db');
const { hashPassword } = require('./auth');

const username = process.env.ADMIN_USER || 'admin';
const email = process.env.ADMIN_EMAIL || 'admin@example.com';
const password = process.env.ADMIN_PASS || 'admin123';

const exists = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
if (exists) {
  console.log('Admin already exists, skipping.');
} else {
  db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)').run(
    username,
    email,
    hashPassword(password),
    'admin'
  );
  console.log(`Created admin user: ${email} / ${password}`);
}
process.exit(0);
