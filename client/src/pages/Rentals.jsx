import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { rentalsApi, itemsApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Plus, Search, Calendar, User, Phone, Mail, MapPin, Euro, X, ChevronDown, Trash2, Edit2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';

const STATUS_OPTIONS = ['reserviert', 'ausgeliehen', 'zurückgegeben', 'storniert'];
const STATUS_COLORS = {
  reserviert: 'bg-amber-100 text-amber-700 border-amber-200',
  ausgeliehen: 'bg-blue-100 text-blue-700 border-blue-200',
  zurückgegeben: 'bg-green-100 text-green-700 border-green-200',
  storniert: 'bg-gray-100 text-gray-500 border-gray-200',
};

function RentalForm({ rental, onSave, onClose }) {
  const [form, setForm] = useState({
    item_id: rental?.item_id || '',
    borrower_name: rental?.borrower_name || '',
    borrower_email: rental?.borrower_email || '',
    borrower_phone: rental?.borrower_phone || '',
    borrower_address: rental?.borrower_address || '',
    start_date: rental?.start_date?.split('T')[0] || '',
    end_date: rental?.end_date?.split('T')[0] || '',
    quantity: rental?.quantity || 1,
    price_type: rental?.price_type || 'daily',
    total_price: rental?.total_price || '',
    notes: rental?.notes || '',
    status: rental?.status || 'reserviert',
  });
  const [items, setItems] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    itemsApi.getAll({ is_rentable: true, limit: 200 }).then(({ data }) => setItems(data.items));
  }, []);

  useEffect(() => {
    if (form.item_id && form.start_date && form.end_date) {
      rentalsApi.checkAvailability({
        item_id: form.item_id,
        start_date: form.start_date,
        end_date: form.end_date,
        quantity: form.quantity,
        ...(rental?.id ? { exclude_rental_id: rental.id } : {}),
      }).then(({ data }) => setAvailability(data)).catch(() => setAvailability(null));
    }
  }, [form.item_id, form.start_date, form.end_date, form.quantity]);

  const selectedItem = items.find(i => i.id == form.item_id);

  const computedPrice = (() => {
    if (!selectedItem || !form.start_date || !form.end_date) return null;
    const days = differenceInDays(new Date(form.end_date), new Date(form.start_date)) + 1;
    if (form.price_type === 'weekend' && selectedItem.weekend_rate) {
      return Number(selectedItem.weekend_rate) * Number(form.quantity);
    }
    if (form.price_type === 'daily' && selectedItem.daily_rate) {
      return Number(selectedItem.daily_rate) * days * Number(form.quantity);
    }
    return null;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, total_price: form.total_price || computedPrice || undefined });
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Fehler beim Speichern', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!rental && (
        <div>
          <label className="label">Gegenstand *</label>
          <select className="input" required value={form.item_id} onChange={e => set('item_id', e.target.value)}>
            <option value="">– Gegenstand wählen –</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.name} (Bestand: {i.quantity})</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Von *</label>
          <input type="date" className="input" required value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </div>
        <div>
          <label className="label">Bis *</label>
          <input type="date" className="input" required value={form.end_date} min={form.start_date} onChange={e => set('end_date', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Menge</label>
          <input type="number" min="1" className="input" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
        </div>
        <div>
          <label className="label">Preismodell</label>
          <select className="input" value={form.price_type} onChange={e => set('price_type', e.target.value)}>
            <option value="daily">Tagespreis</option>
            <option value="weekend">Wochenende</option>
            <option value="custom">Individuell</option>
            <option value="free">Kostenlos</option>
          </select>
        </div>
      </div>

      {/* Verfügbarkeitsanzeige */}
      {availability && (
        <div className={`rounded-xl p-3 text-sm flex items-center gap-2
          ${availability.available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          <span className={`w-2 h-2 rounded-full ${availability.available ? 'bg-green-500' : 'bg-red-500'}`} />
          {availability.available
            ? `Verfügbar (${availability.available_quantity} von ${availability.total_quantity})`
            : `Nicht verfügbar! Nur ${availability.available_quantity} verfügbar`}
        </div>
      )}

      {/* Preis */}
      {form.price_type === 'custom' || form.price_type === 'free' ? (
        form.price_type === 'custom' && (
          <div>
            <label className="label">Individueller Preis (€)</label>
            <input type="number" step="0.01" className="input" value={form.total_price} onChange={e => set('total_price', e.target.value)} placeholder="0.00" />
          </div>
        )
      ) : computedPrice !== null ? (
        <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm text-blue-700">Berechneter Preis</span>
          <span className="font-bold text-blue-700 text-lg">
            {computedPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      ) : null}

      {rental && (
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">Kontaktdaten Entleiher</p>
        <input className="input" required placeholder="Name *" value={form.borrower_name} onChange={e => set('borrower_name', e.target.value)} />
        <input className="input" type="tel" placeholder="Telefon" value={form.borrower_phone} onChange={e => set('borrower_phone', e.target.value)} />
        <input className="input" type="email" placeholder="E-Mail" value={form.borrower_email} onChange={e => set('borrower_email', e.target.value)} />
        <textarea className="input" rows={2} placeholder="Adresse" value={form.borrower_address} onChange={e => set('borrower_address', e.target.value)} />
      </div>

      <textarea className="input" rows={2} placeholder="Notizen..." value={form.notes} onChange={e => set('notes', e.target.value)} />

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
        <button type="submit" disabled={saving || (availability && !availability.available)} className="btn-primary flex-1">
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </form>
  );
}

function RentalCard({ rental, onEdit, onDelete, isAdmin }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card overflow-hidden">
      <button className="w-full p-4 text-left" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{rental.item_name}</p>
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
              <User size={13} /> {rental.borrower_name} · {rental.quantity}×
            </p>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Calendar size={11} />
              {format(new Date(rental.start_date), 'd. MMM', { locale: de })} – {format(new Date(rental.end_date), 'd. MMM yyyy', { locale: de })}
            </p>
          </div>
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            <span className={`badge border ${STATUS_COLORS[rental.status]}`}>{rental.status}</span>
            {rental.total_price && (
              <span className="text-sm font-semibold text-gray-700">
                {Number(rental.total_price).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </span>
            )}
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-0 border-t border-gray-100 space-y-2">
          {rental.borrower_phone && (
            <a href={`tel:${rental.borrower_phone}`} className="flex items-center gap-2 text-sm text-blue-600">
              <Phone size={15} /> {rental.borrower_phone}
            </a>
          )}
          {rental.borrower_email && (
            <a href={`mailto:${rental.borrower_email}`} className="flex items-center gap-2 text-sm text-blue-600">
              <Mail size={15} /> {rental.borrower_email}
            </a>
          )}
          {rental.borrower_address && (
            <p className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin size={15} className="flex-shrink-0 mt-0.5" /> {rental.borrower_address}
            </p>
          )}
          {rental.notes && <p className="text-sm text-gray-500 italic">„{rental.notes}"</p>}

          {isAdmin && (
            <div className="flex gap-2 pt-2">
              <button onClick={onEdit} className="btn-secondary flex-1 py-2 text-sm">
                <Edit2 size={14} /> Bearbeiten
              </button>
              <button onClick={onDelete} className="btn flex-1 py-2 text-sm border border-red-200 text-red-500 hover:bg-red-50">
                <Trash2 size={14} /> Löschen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Rentals() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [rentals, setRentals] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [formOpen, setFormOpen] = useState(false);
  const [editRental, setEditRental] = useState(null);
  const [deleteRental, setDeleteRental] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await rentalsApi.getAll(params);
      setRentals(data.rentals);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (editRental) {
      await rentalsApi.update(editRental.id, form);
      toast('Verleih aktualisiert');
    } else {
      await rentalsApi.create(form);
      toast('Verleih angelegt');
    }
    load();
  };

  const handleDelete = async () => {
    await rentalsApi.delete(deleteRental.id);
    toast('Verleih gelöscht');
    load();
  };

  return (
    <div>
      {/* Statusfilter */}
      <div className="sticky top-[60px] bg-gray-50 z-20 border-b border-gray-100 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setStatusFilter('')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition border
              ${!statusFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
            Alle ({total})
          </button>
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium capitalize transition border
                ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Neuer Verleih Button */}
      {isAdmin && (
        <div className="px-4 pt-4">
          <button onClick={() => { setEditRental(null); setFormOpen(true); }} className="btn-primary w-full">
            <Plus size={20} /> Neuer Verleihvorgang
          </button>
        </div>
      )}

      {/* Liste */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rentals.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Calendar size={48} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">Keine Verleihvorgänge</p>
          </div>
        ) : (
          rentals.map(r => (
            <RentalCard key={r.id} rental={r} isAdmin={isAdmin}
              onEdit={() => { setEditRental(r); setFormOpen(true); }}
              onDelete={() => setDeleteRental(r)} />
          ))
        )}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)}
        title={editRental ? 'Verleih bearbeiten' : 'Neuer Verleihvorgang'} size="lg">
        <RentalForm rental={editRental} onSave={handleSave} onClose={() => setFormOpen(false)} />
      </Modal>

      <ConfirmDialog open={!!deleteRental} onClose={() => setDeleteRental(null)}
        onConfirm={handleDelete} title="Verleih löschen"
        message={`Verleihvorgang für „${deleteRental?.item_name}" an ${deleteRental?.borrower_name} wirklich löschen?`} />
    </div>
  );
}
