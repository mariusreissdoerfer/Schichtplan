import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { itemsApi, uploadApi, warehousesApi, rentalsApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  ArrowLeft, Camera, MapPin, Package, Euro, Star, Trash2, MoveRight,
  Calendar, CheckCircle, Clock, AlertCircle, Plus, Image
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const conditionColors = {
  neuwertig: 'bg-green-100 text-green-700',
  'sehr gut': 'bg-green-100 text-green-600',
  gut: 'bg-blue-100 text-blue-700',
  befriedigend: 'bg-amber-100 text-amber-700',
  'reparaturbedürftig': 'bg-red-100 text-red-700',
};

function RentalStatusBadge({ status }) {
  const map = {
    reserviert: 'bg-amber-100 text-amber-700',
    ausgeliehen: 'bg-blue-100 text-blue-700',
    zurückgegeben: 'bg-green-100 text-green-700',
    storniert: 'bg-gray-100 text-gray-500',
  };
  return <span className={`badge ${map[status] || ''}`}>{status}</span>;
}

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [activeImg, setActiveImg] = useState(0);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState('');
  const [moveNote, setMoveNote] = useState('');
  const [deleteImg, setDeleteImg] = useState(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      const { data } = await itemsApi.getOne(id);
      setItem(data);
    } catch {
      navigate('/items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    warehousesApi.getAll().then(({ data }) => {
      setLocations(data.flatMap(w => w.locations.map(l => ({ ...l, warehouse_name: w.name }))));
    });
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadApi.uploadImage(id, file);
      await load();
      toast('Bild hochgeladen');
    } catch {
      toast('Fehler beim Hochladen', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (imageId) => {
    await uploadApi.setPrimary(id, imageId);
    await load();
    toast('Hauptbild gesetzt');
  };

  const handleDeleteImage = async () => {
    await uploadApi.deleteImage(id, deleteImg.id);
    await load();
    setDeleteImg(null);
    toast('Bild gelöscht');
  };

  const handleMove = async () => {
    if (!moveTarget) return;
    try {
      await itemsApi.move(id, { to_location_id: moveTarget, notes: moveNote });
      await load();
      setMoveOpen(false);
      setMoveTarget('');
      setMoveNote('');
      toast('Gegenstand umgelagert');
    } catch {
      toast('Fehler beim Umlagern', 'error');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!item) return null;

  const images = item.images || [];

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="sticky top-[60px] bg-white z-20 px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl text-gray-600 hover:bg-gray-100 transition">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-semibold text-gray-900 flex-1 truncate">{item.name}</h1>
        <span className={`badge flex-shrink-0 ${conditionColors[item.condition] || 'bg-gray-100 text-gray-500'}`}>
          {item.condition}
        </span>
      </div>

      {/* Bilder */}
      <div className="bg-white">
        {images.length > 0 ? (
          <div>
            <div className="aspect-video overflow-hidden">
              <img src={images[activeImg]?.url} alt={item.name} className="w-full h-full object-contain bg-gray-50" />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {images.map((img, i) => (
                  <button key={img.id} onClick={() => setActiveImg(i)}
                    className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition
                      ${i === activeImg ? 'border-blue-500' : 'border-transparent'}`}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-video bg-gray-100 flex flex-col items-center justify-center text-gray-400">
            <Image size={48} className="opacity-40 mb-2" />
            <p className="text-sm">Noch keine Bilder</p>
          </div>
        )}

        {isAdmin && (
          <div className="flex gap-2 px-4 py-3 border-t border-gray-100 overflow-x-auto">
            <label className={`btn btn-secondary text-sm flex-shrink-0 ${uploading ? 'opacity-50' : ''}`}>
              <Camera size={16} /> {uploading ? 'Lädt...' : 'Bild hinzufügen'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
            {images.map(img => (
              <div key={img.id} className="relative flex-shrink-0">
                <img src={img.url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                <div className="absolute -top-1 -right-1 flex gap-0.5">
                  {!img.is_primary && (
                    <button onClick={() => handleSetPrimary(img.id)}
                      className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                      <Star size={8} fill="white" className="text-white" />
                    </button>
                  )}
                  <button onClick={() => setDeleteImg(img)}
                    className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <Trash2 size={8} className="text-white" />
                  </button>
                </div>
                {img.is_primary && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <Star size={8} fill="white" className="text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Grunddaten */}
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Menge</p>
              <p className="font-semibold text-gray-900">{item.quantity}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Kategorie</p>
              <p className="font-semibold text-gray-900">{item.category_name || '–'}</p>
            </div>
            {item.purchase_price && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Einkaufspreis</p>
                <p className="font-semibold text-gray-900">
                  {Number(item.purchase_price).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Verleihbar</p>
              <p className={`font-semibold ${item.is_rentable ? 'text-green-600' : 'text-gray-400'}`}>
                {item.is_rentable ? 'Ja' : 'Nein'}
              </p>
            </div>
          </div>
          {item.description && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Beschreibung</p>
              <p className="text-sm text-gray-700">{item.description}</p>
            </div>
          )}
          {item.notes && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Notizen</p>
              <p className="text-sm text-gray-700">{item.notes}</p>
            </div>
          )}
        </div>

        {/* Preise */}
        {item.is_rentable && (item.daily_rate || item.weekend_rate) && (
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Euro size={18} className="text-blue-500" /> Preise
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {item.daily_rate && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-600">Tagespreis</p>
                  <p className="font-bold text-blue-700 text-lg">
                    {Number(item.daily_rate).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
              )}
              {item.weekend_rate && (
                <div className="bg-purple-50 rounded-xl p-3">
                  <p className="text-xs text-purple-600">Wochenende</p>
                  <p className="font-bold text-purple-700 text-lg">
                    {Number(item.weekend_rate).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lagerort */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin size={18} className="text-blue-500" /> Lagerort
            </h3>
            {isAdmin && (
              <button onClick={() => setMoveOpen(true)} className="text-sm text-blue-600 font-medium flex items-center gap-1">
                <MoveRight size={16} /> Umlagern
              </button>
            )}
          </div>
          {item.warehouse_name ? (
            <div className="mt-2">
              <p className="font-medium text-gray-800">{item.warehouse_name}</p>
              <p className="text-sm text-gray-500">{item.location_name}</p>
            </div>
          ) : (
            <p className="text-gray-400 text-sm mt-2">Kein Lagerplatz zugewiesen</p>
          )}
        </div>

        {/* Bewegungshistorie */}
        {item.movements?.length > 0 && (
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Bewegungshistorie</h3>
            <div className="space-y-2">
              {item.movements.slice(0, 5).map(m => (
                <div key={m.id} className="flex items-start gap-2 text-sm">
                  <MoveRight size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-700">
                      {m.from_location_name ? `${m.from_warehouse_name} › ${m.from_location_name}` : 'unbekannt'}
                      {' → '}
                      {m.to_location_name ? `${m.to_warehouse_name} › ${m.to_location_name}` : 'unbekannt'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(m.moved_at), 'd. MMM yyyy', { locale: de })}
                      {m.moved_by_name && ` · ${m.moved_by_name}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Letzte Verleihe */}
        {item.recent_rentals?.length > 0 && (
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar size={18} className="text-blue-500" /> Letzte Verleihe
            </h3>
            <div className="space-y-2">
              {item.recent_rentals.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{r.borrower_name}</p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(r.start_date), 'd.M.yy', { locale: de })} – {format(new Date(r.end_date), 'd.M.yy', { locale: de })}
                      {' · '}{r.quantity}×
                    </p>
                  </div>
                  <RentalStatusBadge status={r.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Umlagern Modal */}
      <Modal open={moveOpen} onClose={() => setMoveOpen(false)} title="Umlagern" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Neuer Lagerplatz</label>
            <select className="input" value={moveTarget} onChange={e => setMoveTarget(e.target.value)}>
              <option value="">– Lagerplatz wählen –</option>
              {locations.map(l => (
                <option key={l.id} value={l.id} disabled={l.id == item.storage_location_id}>
                  {l.warehouse_name} › {l.name} {l.id == item.storage_location_id ? '(aktuell)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Notiz (optional)</label>
            <input className="input" value={moveNote} onChange={e => setMoveNote(e.target.value)} placeholder="Grund für Umlagerung..." />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setMoveOpen(false)} className="btn-secondary flex-1">Abbrechen</button>
            <button onClick={handleMove} disabled={!moveTarget} className="btn-primary flex-1">Umlagern</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteImg} onClose={() => setDeleteImg(null)}
        onConfirm={handleDeleteImage} title="Bild löschen"
        message="Dieses Bild wirklich löschen?" />
    </div>
  );
}
