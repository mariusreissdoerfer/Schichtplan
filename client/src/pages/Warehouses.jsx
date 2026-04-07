import { useState, useEffect } from 'react';
import { warehousesApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Building2, MapPin, Plus, Edit2, Trash2, ChevronDown, Package } from 'lucide-react';

function WarehouseForm({ warehouse, onSave, onClose }) {
  const [form, setForm] = useState({ name: warehouse?.name || '', address: warehouse?.address || '', description: warehouse?.description || '' });
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
        <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="z.B. Lagerhalle 1" />
      </div>
      <div>
        <label className="label">Adresse</label>
        <input className="input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Musterstraße 1, 12345 Stadt" />
      </div>
      <div>
        <label className="label">Beschreibung</label>
        <textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Speichern...' : 'Speichern'}</button>
      </div>
    </form>
  );
}

function LocationForm({ warehouseId, location, onSave, onClose }) {
  const [form, setForm] = useState({ name: location?.name || '', description: location?.description || '' });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

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
        <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Regal A" />
      </div>
      <div>
        <label className="label">Beschreibung</label>
        <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optionale Beschreibung" />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Speichern...' : 'Speichern'}</button>
      </div>
    </form>
  );
}

function WarehouseCard({ warehouse, isAdmin, onEdit, onDelete, onAddLocation, onEditLocation, onDeleteLocation }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="card overflow-hidden">
      <button className="w-full p-4 text-left flex items-start gap-3" onClick={() => setExpanded(!expanded)}>
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Building2 size={20} className="text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">{warehouse.name}</p>
          {warehouse.address && <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={12} />{warehouse.address}</p>}
          <p className="text-xs text-gray-400 mt-1">{warehouse.locations?.length || 0} Lagerplätze</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button onClick={e => { e.stopPropagation(); onEdit(); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <Edit2 size={16} />
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-2 rounded-lg hover:bg-red-50 text-red-400">
                <Trash2 size={16} />
              </button>
            </>
          )}
          <ChevronDown size={18} className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          {warehouse.locations?.map(loc => (
            <div key={loc.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin size={15} className="text-gray-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-800">{loc.name}</p>
                {loc.description && <p className="text-xs text-gray-400">{loc.description}</p>}
                {loc.item_count > 0 && (
                  <p className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                    <Package size={11} /> {loc.item_count} Gegenstand{loc.item_count !== 1 ? 'e' : ''}
                  </p>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-1">
                  <button onClick={() => onEditLocation(loc)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => onDeleteLocation(loc)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {isAdmin && (
            <button onClick={onAddLocation}
              className="w-full py-3 px-4 flex items-center gap-2 text-sm text-blue-600 font-medium hover:bg-blue-50 transition">
              <Plus size={16} /> Lagerplatz hinzufügen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Warehouses() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [whFormOpen, setWhFormOpen] = useState(false);
  const [editWh, setEditWh] = useState(null);
  const [deleteWh, setDeleteWh] = useState(null);
  const [locFormOpen, setLocFormOpen] = useState(false);
  const [editLoc, setEditLoc] = useState(null);
  const [deleteLoc, setDeleteLoc] = useState(null);
  const [selectedWhId, setSelectedWhId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await warehousesApi.getAll();
      setWarehouses(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSaveWh = async (form) => {
    if (editWh) { await warehousesApi.update(editWh.id, form); toast('Lagerhalle aktualisiert'); }
    else { await warehousesApi.create(form); toast('Lagerhalle angelegt'); }
    load();
  };

  const handleDeleteWh = async () => {
    try { await warehousesApi.delete(deleteWh.id); toast('Lagerhalle gelöscht'); load(); }
    catch (err) { toast(err.response?.data?.error || 'Fehler', 'error'); }
  };

  const handleSaveLoc = async (form) => {
    if (editLoc) { await warehousesApi.updateLocation(editLoc.id, form); toast('Lagerplatz aktualisiert'); }
    else { await warehousesApi.createLocation(selectedWhId, form); toast('Lagerplatz angelegt'); }
    load();
  };

  const handleDeleteLoc = async () => {
    try { await warehousesApi.deleteLocation(deleteLoc.id); toast('Lagerplatz gelöscht'); load(); }
    catch (err) { toast(err.response?.data?.error || 'Fehler', 'error'); }
  };

  return (
    <div>
      <div className="sticky top-[60px] bg-gray-50 z-20 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm text-gray-500">{warehouses.length} Lagerhallen</p>
        {isAdmin && (
          <button onClick={() => { setEditWh(null); setWhFormOpen(true); }} className="btn-primary py-2 px-3 text-sm">
            <Plus size={16} /> Lagerhalle
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : warehouses.map(wh => (
          <WarehouseCard key={wh.id} warehouse={wh} isAdmin={isAdmin}
            onEdit={() => { setEditWh(wh); setWhFormOpen(true); }}
            onDelete={() => setDeleteWh(wh)}
            onAddLocation={() => { setSelectedWhId(wh.id); setEditLoc(null); setLocFormOpen(true); }}
            onEditLocation={(loc) => { setEditLoc(loc); setSelectedWhId(wh.id); setLocFormOpen(true); }}
            onDeleteLocation={setDeleteLoc} />
        ))}
      </div>

      <Modal open={whFormOpen} onClose={() => setWhFormOpen(false)} title={editWh ? 'Lagerhalle bearbeiten' : 'Neue Lagerhalle'} size="sm">
        <WarehouseForm warehouse={editWh} onSave={handleSaveWh} onClose={() => setWhFormOpen(false)} />
      </Modal>

      <Modal open={locFormOpen} onClose={() => setLocFormOpen(false)} title={editLoc ? 'Lagerplatz bearbeiten' : 'Neuer Lagerplatz'} size="sm">
        <LocationForm warehouseId={selectedWhId} location={editLoc} onSave={handleSaveLoc} onClose={() => setLocFormOpen(false)} />
      </Modal>

      <ConfirmDialog open={!!deleteWh} onClose={() => setDeleteWh(null)} onConfirm={handleDeleteWh}
        title="Lagerhalle löschen" message={`„${deleteWh?.name}" und alle Lagerplätze löschen?`} />
      <ConfirmDialog open={!!deleteLoc} onClose={() => setDeleteLoc(null)} onConfirm={handleDeleteLoc}
        title="Lagerplatz löschen" message={`Lagerplatz „${deleteLoc?.name}" löschen?`} />
    </div>
  );
}
