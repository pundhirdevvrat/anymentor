import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { companyApi, billingApi, userApi, analyticsApi } from '../../services/api';
import toast from 'react-hot-toast';

const TABS = ['Overview', 'Settings', 'Users', 'Branding', 'Billing', 'Danger Zone'];

const PLAN_COLORS = {
  FREE: 'bg-gray-100 text-gray-600',
  STARTER: 'bg-blue-100 text-blue-700',
  PROFESSIONAL: 'bg-yellow-100 text-yellow-800',
  ENTERPRISE: 'bg-purple-100 text-purple-700',
};

const ROLE_COLORS = {
  OWNER: 'bg-purple-100 text-purple-700',
  COMPANY_ADMIN: 'bg-navy-100 text-navy-800',
  MANAGER: 'bg-yellow-100 text-yellow-700',
  USER: 'bg-gray-100 text-gray-600',
};

const FEATURES = [
  { key: 'hasLms', label: 'LMS', icon: '🎓' },
  { key: 'hasEcommerce', label: 'E-commerce', icon: '🛒' },
  { key: 'hasCrm', label: 'CRM', icon: '📋' },
  { key: 'hasAnalytics', label: 'Analytics', icon: '📊' },
  { key: 'hasSupport', label: 'Support', icon: '🎫' },
];

/* ── Shared Toggle ── */
function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${value ? 'bg-navy-800' : 'bg-gray-300'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-4' : ''}`} />
    </div>
  );
}

/* ── Tab: Overview ── */
function TabOverview({ company, overview }) {
  const stats = [
    { label: 'Total Users', value: overview?.users?.total ?? '—', color: 'text-blue-600' },
    { label: 'Active Users', value: overview?.users?.active ?? '—', color: 'text-green-600' },
    { label: 'Revenue', value: overview?.revenue?.total != null ? `₹${Number(overview.revenue.total).toLocaleString('en-IN')}` : '—', color: 'text-gold-600' },
    { label: 'Courses', value: overview?.courses?.total ?? '—', color: 'text-navy-800' },
    { label: 'Orders', value: overview?.orders?.total ?? '—', color: 'text-maroon-700' },
    { label: 'Leads', value: overview?.leads?.total ?? '—', color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(({ label, value, color }) => (
          <div key={label} className="bg-cream-50 rounded-2xl p-5 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Plan Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-serif font-bold text-navy-800 mb-4">Subscription</h3>
        {company.subscription ? (
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-gray-500">Plan</p>
              <span className={`mt-1 inline-block px-3 py-1 rounded-full text-xs font-bold ${PLAN_COLORS[company.subscription.plan?.name] || 'bg-gray-100'}`}>
                {company.subscription.plan?.displayName || company.subscription.plan?.name}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <p className="font-semibold text-navy-800 mt-1">{company.subscription.status}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Renews</p>
              <p className="font-semibold text-navy-800 mt-1">
                {company.subscription.currentPeriodEnd
                  ? new Date(company.subscription.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">No active subscription</p>
        )}
      </div>

      {/* Enabled Features */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-serif font-bold text-navy-800 mb-4">Enabled Modules</h3>
        <div className="flex flex-wrap gap-3">
          {FEATURES.map(f => (
            <div key={f.key} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${company[f.key] ? 'border-navy-200 bg-navy-50 text-navy-800' : 'border-gray-200 bg-gray-50 text-gray-400 line-through'}`}>
              <span>{f.icon}</span> {f.label}
            </div>
          ))}
        </div>
      </div>

      {/* Company Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-serif font-bold text-navy-800 mb-4">Company Info</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Slug', company.slug],
            ['Domain', company.domain || '—'],
            ['Email', company.email || '—'],
            ['Phone', company.phone || '—'],
            ['Created', new Date(company.createdAt).toLocaleDateString('en-IN')],
            ['Status', company.isActive ? '✅ Active' : '❌ Inactive'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-gray-500 font-medium">{k}</dt>
              <dd className="text-navy-800 font-semibold mt-0.5">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/* ── Tab: Settings ── */
function TabSettings({ company, onUpdate }) {
  const [form, setForm] = useState({
    name: company.name || '',
    tagline: company.tagline || '',
    description: company.description || '',
    email: company.email || '',
    phone: company.phone || '',
    domain: company.domain || '',
    ...Object.fromEntries(FEATURES.map(f => [f.key, !!company[f.key]])),
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await companyApi.update(company.id, form);
      toast.success('Settings saved');
      onUpdate(res.data?.data || { ...company, ...form });
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h3 className="font-serif font-bold text-navy-800 text-lg">Company Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'name',        label: 'Company Name' },
            { key: 'tagline',     label: 'Tagline' },
            { key: 'email',       label: 'Contact Email' },
            { key: 'phone',       label: 'Phone' },
            { key: 'domain',      label: 'Custom Domain', placeholder: 'academy.yourcompany.com' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className={key === 'description' ? 'md:col-span-2' : ''}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
              <input
                value={form[key] || ''}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder || label}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
              />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
            <textarea
              value={form.description || ''}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-300"
            />
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-serif font-bold text-navy-800 text-lg mb-4">Module Access</h3>
        <div className="space-y-3">
          {FEATURES.map(f => (
            <div key={f.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-xl">{f.icon}</span>
                <div>
                  <p className="font-medium text-navy-800">{f.label}</p>
                  <p className="text-xs text-gray-400">Enable/disable access to this module</p>
                </div>
              </div>
              <Toggle value={!!form[f.key]} onChange={v => setForm(p => ({ ...p, [f.key]: v }))} />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3 bg-navy-800 text-white rounded-xl font-semibold hover:bg-navy-700 transition disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}

/* ── Tab: Users ── */
function TabUsers({ company }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await userApi.getAll({ companyId: company.id, search: search || undefined, limit: 50 });
        setUsers(res.data?.data || []);
      } catch { setUsers([]); }
      finally { setLoading(false); }
    };
    load();
  }, [company.id, search]);

  const toggleUser = async (u) => {
    setToggling(u.id);
    try {
      await userApi.update(u.id, { isActive: !u.isActive });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isActive: !x.isActive } : x));
      toast.success(`User ${u.isActive ? 'deactivated' : 'activated'}`);
    } catch { toast.error('Update failed'); }
    finally { setToggling(null); }
  };

  return (
    <div className="space-y-4">
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search users by name or email…"
        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
      />
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-left">
              <tr>{['User', 'Role', 'Status', 'Joined', 'Action'].map(h => <th key={h} className="px-4 py-3 font-semibold text-navy-800">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-cream-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-navy-800 text-white flex items-center justify-center text-xs font-bold">
                        {(u.name || u.firstName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-navy-800">{u.name || `${u.firstName} ${u.lastName}`.trim()}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                      {u.role?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${u.isActive ? 'text-green-600' : 'text-red-500'}`}>
                      {u.isActive ? '● Active' : '● Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleUser(u)}
                      disabled={toggling === u.id}
                      className={`text-xs font-medium ${u.isActive ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-700'}`}
                    >
                      {toggling === u.id ? '…' : u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
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

/* ── Tab: Branding ── */
function TabBranding({ company, onUpdate }) {
  const [form, setForm] = useState({
    primaryColor: company.primaryColor || '#1a3c6e',
    secondaryColor: company.secondaryColor || '#d4a017',
    accentColor: company.accentColor || '#800020',
    bgColor: company.bgColor || '#f5f0e8',
    font: company.font || 'Cormorant Garamond',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await companyApi.updateBranding(company.id, form);
      toast.success('Branding updated');
      onUpdate({ ...company, ...form });
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Color Pickers */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h3 className="font-serif font-bold text-navy-800 text-lg">Brand Colors</h3>
          {[
            { key: 'primaryColor',   label: 'Primary (Navy)',   hint: 'Main brand color — headers, buttons' },
            { key: 'secondaryColor', label: 'Secondary (Gold)',  hint: 'Accent color — highlights, CTAs' },
            { key: 'accentColor',    label: 'Accent (Maroon)',   hint: 'Third accent — alerts, badges' },
            { key: 'bgColor',        label: 'Background (Cream)', hint: 'Page background color' },
          ].map(({ key, label, hint }) => (
            <div key={key} className="flex items-center gap-4">
              <input
                type="color"
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0"
              />
              <div className="flex-1">
                <p className="font-medium text-navy-800 text-sm">{label}</p>
                <p className="text-xs text-gray-400">{hint}</p>
                <p className="text-xs font-mono text-gray-500 mt-0.5">{form[key]}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Live Preview */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-serif font-bold text-navy-800 text-lg mb-4">Live Preview</h3>
          <div className="rounded-2xl overflow-hidden border border-gray-200" style={{ backgroundColor: form.bgColor }}>
            <div className="p-4" style={{ backgroundColor: form.primaryColor }}>
              <p className="text-white font-bold text-lg">{company.name}</p>
              <p className="text-white opacity-75 text-sm">{company.tagline || 'Your platform tagline'}</p>
            </div>
            <div className="p-4 space-y-3">
              <button
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ backgroundColor: form.secondaryColor }}
              >
                Get Started
              </button>
              <div className="flex gap-2 flex-wrap mt-2">
                {['Feature 1', 'Feature 2', 'Feature 3'].map(t => (
                  <span key={t} className="px-3 py-1 rounded-full text-white text-xs font-medium"
                    style={{ backgroundColor: form.accentColor }}>
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-sm" style={{ color: form.primaryColor }}>
                This is how your company portal will look with these colors.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Font */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-serif font-bold text-navy-800 text-lg mb-4">Typography</h3>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Heading Font</label>
          <select
            value={form.font}
            onChange={e => setForm(p => ({ ...p, font: e.target.value }))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
          >
            {['Cormorant Garamond', 'Playfair Display', 'Merriweather', 'Lora', 'Georgia', 'Inter', 'Rajdhani'].map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="w-full py-3 bg-navy-800 text-white rounded-xl font-semibold hover:bg-navy-700 transition disabled:opacity-60">
        {saving ? 'Saving…' : 'Save Branding'}
      </button>
    </div>
  );
}

/* ── Tab: Billing ── */
function TabBilling({ company }) {
  const [invoices, setInvoices] = useState([]);
  const [plans, setPlans]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [upgrading, setUpgrading] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [invRes, plansRes] = await Promise.allSettled([
          billingApi.getInvoices(company.id),
          billingApi.getPlans(),
        ]);
        if (invRes.status === 'fulfilled') setInvoices(invRes.value.data?.data || []);
        if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data?.data || []);
      } finally { setLoading(false); }
    };
    load();
  }, [company.id]);

  const handleUpgrade = async (planId, planName) => {
    setUpgrading(planId);
    try {
      await billingApi.subscribe(company.id, { planId, gateway: 'RAZORPAY' });
      toast.success(`Upgraded to ${planName}`);
    } catch { toast.error('Upgrade failed'); }
    finally { setUpgrading(null); }
  };

  const currentPlanName = company.subscription?.plan?.name;

  if (loading) return <div className="p-8 text-center text-gray-400">Loading billing…</div>;

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-serif font-bold text-navy-800 text-lg mb-4">Current Plan</h3>
        {company.subscription ? (
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-gray-500">Plan</p>
              <span className={`mt-1 inline-block px-3 py-1 rounded-full text-xs font-bold ${PLAN_COLORS[currentPlanName] || 'bg-gray-100'}`}>
                {company.subscription.plan?.displayName || currentPlanName}
              </span>
            </div>
            <div><p className="text-xs text-gray-500">Status</p><p className="font-bold text-navy-800 mt-1">{company.subscription.status}</p></div>
            <div><p className="text-xs text-gray-500">Billing Cycle</p><p className="font-bold text-navy-800 mt-1">{company.subscription.billingCycle}</p></div>
            {company.subscription.currentPeriodEnd && (
              <div>
                <p className="text-xs text-gray-500">Next Renewal</p>
                <p className="font-bold text-navy-800 mt-1">{new Date(company.subscription.currentPeriodEnd).toLocaleDateString('en-IN')}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-400">No subscription found</p>
        )}
      </div>

      {/* Change Plan */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-serif font-bold text-navy-800 text-lg mb-4">Change Plan</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {plans.map(plan => {
            const isCurrent = currentPlanName === plan.name;
            return (
              <div key={plan.id} className={`rounded-xl border-2 p-4 ${isCurrent ? 'border-gold-500 bg-yellow-50' : 'border-gray-200'}`}>
                {isCurrent && <p className="text-xs text-gold-600 font-bold mb-1">Current</p>}
                <p className="font-bold text-navy-800">{plan.name}</p>
                <p className="text-sm text-gray-500">₹{Number(plan.monthlyPrice || plan.price || 0).toLocaleString('en-IN')}/mo</p>
                <button
                  onClick={() => !isCurrent && handleUpgrade(plan.id, plan.name)}
                  disabled={isCurrent || !!upgrading}
                  className={`mt-3 w-full py-1.5 rounded-lg text-xs font-semibold transition ${isCurrent ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-navy-800 text-white hover:bg-navy-700'}`}
                >
                  {upgrading === plan.id ? '…' : isCurrent ? 'Current' : 'Switch'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-serif font-bold text-navy-800">Payment History</h3>
        </div>
        {invoices.length === 0 ? (
          <p className="p-6 text-center text-gray-400 text-sm">No payments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-left">
              <tr>{['Date', 'Amount', 'Gateway', 'Status'].map(h => <th key={h} className="px-4 py-3 font-semibold text-navy-800">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-cream-50/50">
                  <td className="px-4 py-3 text-gray-600">{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 font-bold text-navy-800">₹{Number(inv.amount).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.gateway}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inv.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {inv.status}
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

/* ── Tab: Danger Zone ── */
function TabDanger({ company, onUpdate }) {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState('');
  const [acting, setActing]   = useState(false);

  const deactivate = async () => {
    if (confirm !== company.name) { toast.error('Type company name to confirm'); return; }
    setActing(true);
    try {
      await companyApi.update(company.id, { isActive: false });
      toast.success('Company deactivated');
      onUpdate({ ...company, isActive: false });
      setConfirm('');
    } catch { toast.error('Failed'); }
    finally { setActing(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <h3 className="text-red-700 font-bold text-lg mb-2">⚠️ Deactivate Company</h3>
        <p className="text-red-600 text-sm mb-4">
          Deactivating will block all users of <strong>{company.name}</strong> from accessing the platform.
          Data is preserved and can be reactivated anytime from the companies list.
        </p>
        <label className="block text-xs font-semibold text-red-700 mb-1.5 uppercase">
          Type <strong>{company.name}</strong> to confirm
        </label>
        <input
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder={company.name}
          className="w-full border border-red-300 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-300"
        />
        <button
          onClick={deactivate}
          disabled={acting || confirm !== company.name}
          className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700 transition disabled:opacity-50"
        >
          {acting ? 'Deactivating…' : 'Deactivate Company'}
        </button>
      </div>

      {!company.isActive && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
          <h3 className="text-green-700 font-bold text-lg mb-2">✅ Reactivate Company</h3>
          <p className="text-green-600 text-sm mb-4">Restore access for all users of this company.</p>
          <button
            onClick={async () => {
              try {
                await companyApi.update(company.id, { isActive: true });
                toast.success('Company reactivated');
                onUpdate({ ...company, isActive: true });
              } catch { toast.error('Failed'); }
            }}
            className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-green-700 transition"
          >
            Reactivate Company
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   Main CompanyDetail Component
══════════════════════════════════════════ */
export default function CompanyDetail() {
  const { id } = useParams();
  const [company, setCompany]   = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [compRes, ovRes] = await Promise.allSettled([
          companyApi.getById(id),
          analyticsApi.getOverview(id),
        ]);
        if (compRes.status === 'fulfilled') setCompany(compRes.value.data?.data);
        if (ovRes.status === 'fulfilled') setOverview(ovRes.value.data?.data);
      } catch {
        toast.error('Failed to load company');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return (
    <div className="p-8 space-y-4">
      <div className="h-20 bg-gray-200 rounded-2xl animate-pulse" />
      <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
    </div>
  );

  if (!company) return (
    <div className="p-8 text-center">
      <p className="text-4xl mb-3">😕</p>
      <p className="text-gray-500">Company not found.</p>
      <Link to="/owner/companies" className="text-navy-600 underline mt-2 inline-block">← Back to Companies</Link>
    </div>
  );

  return (
    <div className="p-6 space-y-6">

      {/* Breadcrumb + Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-gray-400 mb-1">
            <Link to="/owner/companies" className="hover:text-navy-800">Companies</Link>
            {' / '}
            <span className="text-navy-800 font-medium">{company.name}</span>
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow"
              style={{ backgroundColor: company.primaryColor || '#1a3c6e' }}
            >
              {company.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-navy-800">{company.name}</h1>
              <p className="text-sm text-gray-500">{company.tagline || company.slug}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <a
            href={`/c/${company.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-navy-200 text-navy-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-navy-50 transition"
          >
            View Portal →
          </a>
          <span className={`px-3 py-2 rounded-xl text-sm font-semibold ${company.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {company.isActive ? '● Active' : '● Inactive'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 overflow-x-auto">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`flex-1 min-w-max px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
              activeTab === i
                ? (i === TABS.length - 1 ? 'bg-red-500 text-white' : 'bg-white text-navy-800 shadow-sm')
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 0 && <TabOverview company={company} overview={overview} />}
      {activeTab === 1 && <TabSettings company={company} onUpdate={setCompany} />}
      {activeTab === 2 && <TabUsers company={company} />}
      {activeTab === 3 && <TabBranding company={company} onUpdate={setCompany} />}
      {activeTab === 4 && <TabBilling company={company} />}
      {activeTab === 5 && <TabDanger company={company} onUpdate={setCompany} />}
    </div>
  );
}
