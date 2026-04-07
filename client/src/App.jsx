import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Items from './pages/Items';
import ItemDetail from './pages/ItemDetail';
import Rentals from './pages/Rentals';
import Warehouses from './pages/Warehouses';
import Categories from './pages/Categories';
import Import from './pages/Import';
import Users from './pages/Users';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Wird geladen...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
      <Route path="/items" element={<PrivateRoute><Layout><Items /></Layout></PrivateRoute>} />
      <Route path="/items/:id" element={<PrivateRoute><Layout><ItemDetail /></Layout></PrivateRoute>} />
      <Route path="/rentals" element={<PrivateRoute><Layout><Rentals /></Layout></PrivateRoute>} />
      <Route path="/warehouses" element={<PrivateRoute><Layout><Warehouses /></Layout></PrivateRoute>} />
      <Route path="/categories" element={<PrivateRoute><Layout><Categories /></Layout></PrivateRoute>} />
      <Route path="/import" element={<PrivateRoute><AdminRoute><Layout><Import /></Layout></AdminRoute></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute><AdminRoute><Layout><Users /></Layout></AdminRoute></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
