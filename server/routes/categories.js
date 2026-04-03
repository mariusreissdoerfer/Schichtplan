const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*, COUNT(i.id) AS item_count
       FROM categories c
       LEFT JOIN items i ON i.category_id = c.id
       GROUP BY c.id
       ORDER BY c.name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, description, color, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Name erforderlich' });
  try {
    const { rows } = await db.query(
      `INSERT INTO categories (name, description, color, icon)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), description, color || '#6366f1', icon || 'box']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Kategorie bereits vorhanden' });
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { name, description, color, icon } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE categories SET name = COALESCE($1, name), description = COALESCE($2, description),
       color = COALESCE($3, color), icon = COALESCE($4, icon)
       WHERE id = $5 RETURNING *`,
      [name, description, color, icon, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json({ message: 'Gelöscht' });
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: 'Kategorie wird noch verwendet' });
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;
