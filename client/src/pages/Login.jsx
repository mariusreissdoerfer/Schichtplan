import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Lock, Mail, Package } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('admin@verein.de');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      toast(err.response?.data?.error || 'Anmeldung fehlgeschlagen', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-3xl mb-4 backdrop-blur-sm">
            <Package size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Vereinsinventar</h1>
          <p className="text-blue-200 mt-1">Inventar- & Verleihverwaltung</p>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-5">Anmelden</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">E-Mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="admin@verein.de"
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label className="label">Passwort</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="Passwort eingeben"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 py-3.5">
              {loading ? 'Anmelden...' : 'Anmelden'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-4">
            Standard: admin@verein.de / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
