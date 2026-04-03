import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { itemsApi, categoriesApi, warehousesApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Plus, Search, Filter, Package, MapPin, Euro, ChevronRight,
  Edit2, Trash2, X, CheckCircle2, XCircle
} from 'lucide-react';

const CONDITIONS = ['neuwertig', 'sehr gut', 'gut', 'befriedigend', 'reparaturbedürftig'];

function ItemForm({ item, categories, locations, onSave, onClose }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    description: item?.description || '',
    category_id: item?.category_id || '',
    quantity: item?.quantity || 1,
    condition: item?.condition || 'gut',
    purchase_price: item?.purchase_price || '',
    is_rentable: item?.is_rentable !== false,
    daily_rate: item?.daily_rate || '',
    weekend_rate: item?.weekend_rate || '',
    storage_location_id: item?.storage_location_id || '',
    notes: item?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Fehler beim Speichern', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="label">Name *</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="z.B. Festzelt 6x12m" />
      </div>
      <div>
        <label className="label">Beschreibung</label>
        <textarea className="input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Details zum Gegenstand..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Kategorie</label>
          <select className="input" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
            <option value="">– keine –</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Menge</label>
          <input type="number" min="1" className="input" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Zustand</label>
          <select className="input" value={form.condition} onChange={e => set('condition', e.target.value)}>
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Einkaufspreis (€)</label>
          <input type="number" step="0.01" className="input" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} placeholder="0.00" />
        </div>
      </div>
      <div>
        <label className="label">Lagerplatz</label>
        <select className="input" value={form.storage_location_id} onChange={e => set('storage_location_id', e.target.value)}>
          <option value="">– kein Lagerplatz –</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.warehouse_name} › {l.name}</option>)}
        </select>
      </div>
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="font-medium text-sm text-gray-700">Verleihbar</label>
          <button type="button" onClick={() => set('is_rentable', !form.is_rentable)}
            className={`w-12 h-6 rounded-full transition-colors ${form.is_rentable ? 'bg-blue-600' : 'bg-gray-300'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5
              ${form.is_rentable ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
        {form.is_rentable && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tagespreis (€)</label>
              <input type="number" step="0.01" className="input" value={form.daily_rate} onChange={e => set('daily_rate', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="label">Wochenendpauschale (€)</label>
              <input type="number" step="0.01" className="input" value={form.weekend_rate} onChange={e => set('weekend_rate', e.target.value)} placeholder="0.00" />
            </div>
          </div>
        )}
      </div>
      <div>
        <label className="label">Notizen</label>
        <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Interne Notizen..." />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </form>
  );
}

function ItemCard({ item, isAdmin, onEdit, onDelete }) {
  const conditionColors = {
    neuwertig: 'bg-green-100 text-green-700',
    'sehr gut': 'bg-green-100 text-green-600',
    gut: 'bg-blue-100 text-blue-700',
    befriedigend: 'bg-amber-100 text-amber-700',
    'reparaturbedürftig': 'bg-red-100 text-red-700',
  };

  return (
    <div className="card overflow-hidden">
      <Link to={`/items/${item.id}`} className="flex gap-3 p-3.5">
        {item.primary_image ? (
          <img src={item.primary_image} alt={item.name}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Package size={24} className="text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-gray-900 leading-tight">{item.name}</p>
            <span className={`badge flex-shrink-0 ${conditionColors[item.condition] || 'bg-gray-100 text-gray-500'}`}>
              {item.condition}
            </span>
          </div>
          {item.category_name && (
            <p className="text-xs text-gray-500 mt-0.5">{item.category_name}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-sm text-gray-600 font-medium">{item.quantity}×</span>
            {item.warehouse_name && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <MapPin size={11} /> {item.warehouse_name}
              </span>
            )}
            {item.is_rentable && item.daily_rate && (
              <span className="flex items-center gap-1 text-xs text-blue-600">
                <Euro size={11} /> {Number(item.daily_rate).toFixed(2)}/Tag
              </span>
            )}
            {!item.is_rentable && (
              <span className="text-xs text-gray-400">nicht verleihbar</span>
            )}
          </div>
        </div>
        <ChevronRight size={18} className="text-gray-300 self-center flex-shrink-0" />
      </Link>
      {isAdmin && (
        <div className="flex border-t border-gray-100">
          <button onClick={onEdit} className="flex-1 py-2.5 flex items-center justify-center gap-2 text-sm text-gray-600 hover:bg-gray-50 transition">
            <Edit2 size={15} /> Bearbeiten
          </button>
          <div className="w-px bg-gray-100" />
          <button onClick={onDelete} className="flex-1 py-2.5 flex items-center justify-center gap-2 text-sm text-red-500 hover:bg-red-50 transition">
            <Trash2 size={15} /> Löschen
          </button>
        </div>
      )}
    </div>
  );
}

export default function Items() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filters, setFilters] = useState({ category_id: '', is_rentable: '', condition: '' });
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search, ...filters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const { data } = await itemsApi.getAll(params);
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [search, filters]);

  useEffect(() => { loadItems(); }, [loadItems]);

  useEffect(() => {
    Promise.all([categoriesApi.getAll(), warehousesApi.getAll()]).then(([cats, whs]) => {
      setCategories(cats.data);
      const locs = whs.data.flatMap(w => w.locations.map(l => ({ ...l, warehouse_name: w.name })));
      setLocations(locs);
    });
  }, []);

  const handleSave = async (form) => {
    if (editItem) {
      await itemsApi.update(editItem.id, form);
      toast('Gegenstand aktualisiert');
    } else {
      await itemsApi.create(form);
      toast('Gegenstand angelegt');
    }
    loadItems();
  };

  const handleDelete = async () => {
    try {
      await itemsApi.delete(deleteItem.id);
      toast('Gegenstand gelöscht');
      loadItems();
    } catch (err) {
      toast(err.response?.data?.error || 'Fehler beim Löschen', 'error');
    }
  };

  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <div>
      {/* Suche & Aktionen */}
      <div className="sticky top-[60px] bg-gray-50 z-20 px-4 py-3 space-y-2 border-b border-gray-100">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              className="input pl-10 py-2.5"
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X size={16} />
              </button>
            )}
          </div>
          <button onClick={() => setFilterOpen(!filterOpen)}
            className={`btn p-2.5 border ${activeFilters ? 'bg-blue-50 border-blue-300 text-blue-600' : 'bg-white border-gray-200 text-gray-600'}`}>
            <Filter size={18} />
            {activeFilters > 0 && <span className="w-4 h-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">{activeFilters}</span>}
          </button>
          {isAdmin && (
            <button onClick={() => { setEditItem(null); setFormOpen(true); }} className="btn-primary px-3 py-2.5">
              <Plus size={20} />
            </button>
          )}
        </div>

        {filterOpen && (
          <div className="card p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <select className="input py-2" value={filters.category_id} onChange={e => setFilters(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">Alle Kategorien</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="input py-2" value={filters.condition} onChange={e => setFilters(f => ({ ...f, condition: e.target.value }))}>
                <option value="">Alle Zustände</option>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <select className="input py-2" value={filters.is_rentable} onChange={e => setFilters(f => ({ ...f, is_rentable: e.target.value }))}>
              <option value="">Verleihbar & nicht verleihbar</option>
              <option value="true">Nur verleihbar</option>
              <option value="false">Nicht verleihbar</option>
            </select>
            {activeFilters > 0 && (
              <button onClick={() => setFilters({ category_id: '', is_rentable: '', condition: '' })}
                className="text-sm text-red-500 font-medium">
                Filter zurücksetzen
              </button>
            )}
          </div>
        )}

        <p className="text-xs text-gray-400">{total} Gegenstände</p>
      </div>

      {/* Liste */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package size={48} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">Keine Gegenstände gefunden</p>
            {isAdmin && <p className="text-sm mt-1">Tippe auf + um einen anzulegen</p>}
          </div>
        ) : (
          items.map(item => (
            <ItemCard key={item.id} item={item} isAdmin={isAdmin}
              onEdit={() => { setEditItem(item); setFormOpen(true); }}
              onDelete={() => setDeleteItem(item)} />
          ))
        )}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)}
        title={editItem ? 'Gegenstand bearbeiten' : 'Neuer Gegenstand'} size="lg">
        <ItemForm item={editItem} categories={categories} locations={locations}
          onSave={handleSave} onClose={() => setFormOpen(false)} />
      </Modal>

      <ConfirmDialog open={!!deleteItem} onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete} title="Gegenstand löschen"
        message={`„${deleteItem?.name}" wirklich löschen? Dies kann nicht rückgängig gemacht werden.`} />
    </div>
  );
}
