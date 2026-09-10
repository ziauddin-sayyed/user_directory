const path = require('path');
const express = require('express');
const db = require('./db');
const { getCurrentUser } = require('./middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res, next) => {
  res.locals.user = getCurrentUser(req);
  next();
});

app.get('/', (req, res) => {
  if (res.locals.user) return res.redirect('/dashboard');
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (res.locals.user) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

app.get('/register', (req, res) => {
  if (res.locals.user) return res.redirect('/dashboard');
  res.render('register', { error: null });
});

app.use('/auth', require('./routes/auth'));
app.get('/dashboard', require('./middleware').requireAuth, (req, res) => {
  const files = db.prepare('SELECT * FROM files WHERE user_id = ? ORDER BY uploaded_at DESC').all(req.user.id);
  res.render('dashboard', { user: req.user, files, section: 'my-files' });
});
app.use('/dashboard', require('./routes/files'));
app.use('/admin', require('./routes/admin'));

app.use((req, res) => {
  res.status(404).render('error', { user: res.locals.user, message: 'Page not found' });
});

app.listen(PORT, () => {
  console.log(`File manager running at http://localhost:${PORT}`);
});

module.exports = app;
