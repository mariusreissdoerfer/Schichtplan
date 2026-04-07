import { useState, useEffect } from 'react';
import { authApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Users as UsersIcon, Plus, Edit2, Shield, Eye, Key } from 'lucide-react';

function UserForm({ user, onSave, onClose }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'viewer',
    is_active: user?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user && (!form.password || form.password.length < 6)) {
      toast('Passwort mindestens 6 Zeichen', 'error');
      return;
    }
    setSaving(true);
    try {
      const data = { name: form.name, email: form.email, role: form.role, is_active: form.is_active };
      if (!user) data.password = form.password;
      await onSave(data);
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Fehler', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Name *</label>
        <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Max Mustermann" />
      </div>
      <div>
        <label className="label">E-Mail *</label>
        <input className="input" type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="max@verein.de" />
      </div>
      {!user && (
        <div>
          <label className="label">Passwort * (min. 6 Zeichen)</label>
          <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Passwort" />
        </div>
      )}
      <div>
        <label className="label">Rolle</label>
        <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
          <option value="viewer">Betrachter (nur lesen)</option>
          <option value="admin">Administrator (voller Zugriff)</option>
        </select>
      </div>
      {user && (
        <div className="flex items-center justify-between">
          <label className="font-medium text-sm text-gray-700">Aktiv</label>
          <button type="button" onClick={() => set('is_active', !form.is_active)}
            className={`w-12 h-6 rounded-full transition-colors ${form.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5
              ${form.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Speichern...' : 'Speichern'}</button>
      </div>
    </form>
  );
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });

  const load = async () => {
    setLoading(true);
    try { const { data } = await authApi.getUsers(); setUsers(data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (editUser) { await authApi.updateUser(editUser.id, form); toast('Benutzer aktualisiert'); }
    else { await authApi.createUser(form); toast('Benutzer angelegt'); }
    load();
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await authApi.changePassword(pwForm);
      toast('Passwort geändert');
      setPwOpen(false);
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast(err.response?.data?.error || 'Fehler', 'error');
    }
  };

  return (
    <div>
      <div className="sticky top-[60px] bg-gray-50 z-20 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm text-gray-500">{users.length} Benutzer</p>
        <div className="flex gap-2">
          <button onClick={() => setPwOpen(true)} className="btn-secondary py-2 px-3 text-sm">
            <Key size={16} /> Passwort
          </button>
          <button onClick={() => { setEditUser(null); setFormOpen(true); }} className="btn-primary py-2 px-3 text-sm">
            <Plus size={16} /> Benutzer
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.map(u => (
          <div key={u.id} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-sm
              ${u.role === 'admin' ? 'bg-blue-600' : 'bg-gray-400'}`}>
              {u.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{u.name}</p>
                {u.id === currentUser?.id && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Ich</span>}
                {!u.is_active && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inaktiv</span>}
              </div>
              <p className="text-sm text-gray-500">{u.email}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {u.role === 'admin' ? (
                  <span className="flex items-center gap-1 text-xs text-blue-600"><Shield size={11} /> Administrator</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-400"><Eye size={11} /> Betrachter</span>
                )}
              </div>
            </div>
            <button onClick={() => { setEditUser(u); setFormOpen(true); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <Edit2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editUser ? 'Benutzer bearbeiten' : 'Neuer Benutzer'} size="sm">
        <UserForm user={editUser} onSave={handleSave} onClose={() => setFormOpen(false)} />
      </Modal>

      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Passwort ändern" size="sm">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">Aktuelles Passwort</label>
            <input type="password" className="input" required
              value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} />
          </div>
          <div>
            <label className="label">Neues Passwort (min. 6 Zeichen)</label>
            <input type="password" className="input" required minLength={6}
              value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setPwOpen(false)} className="btn-secondary flex-1">Abbrechen</button>
            <button type="submit" className="btn-primary flex-1">Ändern</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
