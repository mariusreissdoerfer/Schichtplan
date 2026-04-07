const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Alle Gegenstände mit Filter/Suche
router.get('/', requireAuth, async (req, res) => {
  const {
    search, category_id, storage_location_id, warehouse_id,
    condition, is_rentable, page = 1, limit = 50,
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(i.name ILIKE $${params.length} OR i.description ILIKE $${params.length})`);
  }
  if (category_id) {
    params.push(category_id);
    conditions.push(`i.category_id = $${params.length}`);
  }
  if (storage_location_id) {
    params.push(storage_location_id);
    conditions.push(`i.storage_location_id = $${params.length}`);
  }
  if (warehouse_id) {
    params.push(warehouse_id);
    conditions.push(`sl.warehouse_id = $${params.length}`);
  }
  if (condition) {
    params.push(condition);
    conditions.push(`i.condition = $${params.length}`);
  }
  if (is_rentable !== undefined) {
    params.push(is_rentable === 'true');
    conditions.push(`i.is_rentable = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    params.push(parseInt(limit), offset);
    const { rows } = await db.query(
      `SELECT i.*,
        c.name AS category_name, c.color AS category_color, c.icon AS category_icon,
        sl.name AS location_name, sl.id AS location_id,
        w.name AS warehouse_name, w.id AS warehouse_id,
        (SELECT url FROM item_images WHERE item_id = i.id AND is_primary = TRUE LIMIT 1) AS primary_image,
        (SELECT COUNT(*) FROM item_images WHERE item_id = i.id) AS image_count
       FROM items i
       LEFT JOIN categories c ON c.id = i.category_id
       LEFT JOIN storage_locations sl ON sl.id = i.storage_location_id
       LEFT JOIN warehouses w ON w.id = sl.warehouse_id
       ${where}
       ORDER BY i.name
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countParams = params.slice(0, params.length - 2);
    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) FROM items i
       LEFT JOIN storage_locations sl ON sl.id = i.storage_location_id
       ${where}`,
      countParams
    );

    res.json({
      items: rows,
      total: parseInt(countRows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Einzelnen Gegenstand abrufen
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT i.*,
        c.name AS category_name, c.color AS category_color,
        sl.name AS location_name, w.name AS warehouse_name, w.id AS warehouse_id
       FROM items i
       LEFT JOIN categories c ON c.id = i.category_id
       LEFT JOIN storage_locations sl ON sl.id = i.storage_location_id
       LEFT JOIN warehouses w ON w.id = sl.warehouse_id
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Nicht gefunden' });

    const { rows: images } = await db.query(
      'SELECT * FROM item_images WHERE item_id = $1 ORDER BY is_primary DESC, created_at',
      [req.params.id]
    );

    const { rows: movements } = await db.query(
      `SELECT m.*, u.name AS moved_by_name,
        fl.name AS from_location_name, fw.name AS from_warehouse_name,
        tl.name AS to_location_name, tw.name AS to_warehouse_name
       FROM item_movements m
       LEFT JOIN users u ON u.id = m.moved_by
       LEFT JOIN storage_locations fl ON fl.id = m.from_location_id
       LEFT JOIN warehouses fw ON fw.id = fl.warehouse_id
       LEFT JOIN storage_locations tl ON tl.id = m.to_location_id
       LEFT JOIN warehouses tw ON tw.id = tl.warehouse_id
       WHERE m.item_id = $1
       ORDER BY m.moved_at DESC`,
      [req.params.id]
    );

    const { rows: rentals } = await db.query(
      `SELECT id, borrower_name, start_date, end_date, quantity, status, total_price
       FROM rentals WHERE item_id = $1 ORDER BY start_date DESC LIMIT 10`,
      [req.params.id]
    );

    res.json({ ...rows[0], images, movements, recent_rentals: rentals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Gegenstand anlegen
router.post('/', requireAdmin, async (req, res) => {
  const {
    name, description, category_id, quantity, condition,
    purchase_price, is_rentable, daily_rate, weekend_rate,
    custom_rate, storage_location_id, notes,
  } = req.body;

  if (!name) return res.status(400).json({ error: 'Name erforderlich' });

  try {
    const { rows } = await db.query(
      `INSERT INTO items (name, description, category_id, quantity, quantity_available,
        condition, purchase_price, is_rentable, daily_rate, weekend_rate, custom_rate,
        storage_location_id, notes)
       VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        name.trim(), description, category_id || null, parseInt(quantity) || 1,
        condition || 'gut', purchase_price || null,
        is_rentable !== false, daily_rate || null, weekend_rate || null,
        custom_rate || null, storage_location_id || null, notes,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Gegenstand aktualisieren
router.put('/:id', requireAdmin, async (req, res) => {
  const {
    name, description, category_id, quantity, condition,
    purchase_price, is_rentable, daily_rate, weekend_rate,
    custom_rate, storage_location_id, notes,
  } = req.body;

  try {
    // Prüfen ob Umlagern nötig
    const { rows: current } = await db.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
    if (!current[0]) return res.status(404).json({ error: 'Nicht gefunden' });

    const old = current[0];

    const { rows } = await db.query(
      `UPDATE items SET
        name = COALESCE($1, name), description = COALESCE($2, description),
        category_id = COALESCE($3, category_id), quantity = COALESCE($4, quantity),
        condition = COALESCE($5, condition), purchase_price = COALESCE($6, purchase_price),
        is_rentable = COALESCE($7, is_rentable), daily_rate = COALESCE($8, daily_rate),
        weekend_rate = COALESCE($9, weekend_rate), custom_rate = COALESCE($10, custom_rate),
        storage_location_id = COALESCE($11, storage_location_id), notes = COALESCE($12, notes),
        updated_at = NOW()
       WHERE id = $13 RETURNING *`,
      [
        name, description, category_id, quantity ? parseInt(quantity) : null,
        condition, purchase_price, is_rentable, daily_rate, weekend_rate,
        custom_rate, storage_location_id, notes, req.params.id,
      ]
    );

    // Bewegungshistorie wenn Lagerort geändert
    if (storage_location_id && storage_location_id != old.storage_location_id) {
      await db.query(
        `INSERT INTO item_movements (item_id, from_location_id, to_location_id, moved_by)
         VALUES ($1, $2, $3, $4)`,
        [req.params.id, old.storage_location_id, storage_location_id, req.user.id]
      );
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Gegenstand löschen
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT COUNT(*) FROM rentals
       WHERE item_id = $1 AND status NOT IN ('zurückgegeben', 'storniert')`,
      [req.params.id]
    );
    if (parseInt(rows[0].count) > 0) {
      return res.status(409).json({ error: 'Gegenstand hat aktive Verleihvorgänge' });
    }

    const { rowCount } = await db.query('DELETE FROM items WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json({ message: 'Gelöscht' });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Umlagern
router.post('/:id/move', requireAuth, async (req, res) => {
  const { to_location_id, notes } = req.body;
  if (!to_location_id) return res.status(400).json({ error: 'Ziel-Lagerplatz erforderlich' });

  try {
    const { rows: current } = await db.query('SELECT storage_location_id FROM items WHERE id = $1', [req.params.id]);
    if (!current[0]) return res.status(404).json({ error: 'Nicht gefunden' });

    await db.query(
      'UPDATE items SET storage_location_id = $1, updated_at = NOW() WHERE id = $2',
      [to_location_id, req.params.id]
    );
    await db.query(
      `INSERT INTO item_movements (item_id, from_location_id, to_location_id, moved_by, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.params.id, current[0].storage_location_id, to_location_id, req.user.id, notes]
    );
    res.json({ message: 'Umgelagert' });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;
