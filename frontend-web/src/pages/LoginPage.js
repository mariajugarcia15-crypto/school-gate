// src/pages/LoginPage.js
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ color: 'var(--primary)', fontSize: 28, fontWeight: 800 }}>EduGate</h1>
          <p style={{ color: 'var(--gray-500)', marginTop: 6, fontSize: 14 }}>Sistema de Control de Acceso Escolar</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <input
              className="form-input"
              type="email"
              placeholder="usuario@colegio.edu.co"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8, padding: '11px', justifyContent: 'center' }}>
            {loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Ingresar'}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 12, color: 'var(--gray-500)', textAlign: 'center' }}>
          Demo: portero@colegio.edu.co / portero123
        </p>
      </div>
    </div>
  );
}
