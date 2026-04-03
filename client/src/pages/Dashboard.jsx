import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { statsApi, rentalsApi } from '../api';
import { Package, Calendar, Building2, Tag, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

function StatCard({ icon: Icon, label, value, sub, color, to }) {
  const content = (
    <div className={`card p-4 flex items-center gap-4 ${to ? 'active:scale-98 transition' : ''}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function RentalStatusBadge({ status }) {
  const map = {
    reserviert: 'bg-amber-100 text-amber-700',
    ausgeliehen: 'bg-blue-100 text-blue-700',
    zurückgegeben: 'bg-green-100 text-green-700',
    storniert: 'bg-gray-100 text-gray-500',
  };
  return <span className={`badge ${map[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [active, setActive] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      statsApi.get(),
      rentalsApi.getAll({ upcoming: true, limit: 5 }),
      rentalsApi.getAll({ status: 'ausgeliehen', limit: 5 }),
    ]).then(([s, u, a]) => {
      setStats(s.data);
      setUpcoming(u.data.rentals);
      setActive(a.data.rentals);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Übersicht</h2>
        <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, d. MMMM yyyy', { locale: de })}</p>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Package} label="Gegenstände" value={stats?.items.total ?? 0}
          sub={`${stats?.items.total_quantity ?? 0} Einheiten`} color="bg-blue-500" to="/items" />
        <StatCard icon={Calendar} label="Aktive Verleihe" value={stats?.rentals.active ?? 0}
          sub={`${stats?.rentals.reserved ?? 0} reserviert`} color="bg-amber-500" to="/rentals" />
        <StatCard icon={Building2} label="Lagerhallen" value={stats?.warehouses ?? 0}
          color="bg-emerald-500" to="/warehouses" />
        <StatCard icon={Tag} label="Kategorien" value={stats?.categories ?? 0}
          color="bg-purple-500" to="/categories" />
      </div>

      {/* Gesamtwert */}
      {stats?.items.total_value > 0 && (
        <div className="card p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
          <div className="flex items-center gap-3">
            <TrendingUp size={20} className="text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Inventarwert gesamt</p>
              <p className="text-2xl font-bold text-blue-700">
                {stats.items.total_value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Aktive Verleihe */}
      {active.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle size={18} className="text-blue-500" />
              Aktuell ausgeliehen
            </h3>
            <Link to="/rentals?status=ausgeliehen" className="text-sm text-blue-600 font-medium">Alle</Link>
          </div>
          <div className="flex flex-col gap-2">
            {active.map(r => (
              <Link key={r.id} to={`/rentals`} className="card p-3.5 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{r.item_name}</p>
                  <p className="text-sm text-gray-500 truncate">{r.borrower_name} · {r.quantity}×</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <RentalStatusBadge status={r.status} />
                  <p className="text-xs text-gray-400 mt-1">
                    bis {format(new Date(r.end_date), 'd.M.', { locale: de })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Bevorstehende Reservierungen */}
      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={18} className="text-amber-500" />
              Bevorstehend
            </h3>
            <Link to="/rentals?status=reserviert" className="text-sm text-blue-600 font-medium">Alle</Link>
          </div>
          <div className="flex flex-col gap-2">
            {upcoming.map(r => (
              <Link key={r.id} to="/rentals" className="card p-3.5 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{r.item_name}</p>
                  <p className="text-sm text-gray-500 truncate">{r.borrower_name} · {r.quantity}×</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <RentalStatusBadge status={r.status} />
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(r.start_date), 'd.M.', { locale: de })}–{format(new Date(r.end_date), 'd.M.', { locale: de })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {active.length === 0 && upcoming.length === 0 && (
        <div className="card p-8 text-center">
          <CheckCircle size={40} className="mx-auto text-green-400 mb-3" />
          <p className="text-gray-500">Keine aktiven oder bevorstehenden Verleihe</p>
        </div>
      )}
    </div>
  );
}
