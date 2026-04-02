import { useState, useEffect, useCallback } from 'react';
import { userApi } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────
function initials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Role Badge ───────────────────────────────────────────────
const ROLE_META = {
  OWNER:         { label: 'Owner',   cls: 'badge-navy' },
  COMPANY_ADMIN: { label: 'Admin',   cls: 'badge-navy' },
  MANAGER:       { label: 'Manager', cls: 'badge-gold' },
  USER:          { label: 'User',    cls: 'badge-gray' },
};

function RoleBadge({ role }) {
  const meta = ROLE_META[role] ?? { label: role, cls: 'badge-gray' };
  return <span className={meta.cls}>{meta.label}</span>;
}

// ─── Avatar ───────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-navy text-cream',
  'bg-gold text-navy',
  'bg-maroon text-cream',
  'bg-emerald-600 text-white',
  'bg-purple-600 text-white',
];

function Avatar({ name, index = 0 }) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-body font-bold text-sm ${color}`}>
      {initials(name) || '?'}
    </div>
  );
}

// ─── Add User Modal ───────────────────────────────────────────
const BLANK_FORM = { name: '', email: '', role: 'USER', password: '' };

function AddUserModal({ onClose, onSaved }) {
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password || form.password.length < 6) e.password = 'Min 6 characters';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      // userApi.create doesn't exist yet — use a placeholder that won't break the UI
      // The endpoint would typically be POST /users or POST /auth/register-user
      await userApi.update('new', form); // will 404, caught below
      toast.success('User created');
      onSaved();
    } catch {
      toast.error('Failed to create user. Check API support.');
    } finally {
      setSaving(false);
    }
  }

  function field(key, label, type = 'text', opts = {}) {
    return (
      <div>
        <label className="block font-body text-sm font-semibold text-navy mb-1">{label}</label>
        <input
          type={type}
          className={`input-field ${errors[key] ? 'border-red-400 ring-1 ring-red-300' : ''}`}
          value={form[key]}
          onChange={(e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setErrors((er) => ({ ...er, [key]: '' })); }}
          {...opts}
        />
        {errors[key] && <p className="font-body text-xs text-red-600 mt-1">{errors[key]}</p>}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl2 shadow-premium-lg w-full max-w-md p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-2xl font-bold text-navy">Add New User</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-cream text-muted hover:text-navy transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {field('name', 'Full Name', 'text', { placeholder: 'e.g. Priya Sharma' })}
          {field('email', 'Email Address', 'email', { placeholder: 'priya@example.com' })}
          <div>
            <label className="block font-body text-sm font-semibold text-navy mb-1">Role</label>
            <select
              className="input-field"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              <option value="USER">User</option>
              <option value="MANAGER">Manager</option>
              <option value="COMPANY_ADMIN">Company Admin</option>
            </select>
          </div>
          {field('password', 'Password', 'password', { placeholder: 'Min 6 characters' })}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1 py-2.5">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">
              {saving ? 'Saving…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────
function Pagination({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t border-border">
      <p className="font-body text-sm text-muted">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className="px-4 py-1.5 rounded-lg border border-border font-body text-sm font-semibold text-navy disabled:opacity-40 hover:bg-cream transition-colors"
        >
          ← Prev
        </button>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className="px-4 py-1.5 rounded-lg border border-border font-body text-sm font-semibold text-navy disabled:opacity-40 hover:bg-cream transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────
const LIMIT = 10;

export default function AdminUsers() {
  const { user: authUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = { page, limit: LIMIT };
    if (search.trim()) params.search = search.trim();
    if (roleFilter) params.role = roleFilter;
    userApi
      .getAll(params)
      .then((res) => {
        const d = res.data?.data ?? res.data;
        // Handle both array and paginated object shapes
        if (Array.isArray(d)) {
          setUsers(d);
          setTotalPages(1);
        } else {
          setUsers(d?.users ?? d?.items ?? d?.data ?? []);
          setTotalPages(d?.totalPages ?? d?.pages ?? 1);
        }
      })
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Debounce search resets page
  useEffect(() => { setPage(1); }, [search, roleFilter]);

  async function toggleStatus(u) {
    setTogglingId(u._id ?? u.id);
    try {
      await userApi.update(u._id ?? u.id, { isActive: !u.isActive });
      toast.success(`User ${u.isActive ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch {
      toast.error('Failed to update user status.');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="font-body text-muted text-sm">Manage all members and their roles.</p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowAddModal(true)}
        >
          <span className="text-lg leading-none">+</span> Add User
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl font-body text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-base pointer-events-none">🔍</span>
            <input
              type="text"
              placeholder="Search by name or email…"
              className="input-field pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* Role Filter */}
          <select
            className="input-field sm:w-48"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="COMPANY_ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="USER">User</option>
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-cream border-b border-border">
                {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-body text-xs font-semibold text-muted uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: LIMIT }).map((_, i) => <SkeletonRow key={i} />)
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center font-body text-muted">
                    No users found.{search || roleFilter ? ' Try adjusting your filters.' : ''}
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => {
                  const uid = u._id ?? u.id;
                  const isToggling = togglingId === uid;
                  return (
                    <tr key={uid} className="hover:bg-cream/50 transition-colors">
                      {/* Avatar + Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} index={idx} />
                          <span className="font-body font-semibold text-navy text-sm">{u.name}</span>
                        </div>
                      </td>
                      {/* Email */}
                      <td className="px-4 py-3 font-body text-sm text-muted">{u.email}</td>
                      {/* Role */}
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 font-body text-sm">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              u.isActive !== false ? 'bg-emerald-500' : 'bg-red-400'
                            }`}
                          />
                          {u.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {/* Joined */}
                      <td className="px-4 py-3 font-body text-sm text-muted whitespace-nowrap">
                        {fmtDate(u.createdAt)}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          disabled={isToggling}
                          onClick={() => toggleStatus(u)}
                          className={`font-body text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                            u.isActive !== false
                              ? 'border-red-300 text-red-600 hover:bg-red-50'
                              : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {isToggling ? '…' : u.isActive !== false ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && users.length > 0 && (
          <div className="px-4 pb-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </div>
        )}
      </div>

      {/* ── Add User Modal ── */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchUsers(); }}
        />
      )}
    </div>
  );
}
