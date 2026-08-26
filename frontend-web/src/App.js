// src/App.js
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import GatePage from './pages/GatePage';
import VehiclesPage from './pages/VehiclesPage';
import StudentsPage from './pages/StudentsPage';
import PermitsPage from './pages/PermitsPage';
import LogsPage from './pages/LogsPage';
import './index.css';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="gate" element={<GatePage />} />
        <Route path="vehicles" element={<PrivateRoute roles={['ADMIN','SECRETARIA']}><VehiclesPage /></PrivateRoute>} />
        <Route path="students" element={<PrivateRoute roles={['ADMIN','SECRETARIA']}><StudentsPage /></PrivateRoute>} />
        <Route path="permits" element={<PrivateRoute roles={['ADMIN','SECRETARIA']}><PermitsPage /></PrivateRoute>} />
        <Route path="logs" element={<LogsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
