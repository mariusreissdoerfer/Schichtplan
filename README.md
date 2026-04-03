# Vereinsinventar

Webbasierte Inventar- und Verleihverwaltung für Bürgervereine.  
**Mobile-first** — optimiert für die Nutzung auf dem Smartphone.

## Features

- **Inventar**: Gegenstände anlegen, bearbeiten, filtern (mit Bildern)
- **Lager**: Zwei Lagerhallen mit definierbaren Lagerplätzen, Bewegungshistorie
- **Verleih**: Verleihvorgänge mit Verfügbarkeitsprüfung, Preismodellen (Tag/Wochenende/individuell)
- **CSV-Import**: Bestehende Excel-Listen importieren
- **Rollen**: Admin (voller Zugriff) & Betrachter (nur lesen)

## Tech-Stack

- **Backend**: Node.js + Express
- **Datenbank**: PostgreSQL
- **Frontend**: React + Tailwind CSS (Vite)
- **Bilder**: Cloudinary (optional, Fallback lokal)

## Schnellstart (lokal)

### Voraussetzungen
- Node.js 18+
- PostgreSQL

### Setup

```bash
# 1. Repository klonen
git clone https://github.com/mariusreissdoerfer/schichtplan.git
cd schichtplan

# 2. Abhängigkeiten installieren
npm install
cd client && npm install && cd ..

# 3. Umgebungsvariablen konfigurieren
cp .env.example .env
# .env anpassen: DATABASE_URL und JWT_SECRET setzen

# 4. Datenbank erstellen und Schema einrichten
createdb vereinsinventar
npm run migrate

# 5. Entwicklungsserver starten
npm run dev
```

Die App läuft dann auf:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Standard-Login
- **E-Mail**: `admin@verein.de`
- **Passwort**: `admin123`
- Bitte sofort nach dem ersten Login unter Benutzer > Passwort ändern!

## Umgebungsvariablen (.env)

| Variable | Beschreibung | Pflicht |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL-URL z.B. `postgresql://user:pw@localhost/vereinsinventar` | Ja |
| `JWT_SECRET` | Beliebiger geheimer Schlüssel | Ja |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary für Bild-Upload | Nein |
| `CLOUDINARY_API_KEY` | Cloudinary API-Key | Nein |
| `CLOUDINARY_API_SECRET` | Cloudinary API-Secret | Nein |

Ohne Cloudinary werden Bilder lokal im Ordner `uploads/` gespeichert.

## CSV-Import

Vorlage herunterladen unter: **Menü → Import → Vorlage herunterladen**

Spalten: `name, beschreibung, kategorie, menge, zustand, einkaufspreis, verleihbar, tagespreis, wochenendpreis, lagerplatz, notizen`

Excel-Tipp: Als CSV mit Semikolon exportieren und beim Import "Semikolon" als Trennzeichen wählen.

## Benutzerrollen

| Funktion | Betrachter | Admin |
|----------|:----------:|:-----:|
| Inventar & Verleih anzeigen | Ja | Ja |
| Gegenstände anlegen/bearbeiten | Nein | Ja |
| Verleih verwalten | Nein | Ja |
| Umlagern | Ja | Ja |
| CSV-Import | Nein | Ja |
| Benutzer verwalten | Nein | Ja |