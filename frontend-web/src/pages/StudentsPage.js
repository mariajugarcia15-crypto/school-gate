// src/pages/StudentsPage.js
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { studentService } from '../services/api';

function StudentModal({ student, onClose, onSaved }) {
  const [form, setForm] = useState({ name: student?.name || '', grade: student?.grade || '', section: student?.section || '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      if (student) await studentService.update(student.id, fd);
      else await studentService.create(fd);
      toast.success(student ? 'Estudiante actualizado' : 'Estudiante registrado');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2>{student ? 'Editar estudiante' : 'Registrar estudiante'}</h2>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px 10px' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Nombre completo *</label>
            <input className="form-input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Sofía Martínez" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Grado *</label>
              <input className="form-input" required value={form.grade} onChange={e => set('grade', e.target.value)} placeholder="5" />
            </div>
            <div className="form-group">
              <label className="form-label">Sección *</label>
              <input className="form-input" required value={form.section} onChange={e => set('section', e.target.value.toUpperCase())} placeholder="B" maxLength={2} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : student ? 'Guardar cambios' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await studentService.getAll({ search });
      setStudents(res.data);
    } catch { toast.error('Error cargando estudiantes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Desactivar este estudiante?')) return;
    await studentService.delete(id);
    toast.success('Estudiante desactivado');
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Estudiantes</h1>
        <button className="btn btn-primary" onClick={() => setModal('new')}>+ Registrar estudiante</button>
      </div>
      <div className="card">
        <input className="form-input" placeholder="Buscar por nombre o grado..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 340, marginBottom: 16 }} />
        {loading ? <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
          <table className="table">
            <thead><tr><th>Nombre</th><th>Grado</th><th>Vehículos autorizados</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar">{s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                      <span style={{ fontWeight: 500 }}>{s.name}</span>
                    </div>
                  </td>
                  <td>Grado {s.grade}{s.section}</td>
                  <td style={{ fontSize: 13 }}>
                    {s.vehicleLinks?.map(vl => (
                      <span key={vl.id} className="badge badge-gray" style={{ marginRight: 4 }}>{vl.vehicle.plate}</span>
                    ))}
                    {!s.vehicleLinks?.length && <span style={{ color: 'var(--gray-500)' }}>Sin vehículo</span>}
                  </td>
                  <td><span className={`badge ${s.active ? 'badge-success' : 'badge-danger'}`}>{s.active ? 'Activo' : 'Inactivo'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setModal(s)}>Editar</button>
                      <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDelete(s.id)}>Desactivar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 32 }}>No hay estudiantes registrados</td></tr>}
            </tbody>
          </table>
        )}
      </div>
      {modal && (
        <StudentModal
          student={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
