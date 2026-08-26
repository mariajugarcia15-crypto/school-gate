// src/components/Layout.js
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/',        label: 'Dashboard',   icon: '◈', roles: ['ADMIN','SECRETARIA','PORTERO'] },
  { to: '/gate',    label: 'Portería',    icon: '⬡', roles: ['ADMIN','SECRETARIA','PORTERO'] },
  { to: '/vehicles',label: 'Vehículos',   icon: '◻', roles: ['ADMIN','SECRETARIA'] },
  { to: '/students',label: 'Estudiantes', icon: '◑', roles: ['ADMIN','SECRETARIA'] },
  { to: '/permits', label: 'Permisos',    icon: '◇', roles: ['ADMIN','SECRETARIA'] },
  { to: '/logs',    label: 'Historial',   icon: '▤',  roles: ['ADMIN','SECRETARIA','PORTERO'] },
];

const roleLabel = { ADMIN: 'Administrador', SECRETARIA: 'Secretaria', PORTERO: 'Portero' };
const roleBadgeClass = { ADMIN: 'badge-danger', SECRETARIA: 'badge-info', PORTERO: 'badge-success' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: '#fff', borderRight: '1px solid var(--gray-200)', display: 'flex', flexDirection: 'column', padding: '20px 12px' }}>
        <div style={{ marginBottom: 28, padding: '0 6px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>EduGate</h2>
          <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>Control de acceso</p>
        </div>

        <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {navItems
            .filter(item => item.roles.includes(user?.role))
            .map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => isActive ? 'active' : ''}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
        </nav>

        <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 16, marginTop: 16 }}>
          <div style={{ padding: '0 6px', marginBottom: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 500 }}>{user?.name}</p>
            <span className={`badge ${roleBadgeClass[user?.role] || 'badge-gray'}`} style={{ marginTop: 4 }}>
              {roleLabel[user?.role]}
            </span>
          </div>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 13 }} onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
