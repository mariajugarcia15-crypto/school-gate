// src/pages/DashboardPage.js
import { useState, useEffect } from 'react';
import { logService } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([logService.getStats(), logService.getToday()]);
      setStats(statsRes.data);
      setRecentLogs(logsRes.data.slice(0, 10));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useSocket({
    'log:created': (log) => {
      setRecentLogs((prev) => [log, ...prev.slice(0, 9)]);
      setStats((prev) => prev ? { ...prev, todayTotal: prev.todayTotal + 1, todayAuthorized: prev.todayAuthorized + (log.authorized ? 1 : 0), todayDenied: prev.todayDenied + (log.authorized ? 0 : 1) } : prev);
    },
  });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner" /></div>;

  const statItems = [
    { label: 'Registros hoy', value: stats?.todayTotal ?? 0, color: 'var(--primary)' },
    { label: 'Autorizados', value: stats?.todayAuthorized ?? 0, color: 'var(--success)' },
    { label: 'Denegados', value: stats?.todayDenied ?? 0, color: 'var(--danger)' },
    { label: 'Vehículos activos', value: stats?.totalVehicles ?? 0, color: 'var(--gray-700)' },
    { label: 'Estudiantes', value: stats?.totalStudents ?? 0, color: 'var(--gray-700)' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 2 }}>
            {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 28 }}>
        {statItems.map((s) => (
          <div className="stat-card" key={s.label}>
            <p className="stat-label">{s.label}</p>
            <p className="stat-value" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Actividad reciente hoy</h3>
        {recentLogs.length === 0 ? (
          <p style={{ color: 'var(--gray-500)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>Sin registros por ahora</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Placa</th>
                <th>Vehículo</th>
                <th>Estudiantes</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--gray-500)', fontSize: 13 }}>
                    {format(new Date(log.createdAt), 'HH:mm')}
                  </td>
                  <td><span className="plate-display" style={{ fontSize: 14, padding: '3px 10px', letterSpacing: 2 }}>{log.plate}</span></td>
                  <td>{log.vehicle?.brand} {log.vehicle?.color}</td>
                  <td style={{ fontSize: 13 }}>{log.students?.map(s => s.name).join(', ') || '—'}</td>
                  <td>
                    <span className={`badge ${log.authorized ? 'badge-success' : 'badge-danger'}`}>
                      {log.authorized ? 'Autorizado' : 'Denegado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
