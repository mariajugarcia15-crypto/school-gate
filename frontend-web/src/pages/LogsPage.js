// src/pages/LogsPage.js
import { useState, useEffect } from 'react';
import { logService } from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket';

const EVENT_LABEL = { EXIT: 'Salida', ENTRY: 'Entrada', DENIED: 'Denegado' };
const EVENT_BADGE = { EXIT: 'badge-success', ENTRY: 'badge-info', DENIED: 'badge-danger' };

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ plate: '', eventType: '', from: '', to: '' });

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await logService.getAll({ ...filters, page: p, limit: 20 });
      setLogs(res.data.logs);
      setTotal(res.data.total);
      setPage(p);
    } catch { toast.error('Error cargando historial'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, [filters]);

  useSocket({ 'log:created': () => load(1) });

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Historial de acceso</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 2 }}>{total} registros encontrados</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Placa</label>
            <input className="form-input" placeholder="ABC123" value={filters.plate} onChange={e => setFilter('plate', e.target.value.toUpperCase())} />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo evento</label>
            <select className="form-select" value={filters.eventType} onChange={e => setFilter('eventType', e.target.value)}>
              <option value="">Todos</option>
              <option value="EXIT">Salidas</option>
              <option value="ENTRY">Entradas</option>
              <option value="DENIED">Denegados</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Desde</label>
            <input className="form-input" type="date" value={filters.from} onChange={e => setFilter('from', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Hasta</label>
            <input className="form-input" type="date" value={filters.to} onChange={e => setFilter('to', e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setFilters({ plate: '', eventType: '', from: '', to: '' })}>Limpiar</button>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : logs.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 32 }}>No hay registros con esos filtros</p>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Placa</th>
                  <th>Propietario</th>
                  <th>Estudiantes</th>
                  <th>Evento</th>
                  <th>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 13, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                      {format(new Date(log.createdAt), "d MMM yyyy", { locale: es })}
                      <br />
                      <strong style={{ color: 'var(--gray-700)' }}>{format(new Date(log.createdAt), 'HH:mm')}</strong>
                    </td>
                    <td>
                      <span className="plate-display" style={{ fontSize: 13, padding: '2px 8px', letterSpacing: 2 }}>{log.plate}</span>
                    </td>
                    <td style={{ fontSize: 14 }}>
                      {log.vehicle?.ownerName || '—'}
                      <br />
                      <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{log.vehicle?.brand} {log.vehicle?.color}</span>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {log.students?.length > 0
                        ? log.students.map(s => s.name).join(', ')
                        : <span style={{ color: 'var(--gray-500)' }}>—</span>}
                    </td>
                    <td>
                      <span className={`badge ${log.authorized ? EVENT_BADGE[log.eventType] : 'badge-danger'}`}>
                        {log.authorized ? EVENT_LABEL[log.eventType] : 'Denegado'}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--gray-500)' }}>{log.user?.name || 'Sistema'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {total > 20 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20, fontSize: 14 }}>
                <button className="btn btn-ghost" disabled={page === 1} onClick={() => load(page - 1)} style={{ padding: '6px 14px' }}>← Anterior</button>
                <span style={{ color: 'var(--gray-500)' }}>Página {page} de {Math.ceil(total / 20)}</span>
                <button className="btn btn-ghost" disabled={page >= Math.ceil(total / 20)} onClick={() => load(page + 1)} style={{ padding: '6px 14px' }}>Siguiente →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
