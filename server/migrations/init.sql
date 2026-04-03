-- ============================================================
-- Vereinsinventar Datenbankschema
-- ============================================================

-- Benutzer
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'viewer',  -- 'admin', 'viewer'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Kategorien
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  icon VARCHAR(50) DEFAULT 'box',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Lagerhallen
CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Lagerplätze (innerhalb der Lagerhallen)
CREATE TABLE IF NOT EXISTS storage_locations (
  id SERIAL PRIMARY KEY,
  warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Gegenstände
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  quantity_available INTEGER DEFAULT 1,
  condition VARCHAR(50) DEFAULT 'gut',  -- 'neuwertig', 'sehr gut', 'gut', 'befriedigend', 'reparaturbedürftig'
  purchase_price DECIMAL(10,2),
  is_rentable BOOLEAN DEFAULT TRUE,
  daily_rate DECIMAL(10,2),
  weekend_rate DECIMAL(10,2),
  custom_rate DECIMAL(10,2),
  storage_location_id INTEGER REFERENCES storage_locations(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Artikelbilder
CREATE TABLE IF NOT EXISTS item_images (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  url VARCHAR(1000) NOT NULL,
  cloudinary_id VARCHAR(255),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bewegungshistorie (Umlagern)
CREATE TABLE IF NOT EXISTS item_movements (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  from_location_id INTEGER REFERENCES storage_locations(id) ON DELETE SET NULL,
  to_location_id INTEGER REFERENCES storage_locations(id) ON DELETE SET NULL,
  moved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  moved_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Verleihvorgänge
CREATE TABLE IF NOT EXISTS rentals (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES items(id) ON DELETE RESTRICT,
  borrower_name VARCHAR(255) NOT NULL,
  borrower_email VARCHAR(255),
  borrower_phone VARCHAR(100),
  borrower_address TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  quantity INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'reserviert',  -- 'reserviert', 'ausgeliehen', 'zurückgegeben', 'storniert'
  price_type VARCHAR(50) DEFAULT 'daily',   -- 'daily', 'weekend', 'custom', 'free'
  total_price DECIMAL(10,2),
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Indizes für Performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_storage_location ON items(storage_location_id);
CREATE INDEX IF NOT EXISTS idx_item_images_item ON item_images(item_id);
CREATE INDEX IF NOT EXISTS idx_item_movements_item ON item_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_rentals_item ON rentals(item_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_dates ON rentals(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_storage_locations_warehouse ON storage_locations(warehouse_id);

-- ============================================================
-- Standarddaten
-- ============================================================

-- Standard-Admin-Benutzer (Passwort: admin123 - bitte sofort ändern!)
INSERT INTO users (name, email, password_hash, role)
VALUES ('Administrator', 'admin@verein.de', '$2a$10$rOzlGbFMwCzGgdUFXfzaYeOlnl5Z0Yq2fQhAhNVBXJUXVKkAqEMxS', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Standardkategorien
INSERT INTO categories (name, description, color, icon) VALUES
  ('Zelte & Unterkünfte', 'Zelte, Pavillons, Holzhütten', '#f59e0b', 'home'),
  ('Möbel', 'Tische, Stühle, Bänke', '#10b981', 'layout'),
  ('Elektro', 'Kabel, Verteiler, Beleuchtung', '#3b82f6', 'zap'),
  ('Küche & Catering', 'Grills, Becher, Geschirr, Töpfe', '#ef4444', 'coffee'),
  ('Transport & Lagerung', 'IBC-Container, Paletten, Kisten', '#8b5cf6', 'package'),
  ('Veranstaltungstechnik', 'Lautsprecher, Mikrofone, Bühne', '#ec4899', 'music'),
  ('Werkzeug', 'Handwerkzeug, Maschinen', '#6b7280', 'tool'),
  ('Sonstiges', 'Weitere Gegenstände', '#9ca3af', 'more-horizontal')
ON CONFLICT (name) DO NOTHING;

-- Standard-Lagerhallen
INSERT INTO warehouses (name, address, description) VALUES
  ('Lagerhalle 1', 'Musterstraße 1, 12345 Musterstadt', 'Hauptlagerhalle des Vereins'),
  ('Lagerhalle 2', 'Nebenstraße 5, 12345 Musterstadt', 'Zweite Lagerhalle für Saisonartikel')
ON CONFLICT DO NOTHING;

-- Standard-Lagerplätze
INSERT INTO storage_locations (warehouse_id, name, description)
SELECT w.id, 'Eingangsbereich', 'Direkt beim Eingang'
FROM warehouses w WHERE w.name = 'Lagerhalle 1'
ON CONFLICT DO NOTHING;

INSERT INTO storage_locations (warehouse_id, name, description)
SELECT w.id, 'Regal A', 'Linkes Regalreihe'
FROM warehouses w WHERE w.name = 'Lagerhalle 1'
ON CONFLICT DO NOTHING;

INSERT INTO storage_locations (warehouse_id, name, description)
SELECT w.id, 'Regal B', 'Rechte Regalreihe'
FROM warehouses w WHERE w.name = 'Lagerhalle 1'
ON CONFLICT DO NOTHING;

INSERT INTO storage_locations (warehouse_id, name, description)
SELECT w.id, 'Hauptfläche', 'Große Gegenstände'
FROM warehouses w WHERE w.name = 'Lagerhalle 2'
ON CONFLICT DO NOTHING;

INSERT INTO storage_locations (warehouse_id, name, description)
SELECT w.id, 'Außenbereich', 'Überdachter Außenbereich'
FROM warehouses w WHERE w.name = 'Lagerhalle 2'
ON CONFLICT DO NOTHING;
