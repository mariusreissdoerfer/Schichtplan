const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
  }

  try {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
      [email.toLowerCase().trim()]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Aktuellen Benutzer abrufen
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Passwort ändern
router.put('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Ungültige Eingaben (min. 6 Zeichen)' });
  }

  try {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];

    if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
      return res.status(401).json({ error: 'Aktuelles Passwort falsch' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hash, req.user.id]
    );
    res.json({ message: 'Passwort geändert' });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Alle Benutzer (Admin)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Benutzer anlegen (Admin)
router.post('/users', requireAdmin, async (req, res) => {
  const { name, email, password, role = 'viewer' } = req.body;
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Ungültige Eingaben' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.toLowerCase().trim(), hash, role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'E-Mail bereits vergeben' });
    }
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Benutzer aktualisieren (Admin)
router.put('/users/:id', requireAdmin, async (req, res) => {
  const { name, email, role, is_active } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email),
       role = COALESCE($3, role), is_active = COALESCE($4, is_active), updated_at = NOW()
       WHERE id = $5 RETURNING id, name, email, role, is_active`,
      [name, email, role, is_active, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;
