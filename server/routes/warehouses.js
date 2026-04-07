const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Alle Lagerhallen mit Lagerplätzen
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows: warehouses } = await db.query('SELECT * FROM warehouses ORDER BY name');
    const { rows: locations } = await db.query(
      `SELECT sl.*, COUNT(i.id) AS item_count
       FROM storage_locations sl
       LEFT JOIN items i ON i.storage_location_id = sl.id
       GROUP BY sl.id ORDER BY sl.name`
    );

    const result = warehouses.map(w => ({
      ...w,
      locations: locations.filter(l => l.warehouse_id === w.id),
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Lagerhalle anlegen
router.post('/', requireAdmin, async (req, res) => {
  const { name, address, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name erforderlich' });
  try {
    const { rows } = await db.query(
      'INSERT INTO warehouses (name, address, description) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), address, description]
    );
    res.status(201).json({ ...rows[0], locations: [] });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Lagerhalle aktualisieren
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, address, description } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE warehouses SET name = COALESCE($1, name), address = COALESCE($2, address),
       description = COALESCE($3, description), updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [name, address, description, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Lagerhalle löschen
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM warehouses WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json({ message: 'Gelöscht' });
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: 'Lagerplätze noch vorhanden' });
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Lagerplatz anlegen
router.post('/:warehouseId/locations', requireAdmin, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name erforderlich' });
  try {
    const { rows } = await db.query(
      'INSERT INTO storage_locations (warehouse_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [req.params.warehouseId, name.trim(), description]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Lagerplatz aktualisieren
router.put('/locations/:id', requireAdmin, async (req, res) => {
  const { name, description } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE storage_locations SET name = COALESCE($1, name), description = COALESCE($2, description)
       WHERE id = $3 RETURNING *`,
      [name, description, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Lagerplatz löschen
router.delete('/locations/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM storage_locations WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json({ message: 'Gelöscht' });
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: 'Lagerplatz noch in Verwendung' });
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;
