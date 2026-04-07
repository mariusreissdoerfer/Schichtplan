import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Package, Building2, Calendar, Tag, Upload, Users, LogOut, Menu, X
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Übersicht' },
  { to: '/items', icon: Package, label: 'Inventar' },
  { to: '/rentals', icon: Calendar, label: 'Verleih' },
  { to: '/warehouses', icon: Building2, label: 'Lager' },
  { to: '/categories', icon: Tag, label: 'Kategorien' },
];

const adminItems = [
  { to: '/import', icon: Upload, label: 'Import' },
  { to: '/users', icon: Users, label: 'Benutzer' },
];

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (to) => to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const allItems = [...navItems, ...(isAdmin ? adminItems : [])];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Header */}
      <header className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 safe-top shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📦</span>
          <div>
            <h1 className="font-bold text-base leading-none">Vereinsinventar</h1>
            <p className="text-blue-200 text-xs">{user?.name}</p>
          </div>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-xl hover:bg-blue-700 transition">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Slide-out Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="relative bg-white w-72 h-full shadow-2xl flex flex-col">
            <div className="bg-blue-600 text-white px-5 py-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-xl font-bold">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{user?.name}</p>
                  <p className="text-blue-200 text-sm">{isAdmin ? 'Administrator' : 'Betrachter'}</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 p-4 overflow-y-auto">
              {allItems.map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl mb-1 transition font-medium text-sm
                    ${isActive(to) ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <Icon size={20} />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-gray-100">
              <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl w-full text-sm font-medium transition">
                <LogOut size={20} />
                Abmelden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 safe-bottom">
        <div className="flex justify-around items-center h-16">
          {navItems.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition flex-1
                ${isActive(to) ? 'text-blue-600' : 'text-gray-500'}`}
            >
              <Icon size={22} strokeWidth={isActive(to) ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
