import { useState, useEffect } from 'react';
import { companyApi, billingApi } from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_DOT = { true: 'bg-green-400', false: 'bg-red-400' };
const PLAN_COLORS = {
  FREE: 'bg-gray-100 text-gray-600',
  STARTER: 'bg-blue-100 text-blue-700',
  PROFESSIONAL: 'bg-yellow-100 text-yellow-700',
  ENTERPRISE: 'bg-purple-100 text-purple-700',
};

export default function OwnerCompanies() {
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', adminEmail: '', adminName: '', planId: '' });
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await companyApi.getAll({ page, search: search || undefined, limit: 15 });
      setCompanies(res.data?.data || []);
      setPagination(res.data?.pagination || {});
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { billingApi.getPlans().then(r => setPlans(r.data?.data || [])).catch(() => {}); }, []);
  useEffect(() => { load(); }, [page, search]);

  const handleCreate = async () => {
    if (!form.name || !form.slug || !form.adminEmail || !form.planId) {
      toast.error('All fields required');
      return;
    }
    setCreating(true);
    try {
      await companyApi.create(form);
      toast.success('Company created!');
      setShowCreate(false);
      setForm({ name: '', slug: '', adminEmail: '', adminName: '', planId: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Creation failed');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (company) => {
    setToggling(company.id);
    try {
      await companyApi.update(company.id, { isActive: !company.isActive });
      setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, isActive: !c.isActive } : c));
      toast.success(`Company ${company.isActive ? 'deactivated' : 'activated'}`);
    } catch {
      toast.error('Update failed');
    } finally {
      setToggling(null);
    }
  };

  const stats = {
    total: pagination.total || companies.length,
    active: companies.filter(c => c.isActive).length,
    inactive: companies.filter(c => !c.isActive).length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-navy-800">All Companies</h1>
          <p className="text-gray-500 mt-1">Manage all tenant companies on the platform</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-navy-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-navy-700 transition"
        >
          + New Company
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Companies', value: stats.total, color: 'text-navy-800' },
          { label: 'Active', value: stats.active, color: 'text-green-600' },
          { label: 'Inactive', value: stats.inactive, color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search companies by name or slug…"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : companies.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">🏢</p>
            <p>No companies found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-navy-800 text-left">
              <tr>
                {['Company', 'Slug', 'Plan', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map(company => (
                <tr key={company.id} className="hover:bg-cream-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs"
                        style={{ backgroundColor: company.primaryColor || '#1a3c6e' }}>
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-navy-800">{company.name}</p>
                        {company.tagline && <p className="text-xs text-gray-400 truncate max-w-[160px]">{company.tagline}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{company.slug}</td>
                  <td className="px-4 py-3">
                    {company.subscription?.plan ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[company.subscription.plan.name] || 'bg-gray-100 text-gray-600'}`}>
                        {company.subscription.plan.name}
                      </span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${STATUS_DOT[company.isActive]}`} />
                      <span className={`text-xs font-medium ${company.isActive ? 'text-green-700' : 'text-red-500'}`}>
                        {company.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(company.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <a href={`/c/${company.slug}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline">View</a>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => toggleActive(company)}
                        disabled={toggling === company.id}
                        className={`text-xs font-medium ${company.isActive ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                      >
                        {toggling === company.id ? '…' : company.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {(pagination.totalPages || 1) > 1 && (
        <div className="flex justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">
            ← Prev
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {page} of {pagination.totalPages}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">
            Next →
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-navy-800 text-lg">Create Company</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {[
              { key: 'name', label: 'Company Name', placeholder: 'Acme Academy' },
              { key: 'slug', label: 'Slug (URL)', placeholder: 'acme-academy' },
              { key: 'adminEmail', label: 'Admin Email', placeholder: 'admin@acme.com' },
              { key: 'adminName', label: 'Admin Name', placeholder: 'John Admin' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  value={form[key]}
                  onChange={e => {
                    let val = e.target.value;
                    if (key === 'slug') val = val.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                    setForm(p => ({ ...p, [key]: val }));
                  }}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
              <select value={form.planId} onChange={e => setForm(p => ({ ...p, planId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300">
                <option value="">Select a plan</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.displayName || p.name} — ₹{Number(p.price).toLocaleString('en-IN')}/{p.billingCycle?.toLowerCase()}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={creating} className="flex-1 py-2 bg-navy-800 text-white rounded-xl text-sm font-semibold disabled:opacity-60 hover:bg-navy-700">
                {creating ? 'Creating…' : 'Create Company'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
