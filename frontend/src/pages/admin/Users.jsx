import { useState, useEffect } from 'react';
import { UserCog, Plus, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';

const ROLES = [
  { value: 'admin', label: 'Admin' },
];

const initForm = { name: '', email: '', password: '', role: 'admin', is_active: 1 };

export default function Users() {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(null); // 'create' | { ...user }
  const [form, setForm]     = useState(initForm);
  const [saving, setSaving] = useState(false);

  const fetch = () => {
    setLoading(true);
    api.get('/users.php?action=list')
      .then(res => setUsers(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setForm(initForm); setModal('create'); };
  const openEdit   = (u) => { setForm({ ...u, password: '' }); setModal(u); };
  const closeModal = ()  => { setModal(null); setForm(initForm); };

  const handleSave = async () => {
    if (!form.name || !form.email) { toast.error('Name and email are required.'); return; }
    if (modal === 'create' && !form.password) { toast.error('Password is required for new users.'); return; }
    setSaving(true);
    try {
      if (modal === 'create') {
        await api.post('/users.php?action=create', form);
        toast.success('User created successfully.');
      } else {
        await api.put(`/users.php?action=update&id=${modal.id}`, form);
        toast.success('User updated.');
      }
      closeModal();
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      await api.delete(`/users.php?id=${id}`);
      toast.success('User deleted.');
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete.');
    }
  };

  const roleName = (role) => ROLES.find(r => r.value === role)?.label || role;

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserCog size={24} color="var(--primary)" /> User Management
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Manage admin accounts and roles</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>
                      <span style={{
                        background: '#EBF5FB', color: 'var(--primary)',
                        padding: '3px 10px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700
                      }}>
                        {roleName(u.role)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                      {u.last_login ? new Date(u.last_login).toLocaleDateString('en-PH') : 'Never'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)}>
                          <Pencil size={13} /> Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h3>{modal === 'create' ? 'Add New User' : 'Edit User'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input type="text" className="form-control" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email <span className="required">*</span></label>
                <input type="email" className="form-control" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Password {modal !== 'create' && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(leave blank to keep current)</span>}</label>
                <input type="password" className="form-control" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 8 characters" />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-control" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {modal !== 'create' && (
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-control" value={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.value }))}>
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner-sm" /> Saving...</> : 'Save User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
