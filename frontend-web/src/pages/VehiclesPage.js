// src/pages/VehiclesPage.js
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { vehicleService, studentService } from '../services/api';

const TYPE_LABEL = { CAR: 'Carro', MOTORCYCLE: 'Moto', VAN: 'Camioneta', BUS: 'Bus' };
const EMPTY_FORM = { plate: '', brand: '', model: '', color: '', ownerName: '', ownerPhone: '', ownerDni: '', vehicleType: 'CAR', studentIds: [] };

function VehicleModal({ vehicle, students, onClose, onSaved }) {
  const [form, setForm] = useState(vehicle ? {
    plate: vehicle.plate, brand: vehicle.brand || '', model: vehicle.model || '',
    color: vehicle.color || '', ownerName: vehicle.ownerName, ownerPhone: vehicle.ownerPhone || '',
    ownerDni: vehicle.ownerDni || '', vehicleType: vehicle.vehicleType,
    studentIds: vehicle.students?.map(vs => vs.student.id) || [],
  } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleStudent = (id) => {
    setForm(f => ({
      ...f,
      studentIds: f.studentIds.includes(id) ? f.studentIds.filter(s => s !== id) : [...f.studentIds, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'studentIds') v.forEach(id => fd.append('studentIds', id));
        else if (v !== '') fd.append(k, v);
      });
      if (vehicle) await vehicleService.update(vehicle.id, fd);
      else await vehicleService.create(fd);
      toast.success(vehicle ? 'Vehículo actualizado' : 'Vehículo registrado');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="card" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2>{vehicle ? 'Editar vehículo' : 'Registrar vehículo'}</h2>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px 10px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Placa *</label>
              <input className="form-input" required value={form.plate} onChange={e => set('plate', e.target.value.toUpperCase())}
                placeholder="ABC123" maxLength={7} style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 3 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="form-select" value={form.vehicleType} onChange={e => set('vehicleType', e.target.value)}>
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Marca</label>
              <input className="form-input" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Toyota" />
            </div>
            <div className="form-group">
              <label className="form-label">Modelo</label>
              <input className="form-input" value={form.model} onChange={e => set('model', e.target.value)} placeholder="Hilux" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Color</label>
            <input className="form-input" value={form.color} onChange={e => set('color', e.target.value)} placeholder="Blanca" />
          </div>

          <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
            <h3 style={{ fontSize: 14, marginBottom: 12 }}>Datos del propietario</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Nombre completo *</label>
                <input className="form-input" required value={form.ownerName} onChange={e => set('ownerName', e.target.value)} placeholder="Carlos Martínez" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="form-input" value={form.ownerPhone} onChange={e => set('ownerPhone', e.target.value)} placeholder="3101234567" />
                </div>
                <div className="form-group">
                  <label className="form-label">Cédula</label>
                  <input className="form-input" value={form.ownerDni} onChange={e => set('ownerDni', e.target.value)} placeholder="12345678" />
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
            <h3 style={{ fontSize: 14, marginBottom: 12 }}>Estudiantes vinculados</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {students.map((s) => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: form.studentIds.includes(s.id) ? 'var(--primary-light)' : 'var(--gray-50)', borderRadius: 'var(--radius)', cursor: 'pointer', border: '1px solid', borderColor: form.studentIds.includes(s.id) ? 'var(--primary)' : 'var(--gray-200)' }}>
                  <input type="checkbox" checked={form.studentIds.includes(s.id)} onChange={() => toggleStudent(s.id)} />
                  <span style={{ flex: 1, fontSize: 14 }}>{s.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>Grado {s.grade}{s.section}</span>
                </label>
              ))}
            </div>
            {form.studentIds.length > 0 && (
              <p style={{ fontSize: 12, color: 'var(--primary)', marginTop: 6 }}>{form.studentIds.length} estudiante(s) seleccionado(s)</p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : vehicle ? 'Guardar cambios' : 'Registrar vehículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | vehicle object

  const load = async () => {
    setLoading(true);
    try {
      const [vRes, sRes] = await Promise.all([vehicleService.getAll({ search }), studentService.getAll()]);
      setVehicles(vRes.data);
      setStudents(sRes.data);
    } catch { toast.error('Error cargando datos'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Desactivar este vehículo?')) return;
    await vehicleService.delete(id);
    toast.success('Vehículo desactivado');
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Vehículos registrados</h1>
        <button className="btn btn-primary" onClick={() => setModal('new')}>+ Registrar vehículo</button>
      </div>

      <div className="card">
        <input className="form-input" placeholder="Buscar por placa o propietario..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 340, marginBottom: 16 }} />

        {loading ? <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
          <table className="table">
            <thead><tr><th>Placa</th><th>Tipo</th><th>Vehículo</th><th>Propietario</th><th>Estudiantes</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td><span className="plate-display" style={{ fontSize: 13, padding: '2px 8px', letterSpacing: 2 }}>{v.plate}</span></td>
                  <td><span className="badge badge-gray">{TYPE_LABEL[v.vehicleType]}</span></td>
                  <td>{v.brand} {v.model} <span style={{ color: 'var(--gray-500)', fontSize: 13 }}>{v.color}</span></td>
                  <td>{v.ownerName}<br /><span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{v.ownerPhone}</span></td>
                  <td style={{ fontSize: 13 }}>{v.students?.map(vs => vs.student.name).join(', ') || '—'}</td>
                  <td><span className={`badge ${v.active ? 'badge-success' : 'badge-danger'}`}>{v.active ? 'Activo' : 'Inactivo'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setModal(v)}>Editar</button>
                      <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDelete(v.id)}>Desactivar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 32 }}>No hay vehículos registrados</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <VehicleModal
          vehicle={modal === 'new' ? null : modal}
          students={students}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
