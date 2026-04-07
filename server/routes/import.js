const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// CSV-Import
// Erwartete Spalten: name, beschreibung, kategorie, menge, zustand, einkaufspreis,
//                    verleihbar, tagespreis, wochenendpreis, lagerplatz, lagerartikelort, notizen
router.post('/csv', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });

  const results = [];
  const errors = [];
  let row = 0;

  try {
    await new Promise((resolve, reject) => {
      const stream = Readable.from(req.file.buffer.toString());
      stream
        .pipe(csv({ separator: req.body.separator || ',', mapHeaders: ({ header }) => header.trim().toLowerCase() }))
        .on('data', (data) => results.push({ ...data, _row: ++row }))
        .on('end', resolve)
        .on('error', reject);
    });

    if (results.length === 0) {
      return res.status(400).json({ error: 'CSV-Datei ist leer oder hat falsches Format' });
    }

    // Kategorien und Lagerplätze voraufladen
    const { rows: categories } = await db.query('SELECT * FROM categories');
    const { rows: locations } = await db.query(
      `SELECT sl.*, w.name AS warehouse_name FROM storage_locations sl JOIN warehouses w ON w.id = sl.warehouse_id`
    );

    const catMap = Object.fromEntries(categories.map(c => [c.name.toLowerCase(), c.id]));
    const locMap = Object.fromEntries(locations.map(l => [l.name.toLowerCase(), l.id]));

    const imported = [];
    const skipped = [];

    for (const r of results) {
      try {
        const name = r.name || r.bezeichnung || r.artikel;
        if (!name) {
          skipped.push({ row: r._row, reason: 'Kein Name' });
          continue;
        }

        // Kategorie anlegen falls nicht vorhanden
        let categoryId = null;
        if (r.kategorie) {
          const catKey = r.kategorie.trim().toLowerCase();
          if (catMap[catKey]) {
            categoryId = catMap[catKey];
          } else {
            const { rows: newCat } = await db.query(
              'INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
              [r.kategorie.trim()]
            );
            categoryId = newCat[0].id;
            catMap[catKey] = categoryId;
          }
        }

        // Lagerplatz suchen
        let locationId = null;
        if (r.lagerplatz || r.lagerort) {
          const locKey = (r.lagerplatz || r.lagerort).trim().toLowerCase();
          locationId = locMap[locKey] || null;
        }

        const { rows } = await db.query(
          `INSERT INTO items (name, description, category_id, quantity, quantity_available,
            condition, purchase_price, is_rentable, daily_rate, weekend_rate, storage_location_id, notes)
           VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,$10,$11)
           RETURNING id, name`,
          [
            name.trim(),
            r.beschreibung || r.description || null,
            categoryId,
            parseInt(r.menge || r.quantity || r.anzahl) || 1,
            r.zustand || r.condition || 'gut',
            parseFloat((r.einkaufspreis || r.preis || '').replace(',', '.')) || null,
            (r.verleihbar || r.rentable || 'ja').toLowerCase() !== 'nein',
            parseFloat((r.tagespreis || r.daily_rate || '').replace(',', '.')) || null,
            parseFloat((r.wochenendpreis || r.weekend_rate || '').replace(',', '.')) || null,
            locationId,
            r.notizen || r.notes || null,
          ]
        );
        imported.push(rows[0]);
      } catch (err) {
        skipped.push({ row: r._row, name: r.name, reason: err.message });
      }
    }

    res.json({
      message: `Import abgeschlossen: ${imported.length} importiert, ${skipped.length} übersprungen`,
      imported_count: imported.length,
      skipped_count: skipped.length,
      imported,
      skipped,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim CSV-Import: ' + err.message });
  }
});

// CSV-Vorlage herunterladen
router.get('/template', requireAdmin, (req, res) => {
  const template = [
    'name,beschreibung,kategorie,menge,zustand,einkaufspreis,verleihbar,tagespreis,wochenendpreis,lagerplatz,notizen',
    'Festzelt 6x12m,Weißes Festzelt mit Seitenwänden,Zelte & Unterkünfte,1,gut,1200.00,ja,50.00,80.00,Regal A,',
    'Biertische Set,Set mit 4 Tischen und 8 Bänken,Möbel,5,gut,80.00,ja,10.00,15.00,Regal B,',
    'Verlängerungskabel 50m,Orange 16A,Elektro,3,sehr gut,45.00,ja,5.00,,Eingangsbereich,',
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="inventar-vorlage.csv"');
  res.send('\uFEFF' + template); // BOM für Excel
});

// Dashboard-Statistiken
router.get('/stats', async (req, res) => {
  try {
    const [items, rentals, categories, warehouses] = await Promise.all([
      db.query('SELECT COUNT(*) AS total, SUM(quantity) AS total_qty, SUM(purchase_price * quantity) AS total_value FROM items'),
      db.query(`SELECT
        COUNT(*) FILTER (WHERE status = 'reserviert') AS reserved,
        COUNT(*) FILTER (WHERE status = 'ausgeliehen') AS active,
        COUNT(*) FILTER (WHERE status = 'zurückgegeben') AS returned,
        COUNT(*) AS total FROM rentals`),
      db.query('SELECT COUNT(*) AS total FROM categories'),
      db.query('SELECT COUNT(*) AS total FROM warehouses'),
    ]);

    res.json({
      items: {
        total: parseInt(items.rows[0].total),
        total_quantity: parseInt(items.rows[0].total_qty) || 0,
        total_value: parseFloat(items.rows[0].total_value) || 0,
      },
      rentals: {
        reserved: parseInt(rentals.rows[0].reserved),
        active: parseInt(rentals.rows[0].active),
        returned: parseInt(rentals.rows[0].returned),
        total: parseInt(rentals.rows[0].total),
      },
      categories: parseInt(categories.rows[0].total),
      warehouses: parseInt(warehouses.rows[0].total),
    });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;
