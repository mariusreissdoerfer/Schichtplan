const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Verfügbarkeit prüfen (Helper)
async function checkAvailability(itemId, startDate, endDate, quantity, excludeRentalId = null) {
  const params = [itemId, startDate, endDate, 'storniert', 'zurückgegeben'];
  let excludeClause = '';
  if (excludeRentalId) {
    params.push(excludeRentalId);
    excludeClause = `AND id != $${params.length}`;
  }

  const { rows } = await db.query(
    `SELECT COALESCE(SUM(quantity), 0) AS reserved
     FROM rentals
     WHERE item_id = $1
       AND start_date <= $3 AND end_date >= $2
       AND status NOT IN ($4, $5)
       ${excludeClause}`,
    params
  );

  const { rows: itemRows } = await db.query('SELECT quantity FROM items WHERE id = $1', [itemId]);
  if (!itemRows[0]) return { available: false, reason: 'Gegenstand nicht gefunden' };

  const reserved = parseInt(rows[0].reserved);
  const total = itemRows[0].quantity;
  const available = total - reserved;

  return {
    available: available >= quantity,
    available_quantity: available,
    total_quantity: total,
    reserved_quantity: reserved,
  };
};

// Alle Verleihvorgänge
router.get('/', requireAuth, async (req, res) => {
  const { status, item_id, page = 1, limit = 50, upcoming } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`r.status = $${params.length}`);
  }
  if (item_id) {
    params.push(item_id);
    conditions.push(`r.item_id = $${params.length}`);
  }
  if (upcoming === 'true') {
    conditions.push(`r.start_date >= CURRENT_DATE AND r.status = 'reserviert'`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);

  try {
    const { rows } = await db.query(
      `SELECT r.*, i.name AS item_name, i.daily_rate, i.weekend_rate,
        u.name AS created_by_name
       FROM rentals r
       JOIN items i ON i.id = r.item_id
       LEFT JOIN users u ON u.id = r.created_by
       ${where}
       ORDER BY r.start_date DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countParams = params.slice(0, params.length - 2);
    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) FROM rentals r ${where}`,
      countParams
    );

    res.json({
      rentals: rows,
      total: parseInt(countRows[0].count),
      page: parseInt(page),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Verfügbarkeit eines Gegenstands prüfen
router.get('/availability', requireAuth, async (req, res) => {
  const { item_id, start_date, end_date, quantity = 1, exclude_rental_id } = req.query;
  if (!item_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'item_id, start_date, end_date erforderlich' });
  }

  try {
    const result = await checkAvailability(item_id, start_date, end_date, parseInt(quantity), exclude_rental_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Verleihvorgang anlegen
router.post('/', requireAuth, async (req, res) => {
  const {
    item_id, borrower_name, borrower_email, borrower_phone,
    borrower_address, start_date, end_date, quantity = 1,
    price_type = 'daily', total_price, notes,
  } = req.body;

  if (!item_id || !borrower_name || !start_date || !end_date) {
    return res.status(400).json({ error: 'Pflichtfelder fehlen' });
  }
  if (new Date(end_date) < new Date(start_date)) {
    return res.status(400).json({ error: 'Enddatum vor Startdatum' });
  }

  try {
    const { rows: itemRows } = await db.query('SELECT * FROM items WHERE id = $1', [item_id]);
    if (!itemRows[0]) return res.status(404).json({ error: 'Gegenstand nicht gefunden' });
    if (!itemRows[0].is_rentable) return res.status(400).json({ error: 'Gegenstand nicht verleihbar' });

    const avail = await checkAvailability(item_id, start_date, end_date, parseInt(quantity));
    if (!avail.available) {
      return res.status(409).json({
        error: `Nicht genug verfügbar. Verfügbar: ${avail.available_quantity}, Angefragt: ${quantity}`,
        available_quantity: avail.available_quantity,
      });
    }

    // Preis berechnen wenn nicht angegeben
    let calculatedPrice = total_price;
    if (!calculatedPrice && price_type !== 'custom' && price_type !== 'free') {
      const item = itemRows[0];
      const days = Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)) + 1;
      if (price_type === 'weekend' && item.weekend_rate) {
        calculatedPrice = item.weekend_rate * quantity;
      } else if (item.daily_rate) {
        calculatedPrice = item.daily_rate * days * quantity;
      }
    }

    const { rows } = await db.query(
      `INSERT INTO rentals (item_id, borrower_name, borrower_email, borrower_phone,
        borrower_address, start_date, end_date, quantity, price_type, total_price, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        item_id, borrower_name.trim(), borrower_email, borrower_phone,
        borrower_address, start_date, end_date, parseInt(quantity),
        price_type, calculatedPrice || null, notes, req.user.id,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Verleihvorgang aktualisieren
router.put('/:id', requireAuth, async (req, res) => {
  const {
    borrower_name, borrower_email, borrower_phone, borrower_address,
    start_date, end_date, quantity, status, price_type, total_price, notes,
  } = req.body;

  try {
    const { rows: current } = await db.query('SELECT * FROM rentals WHERE id = $1', [req.params.id]);
    if (!current[0]) return res.status(404).json({ error: 'Nicht gefunden' });

    const r = current[0];
    const newStart = start_date || r.start_date;
    const newEnd = end_date || r.end_date;
    const newQty = quantity ? parseInt(quantity) : r.quantity;
    const newStatus = status || r.status;

    // Verfügbarkeit nur prüfen wenn Datum/Menge geändert und nicht storniert/zurückgegeben
    if ((start_date || end_date || quantity) && !['storniert', 'zurückgegeben'].includes(newStatus)) {
      const avail = await checkAvailability(r.item_id, newStart, newEnd, newQty, parseInt(req.params.id));
      if (!avail.available) {
        return res.status(409).json({
          error: `Nicht verfügbar. Verfügbar: ${avail.available_quantity}`,
        });
      }
    }

    const { rows } = await db.query(
      `UPDATE rentals SET
        borrower_name = COALESCE($1, borrower_name),
        borrower_email = COALESCE($2, borrower_email),
        borrower_phone = COALESCE($3, borrower_phone),
        borrower_address = COALESCE($4, borrower_address),
        start_date = COALESCE($5, start_date),
        end_date = COALESCE($6, end_date),
        quantity = COALESCE($7, quantity),
        status = COALESCE($8, status),
        price_type = COALESCE($9, price_type),
        total_price = COALESCE($10, total_price),
        notes = COALESCE($11, notes),
        updated_at = NOW()
       WHERE id = $12 RETURNING *`,
      [
        borrower_name, borrower_email, borrower_phone, borrower_address,
        start_date, end_date, quantity ? parseInt(quantity) : null,
        status, price_type, total_price, notes, req.params.id,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Verleihvorgang löschen
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM rentals WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json({ message: 'Gelöscht' });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;
