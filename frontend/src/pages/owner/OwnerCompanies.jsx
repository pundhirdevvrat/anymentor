import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { companyApi, billingApi, analyticsApi } from '../../services/api';
import toast from 'react-hot-toast';

const PLAN_COLORS = {
  FREE: 'bg-gray-100 text-gray-600',
  STARTER: 'bg-blue-100 text-blue-700',
  PROFESSIONAL: 'bg-yellow-100 text-yellow-800',
  ENTERPRISE: 'bg-purple-100 text-purple-700',
};

const FEATURES = [
  { key: 'hasLms', label: 'LMS' },
  { key: 'hasEcommerce', label: 'E-commerce' },
  { key: 'hasCrm', label: 'CRM' },
  { key: 'hasAnalytics', label: 'Analytics' },
  { key: 'hasSupport', label: 'Support' },
];

const DEFAULT_FORM = {
  name: '', slug: '', adminEmail: '', adminName: '', planId: '',
  hasLms: true, hasEcommerce: true, hasCrm: true, hasAnalytics: true, hasSupport: true,
};

function StatCard({ label, value, sub, color = 'text-navy-800', bg = 'bg-white' }) {
  return (
    <div className={`${bg} rounded-2xl p-5 border border-gray-100 shadow-sm`}>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function OwnerCompanies() {
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans]         = useState([]);
  const [overview, setOverview]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');   // ALL | ACTIVE | INACTIVE
  const [filterPlan, setFilterPlan]     = useState('ALL');
  const [sortBy, setSortBy]       = useState('createdAt');   // createdAt | name
  const [sortDir, setSortDir]     = useState('desc');
  const [page, setPage]           = useState(1);
  const [pagination, setPagination] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]           = useState(DEFAULT_FORM);
  const [creating, setCreating]   = useState(false);
  const [toggling, setToggling]   = useState(null);

  /* ── Load companies ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page, limit: 12,
        search: search || undefined,
        isActive: filterStatus === 'ALL' ? undefined : filterStatus === 'ACTIVE' ? true : false,
        sortBy, sortDir,
      };
      const res = await companyApi.getAll(params);
      let data = res.data?.data || [];
      if (filterPlan !== 'ALL') {
        data = data.filter(c => c.subscription?.plan?.name === filterPlan);
      }
      setCompanies(data);
      setPagination(res.data?.pagination || {});
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterPlan, sortBy, sortDir]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    billingApi.getPlans().then(r => setPlans(r.data?.data || [])).catch(() => {});
    analyticsApi.getOwnerOverview().then(r => setOverview(r.data?.data)).catch(() => {});
  }, []);

  /* ── Helpers ── */
  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const handleCreate = async () => {
    if (!form.name || !form.slug || !form.adminEmail || !form.planId) {
      toast.error('Name, slug, admin email and plan are required');
      return;
    }
    setCreating(true);
    try {
      await companyApi.create(form);
      toast.success('Company created!');
      setShowCreate(false);
      setForm(DEFAULT_FORM);
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
      setCompanies(prev => prev.map(c =>
        c.id === company.id ? { ...c, isActive: !c.isActive } : c
      ));
      toast.success(`Company ${company.isActive ? 'deactivated' : 'activated'}`);
    } catch {
      toast.error('Update failed');
    } finally {
      setToggling(null);
    }
  };

  /* ── Stats ── */
  const total    = pagination.total ?? companies.length;
  const active   = companies.filter(c => c.isActive).length;
  const inactive = companies.filter(c => !c.isActive).length;
  const mrr      = overview?.totalRevenue ?? 0;
  const users    = overview?.totalUsers ?? 0;

  const SortIcon = ({ col }) => (
    <span className="ml-1 opacity-50">
      {sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-navy-800">All Companies</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage every tenant on the platform</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-navy-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-navy-700 transition shadow-sm"
        >
          + New Company
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Companies" value={total} />
        <StatCard label="Active" value={active} color="text-green-600" />
        <StatCard label="Inactive" value={inactive} color="text-red-500" />
        <StatCard label="Total Users" value={users.toLocaleString('en-IN')} color="text-blue-600" />
        <StatCard label="Platform Revenue" value={`₹${Number(mrr).toLocaleString('en-IN')}`} color="text-gold-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or slug…"
          className="flex-1 min-w-[200px] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
        />
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select
          value={filterPlan}
          onChange={e => { setFilterPlan(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
        >
          <option value="ALL">All Plans</option>
          {plans.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto shadow-sm">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : companies.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <p className="text-5xl mb-3">🏢</p>
            <p className="font-medium">No companies found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-navy-800 text-left border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th
                  className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-gold-600"
                  onClick={() => handleSort('name')}
                >
                  Slug <SortIcon col="name" />
                </th>
                <th className="px-4 py-3 font-semibold">Features</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th
                  className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-gold-600"
                  onClick={() => handleSort('createdAt')}
                >
                  Created <SortIcon col="createdAt" />
                </th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {companies.map(company => (
                <tr key={company.id} className="hover:bg-cream-50/60 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: company.primaryColor || '#1a3c6e' }}
                      >
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-navy-800">{company.name}</p>
                        {company.tagline && (
                          <p className="text-xs text-gray-400 truncate max-w-[180px]">{company.tagline}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{company.slug}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {FEATURES.filter(f => company[f.key]).map(f => (
                        <span key={f.key} className="text-xs bg-navy-50 text-navy-700 px-1.5 py-0.5 rounded font-medium">
                          {f.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {company.subscription?.plan ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PLAN_COLORS[company.subscription.plan.name] || 'bg-gray-100 text-gray-600'}`}>
                        {company.subscription.plan.name}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">No plan</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1.5 text-xs font-medium w-fit ${company.isActive ? 'text-green-700' : 'text-red-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${company.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                      {company.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(company.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/owner/companies/${company.id}`}
                        className="text-xs text-navy-600 font-semibold hover:text-navy-800 hover:underline"
                      >
                        Details →
                      </Link>
                      <a
                        href={`/c/${company.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        View
                      </a>
                      <button
                        onClick={() => toggleActive(company)}
                        disabled={toggling === company.id}
                        className={`text-xs font-medium transition ${company.isActive ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-700'} disabled:opacity-40`}
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
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-50 transition"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-600 font-medium">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-50 transition"
          >
            Next →
          </button>
        </div>
      )}

      {/* Create Company Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-serif font-bold text-navy-800 text-xl">Create New Company</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'name',       label: 'Company Name',  placeholder: 'Acme Academy' },
                  { key: 'slug',       label: 'Slug (URL)',     placeholder: 'acme-academy' },
                  { key: 'adminEmail', label: 'Admin Email',    placeholder: 'admin@acme.com' },
                  { key: 'adminName',  label: 'Admin Name',     placeholder: 'John Admin' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className={key === 'adminEmail' ? 'col-span-2' : ''}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
                    <input
                      value={form[key]}
                      onChange={e => {
                        let val = e.target.value;
                        if (key === 'slug') val = val.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                        if (key === 'name' && !form.slug) {
                          setForm(p => ({ ...p, [key]: val, slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-') }));
                          return;
                        }
                        setForm(p => ({ ...p, [key]: val }));
                      }}
                      placeholder={placeholder}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                    />
                  </div>
                ))}
              </div>

              {/* Plan */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Plan</label>
                <select
                  value={form.planId}
                  onChange={e => setForm(p => ({ ...p, planId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                >
                  <option value="">Select a plan…</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.displayName || p.name} — ₹{Number(p.monthlyPrice || p.price || 0).toLocaleString('en-IN')}/mo
                    </option>
                  ))}
                </select>
              </div>

              {/* Feature Toggles */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Enable Modules</label>
                <div className="grid grid-cols-3 gap-2">
                  {FEATURES.map(f => (
                    <label key={f.key} className="flex items-center gap-2 cursor-pointer select-none">
                      <div
                        onClick={() => setForm(p => ({ ...p, [f.key]: !p[f.key] }))}
                        className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${form[f.key] ? 'bg-navy-800' : 'bg-gray-300'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form[f.key] ? 'translate-x-4' : ''}`} />
                      </div>
                      <span className="text-sm text-gray-700">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-2.5 bg-navy-800 text-white rounded-xl text-sm font-semibold hover:bg-navy-700 transition disabled:opacity-60"
              >
                {creating ? 'Creating…' : 'Create Company'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
