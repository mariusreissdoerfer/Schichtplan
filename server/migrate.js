require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', 'init.sql'),
    'utf8'
  );

  try {
    console.log('Starte Datenbankmigrierung...');
    await pool.query(sql);
    console.log('Migrierung erfolgreich abgeschlossen.');
  } catch (err) {
    console.error('Fehler bei der Migrierung:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
