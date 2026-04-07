import { useState, useEffect } from 'react';
import { categoriesApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';

const ICONS = ['box', 'home', 'zap', 'coffee', 'package', 'music', 'tool', 'more-horizontal', 'truck', 'tent', 'utensils', 'wrench'];
const COLORS = ['#ef4444','#f97316','#f59e0b','#10b981','#3b82f6','#6366f1','#8b5cf6','#ec4899','#6b7280'];

function CategoryForm({ category, onSave, onClose }) {
  const [form, setForm] = useState({
    name: category?.name || '',
    description: category?.description || '',
    color: category?.color || '#6366f1',
    icon: category?.icon || 'box',
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (err) { toast(err.response?.data?.error || 'Fehler', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Name *</label>
        <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="z.B. Zelte & Unterkünfte" />
      </div>
      <div>
        <label className="label">Beschreibung</label>
        <input className="input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional" />
      </div>
      <div>
        <label className="label">Farbe</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => set('color', c)}
              style={{ backgroundColor: c }}
              className={`w-8 h-8 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`} />
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Speichern...' : 'Speichern'}</button>
      </div>
    </form>
  );
}

export default function Categories() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [deleteCat, setDeleteCat] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const { data } = await categoriesApi.getAll(); setCategories(data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (editCat) { await categoriesApi.update(editCat.id, form); toast('Kategorie aktualisiert'); }
    else { await categoriesApi.create(form); toast('Kategorie angelegt'); }
    load();
  };

  const handleDelete = async () => {
    try { await categoriesApi.delete(deleteCat.id); toast('Kategorie gelöscht'); load(); }
    catch (err) { toast(err.response?.data?.error || 'Fehler', 'error'); }
  };

  return (
    <div>
      <div className="sticky top-[60px] bg-gray-50 z-20 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm text-gray-500">{categories.length} Kategorien</p>
        {isAdmin && (
          <button onClick={() => { setEditCat(null); setFormOpen(true); }} className="btn-primary py-2 px-3 text-sm">
            <Plus size={16} /> Kategorie
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : categories.map(cat => (
          <div key={cat.id} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: cat.color + '20', color: cat.color }}>
              <Tag size={20} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{cat.name}</p>
              {cat.description && <p className="text-sm text-gray-500">{cat.description}</p>}
              <p className="text-xs text-gray-400 mt-0.5">{cat.item_count} Gegenstand{cat.item_count != 1 ? 'e' : ''}</p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <button onClick={() => { setEditCat(cat); setFormOpen(true); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => setDeleteCat(cat)} className="p-2 rounded-lg hover:bg-red-50 text-red-400">
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editCat ? 'Kategorie bearbeiten' : 'Neue Kategorie'} size="sm">
        <CategoryForm category={editCat} onSave={handleSave} onClose={() => setFormOpen(false)} />
      </Modal>
      <ConfirmDialog open={!!deleteCat} onClose={() => setDeleteCat(null)} onConfirm={handleDelete}
        title="Kategorie löschen" message={`„${deleteCat?.name}" löschen? Alle Gegenstände verlieren diese Kategorie.`} />
    </div>
  );
}
