require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Uploads-Ordner anlegen (Fallback ohne Cloudinary)
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Security & Performance Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? false
    : [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 300 }));

// Statische Dateien (lokale Uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/warehouses', require('./routes/warehouses'));
app.use('/api/items', require('./routes/items'));
app.use('/api/rentals', require('./routes/rentals'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api', require('./routes/import'));

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// React Frontend ausliefern (Produktion)
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Fehlerbehandlung
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Interner Serverfehler' });
});

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

module.exports = app;
