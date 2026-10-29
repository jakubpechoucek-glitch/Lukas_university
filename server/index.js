require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { runMigrations } = require('../db/migrate');
const { bootstrap } = require('../db/bootstrap');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET není nastavený (viz .env.example)');
}

const app = express();
// Render běží za proxy – bez toho by express-rate-limit nepoznal IP klienta (ERR_ERL_UNEXPECTED_X_FORWARDED_FOR).
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

runMigrations();
bootstrap();

app.use(cors({ origin: isDev ? 'http://localhost:5173' : false, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/fields', require('./routes/fields.routes'));
app.use('/api/import', require('./routes/import.routes'));
app.use('/api/catalog', require('./routes/catalog.routes'));
app.use('/api', require('./routes/student.routes'));

// Serve React in production
if (!isDev) {
  const staticPath = path.join(__dirname, 'public');
  app.use(express.static(staticPath));
  app.get('*', (req, res) => res.sendFile(path.join(staticPath, 'index.html')));
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🎓 Lukas University running on http://localhost:${PORT}`);
    if (isDev) console.log('   Frontend: http://localhost:5173');
  });
}

module.exports = app;
