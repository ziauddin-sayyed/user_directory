const db = require('./db');
const { hashPassword } = require('./auth');

const [,, cmd, ...args] = process.argv;

function usage() {
  console.log(`Usage:
  node src/cli.js list              List all admin users
  node src/cli.js reset <username> <new-password>  Reset an admin's password
  `);
  process.exit(1);
}

if (!cmd) usage();

if (cmd === 'list') {
  const admins = db.prepare("SELECT id, username, email, role, created_at FROM users WHERE role = 'admin'").all();
  if (admins.length === 0) {
    console.log('No admin users found.');
  } else {
    console.table(admins);
  }
  process.exit(0);
}

if (cmd === 'reset') {
  const [username, password] = args;
  if (!username || !password) {
    console.error('Error: username and new password required.');
    usage();
  }
  const user = db.prepare("SELECT id, username, email, role FROM users WHERE username = ?").get(username);
  if (!user) {
    console.error(`Error: user "${username}" not found.`);
    process.exit(1);
  }
  if (user.role !== 'admin') {
    console.error(`Error: "${username}" is not an admin (role: ${user.role}).`);
    process.exit(1);
  }
  db.prepare("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?").run(hashPassword(password), user.id);
  console.log(`Password updated for admin "${username}" (id: ${user.id}).`);
  process.exit(0);
}

usage();
