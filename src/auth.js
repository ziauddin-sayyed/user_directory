const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_TTL = '7d';

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function randomToken() {
  return crypto.randomBytes(24).toString('hex');
}

module.exports = { JWT_SECRET, hashPassword, verifyPassword, signToken, verifyToken, randomToken };
