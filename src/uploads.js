const path = require('path');
const fs = require('fs');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(UPLOAD_ROOT, String(req.user.id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = Buffer.from(file.originalname + Date.now() + Math.random()).toString('hex').slice(0, 32);
    cb(null, base + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

function userUploadDir(userId) {
  return path.join(UPLOAD_ROOT, String(userId));
}

module.exports = { upload, UPLOAD_ROOT, userUploadDir };
