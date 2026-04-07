const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'vereinsinventar',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
  },
});

// Fallback: lokaler Speicher wenn kein Cloudinary konfiguriert
const localStorageFallback = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

function getStorage() {
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
    return storage;
  }
  return localStorageFallback;
}

const upload = multer({
  storage: getStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilder erlaubt'));
    }
  },
});

// Bild hochladen
router.post('/items/:itemId/images', requireAuth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Kein Bild hochgeladen' });

  try {
    const { rows: existing } = await db.query(
      'SELECT COUNT(*) FROM item_images WHERE item_id = $1',
      [req.params.itemId]
    );
    const isPrimary = parseInt(existing[0].count) === 0;

    const url = req.file.path || req.file.url || `/uploads/${req.file.filename}`;
    const cloudinaryId = req.file.filename || req.file.public_id || null;

    const { rows } = await db.query(
      `INSERT INTO item_images (item_id, url, cloudinary_id, is_primary)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.itemId, url, cloudinaryId, isPrimary]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Bild als Hauptbild setzen
router.put('/items/:itemId/images/:imageId/primary', requireAuth, async (req, res) => {
  try {
    await db.query('UPDATE item_images SET is_primary = FALSE WHERE item_id = $1', [req.params.itemId]);
    await db.query('UPDATE item_images SET is_primary = TRUE WHERE id = $1', [req.params.imageId]);
    res.json({ message: 'Hauptbild gesetzt' });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Bild löschen
router.delete('/items/:itemId/images/:imageId', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM item_images WHERE id = $1 AND item_id = $2',
      [req.params.imageId, req.params.itemId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Bild nicht gefunden' });

    if (rows[0].cloudinary_id && process.env.CLOUDINARY_CLOUD_NAME) {
      await cloudinary.uploader.destroy(rows[0].cloudinary_id);
    }

    await db.query('DELETE FROM item_images WHERE id = $1', [req.params.imageId]);

    // Nächstes Bild als Hauptbild setzen
    if (rows[0].is_primary) {
      await db.query(
        'UPDATE item_images SET is_primary = TRUE WHERE item_id = $1 ORDER BY created_at LIMIT 1',
        [req.params.itemId]
      );
    }

    res.json({ message: 'Gelöscht' });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;
