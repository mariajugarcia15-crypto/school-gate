// src/pages/PermitsPage.js
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { permitService, vehicleService, studentService } from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSocket } from '../hooks/useSocket';

function PermitModal({ vehicles, students, onClose, onSaved }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState({ vehicleId: '', studentId: '', validDate: today, reason: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await permitService.create(form);
      toast.success('Permiso temporal creado');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear permiso');
    } finally {
      setSaving(false);
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === form.vehicleId);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="card" style={{ width: '100%', maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2>Permiso temporal de un día</h2>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>Para cuando un padre pide a otro recoger a su hijo(a)</p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px 10px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Date */}
          <div className="form-group">
            <label className="form-label">Fecha del permiso *</label>
            <input className="form-input" type="date" required min={today} value={form.validDate} onChange={e => set('validDate', e.target.value)} />
            {form.validDate === today && (
              <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>Válido para hoy</p>
            )}
          </div>

          {/* Vehicle */}
          <div className="form-group">
            <label className="form-label">Vehículo que va a recoger *</label>
            <select className="form-select" required value={form.vehicleId} onChange={e => set('vehicleId', e.target.value)}>
              <option value="">Seleccionar vehículo...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.plate} — {v.ownerName} ({v.brand} {v.color})</option>
              ))}
            </select>
            {selectedVehicle && (
              <div style={{ marginTop: 6, padding: '8px 12px', background: 'var(--primary-light)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', letterSpacing: 2 }}>{selectedVehicle.plate}</span>
                {' · '}{selectedVehicle.ownerName} · {selectedVehicle.ownerPhone}
              </div>
            )}
          </div>

          {/* Student */}
          <div className="form-group">
            <label className="form-label">Estudiante que va a salir *</label>
            <select className="form-select" required value={form.studentId} onChange={e => set('studentId', e.target.value)}>
              <option value="">Seleccionar estudiante...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} — Grado {s.grade}{s.section}</option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div className="form-group">
            <label className="form-label">Motivo (opcional)</label>
            <textarea
              className="form-input"
              rows={3}
              value={form.reason}
              onChange={e => set('reason', e.target.value)}
              placeholder="Ej: Los padres de Luis están de viaje. Carlos Martínez lo recoge hoy."
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Warning box */}
          <div style={{ background: 'var(--warning-light)', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 13, color: 'var(--warning)' }}>
            Este permiso es válido únicamente para la fecha seleccionada y se desactivará automáticamente al siguiente día.
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Crear permiso temporal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PermitsPage() {
  const [permits, setPermits] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('today'); // 'today' | 'all'

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, vRes, sRes] = await Promise.all([
        filter === 'today' ? permitService.getToday() : permitService.getAll(),
        vehicleService.getAll(),
        studentService.getAll(),
      ]);
      setPermits(pRes.data);
      setVehicles(vRes.data);
      setStudents(sRes.data);
    } catch { toast.error('Error cargando permisos'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  useSocket({ 'permit:created': () => load() });

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este permiso?')) return;
    await permitService.delete(id);
    toast.success('Permiso eliminado');
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Permisos temporales</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 2 }}>Permisos de un solo día autorizados por la secretaría</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nuevo permiso</button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className={`btn ${filter === 'today' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('today')}>Hoy</button>
          <button className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('all')}>Todos</button>
        </div>

        {loading ? <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : permits.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 32 }}>
            {filter === 'today' ? 'No hay permisos temporales para hoy' : 'No hay permisos registrados'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {permits.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: '1px solid', borderColor: p.used ? 'var(--gray-200)' : '#fde68a', borderRadius: 'var(--radius)', background: p.used ? 'var(--gray-50)' : 'var(--warning-light)', opacity: p.used ? 0.7 : 1 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span className="plate-display" style={{ fontSize: 14, padding: '3px 10px', letterSpacing: 2 }}>{p.vehicle?.plate}</span>
                    <span style={{ fontSize: 13, color: 'var(--gray-700)' }}>{p.vehicle?.ownerName}</span>
                  </div>
                  <p style={{ fontSize: 14 }}>
                    Recoge a: <strong>{p.student?.name}</strong>
                    <span style={{ color: 'var(--gray-500)', marginLeft: 6, fontSize: 13 }}>Grado {p.student?.grade}{p.student?.section}</span>
                  </p>
                  {p.reason && <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>Motivo: {p.reason}</p>}
                  <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                    Fecha: {format(new Date(p.validDate), "d 'de' MMMM yyyy", { locale: es })}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span className={`badge ${p.used ? 'badge-gray' : 'badge-warning'}`}>
                    {p.used ? 'Usado' : 'Pendiente'}
                  </span>
                  {!p.used && (
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12, color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDelete(p.id)}>
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <PermitModal
          vehicles={vehicles}
          students={students}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
