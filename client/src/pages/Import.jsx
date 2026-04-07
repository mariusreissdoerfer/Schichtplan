import { useState } from 'react';
import { importApi } from '../api';
import { useToast } from '../components/Toast';
import { Upload, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function Import() {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [separator, setSeparator] = useState(',');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await importApi.importCsv(file, separator);
      setResult(data);
      toast(`${data.imported_count} Gegenstände importiert`, 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Import fehlgeschlagen', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">CSV-Import</h2>
        <p className="text-sm text-gray-500 mt-1">Bestehende Inventarlisten importieren</p>
      </div>

      {/* Vorlage */}
      <div className="card p-4 bg-blue-50 border-blue-100">
        <div className="flex items-start gap-3">
          <Download size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-blue-900">Vorlage herunterladen</p>
            <p className="text-sm text-blue-700 mt-0.5">CSV-Vorlage mit den richtigen Spalten</p>
          </div>
          <button onClick={importApi.downloadTemplate} className="btn-primary py-2 px-3 text-sm bg-blue-600">
            Download
          </button>
        </div>
      </div>

      {/* Spaltenerklärung */}
      <div className="card p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileText size={18} className="text-gray-500" /> Erwartete Spalten
        </h3>
        <div className="space-y-1.5 text-sm">
          {[
            ['name', 'Bezeichnung des Gegenstands (Pflicht)'],
            ['beschreibung', 'Detailbeschreibung (optional)'],
            ['kategorie', 'Wird automatisch angelegt falls neu'],
            ['menge', 'Anzahl (Standard: 1)'],
            ['zustand', 'neuwertig / sehr gut / gut / befriedigend'],
            ['einkaufspreis', 'In Euro, z.B. 49.90'],
            ['verleihbar', 'ja / nein (Standard: ja)'],
            ['tagespreis', 'Preis pro Tag in Euro'],
            ['wochenendpreis', 'Pauschalpreis für Wochenende'],
            ['lagerplatz', 'Muss bereits angelegt sein'],
          ].map(([col, desc]) => (
            <div key={col} className="flex gap-2">
              <code className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono flex-shrink-0">{col}</code>
              <span className="text-gray-500">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upload */}
      <div className="card p-4 space-y-4">
        <h3 className="font-semibold text-gray-900">Datei auswählen</h3>
        <div>
          <label className="label">Trennzeichen</label>
          <select className="input" value={separator} onChange={e => setSeparator(e.target.value)}>
            <option value=",">Komma (,) – Standard</option>
            <option value=";">Semikolon (;) – Excel Deutschland</option>
            <option value="\t">Tabulator</option>
          </select>
        </div>
        <label className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-8 cursor-pointer transition
          ${file ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}>
          <Upload size={32} className={file ? 'text-blue-500' : 'text-gray-400'} />
          {file ? (
            <div className="text-center">
              <p className="font-medium text-blue-700">{file.name}</p>
              <p className="text-sm text-blue-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="font-medium text-gray-600">CSV-Datei auswählen</p>
              <p className="text-sm text-gray-400">oder hierher ziehen</p>
            </div>
          )}
          <input type="file" accept=".csv,text/csv" className="hidden"
            onChange={e => setFile(e.target.files[0] || null)} />
        </label>

        <button onClick={handleImport} disabled={!file || loading} className="btn-primary w-full">
          {loading ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importiere...</>
          ) : (
            <><Upload size={18} /> Import starten</>
          )}
        </button>
      </div>

      {/* Ergebnis */}
      {result && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900">Import abgeschlossen</p>
              <p className="text-sm text-gray-500">
                {result.imported_count} importiert · {result.skipped_count} übersprungen
              </p>
            </div>
          </div>

          {result.skipped.length > 0 && (
            <div>
              <p className="text-sm font-medium text-amber-700 flex items-center gap-2 mb-2">
                <AlertCircle size={16} /> Übersprungene Zeilen
              </p>
              <div className="space-y-1">
                {result.skipped.map((s, i) => (
                  <div key={i} className="text-xs bg-amber-50 text-amber-800 rounded-lg px-3 py-2">
                    Zeile {s.row}{s.name ? ` (${s.name})` : ''}: {s.reason}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.imported.length > 0 && (
            <div>
              <p className="text-sm font-medium text-green-700 mb-2">Importierte Gegenstände</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {result.imported.map(item => (
                  <div key={item.id} className="text-xs bg-green-50 text-green-800 rounded-lg px-3 py-1.5">
                    ✓ {item.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
