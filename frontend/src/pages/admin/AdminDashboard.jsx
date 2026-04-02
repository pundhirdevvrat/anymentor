import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi } from '../../services/api';
import useAuthStore from '../../store/authStore';

// ─── Skeleton Card ────────────────────────────────────────────
function SkeletonStatCard() {
  return (
    <div className="stat-card animate-pulse">
      <div className="stat-icon bg-gray-200 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-24" />
        <div className="h-7 bg-gray-200 rounded w-32" />
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, iconBg }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconBg}`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <div>
        <p className="font-body text-sm text-muted font-medium uppercase tracking-wide">{label}</p>
        <p className="font-serif text-2xl font-bold text-navy mt-0.5">{value}</p>
        {sub && <p className="font-body text-xs text-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Quick Action Card ────────────────────────────────────────
function QuickAction({ to, icon, label, desc, color }) {
  return (
    <Link
      to={to}
      className="card-hover flex items-start gap-4 group cursor-pointer"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color} group-hover:scale-110 transition-transform`}>
        <span className="text-xl">{icon}</span>
      </div>
      <div>
        <p className="font-body font-semibold text-navy text-base">{label}</p>
        <p className="font-body text-sm text-muted mt-0.5">{desc}</p>
      </div>
    </Link>
  );
}

// ─── Recent Activity Row ──────────────────────────────────────
function ActivityRow({ icon, text, time, color }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
        <span className="text-sm">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm text-navy font-medium truncate">{text}</p>
      </div>
      <span className="font-body text-xs text-muted flex-shrink-0">{time}</span>
    </div>
  );
}

const STATIC_ACTIVITY = [
  { icon: '👤', text: 'New user Priya Sharma registered', time: '2m ago', color: 'bg-blue-100' },
  { icon: '🎓', text: 'Course "Advanced React" published', time: '18m ago', color: 'bg-emerald-100' },
  { icon: '🛒', text: 'Order #1042 placed — ₹4,999', time: '45m ago', color: 'bg-gold/20' },
  { icon: '📋', text: 'New lead from contact form: Rahul Mehta', time: '1h ago', color: 'bg-purple-100' },
  { icon: '✅', text: 'Ankit Verma completed "Data Science 101"', time: '2h ago', color: 'bg-emerald-100' },
  { icon: '💳', text: 'Subscription renewed — Pro Plan', time: '3h ago', color: 'bg-navy/10' },
];

// ─── Main Component ───────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.companyId) return;
    setLoading(true);
    analyticsApi
      .getOverview(user.companyId)
      .then((res) => setOverview(res.data?.data ?? res.data))
      .catch(() => setError('Could not load dashboard data.'))
      .finally(() => setLoading(false));
  }, [user?.companyId]);

  const fmt = (n) =>
    n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
  const num = (n) =>
    n != null ? Number(n).toLocaleString('en-IN') : '—';

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="font-body text-muted text-sm">
            Welcome back, {user?.name?.split(' ')[0] ?? 'Admin'} — here's what's happening today.
          </p>
        </div>
        <span className="font-body text-xs text-muted bg-cream-dark px-3 py-1.5 rounded-full border border-border">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl font-body text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard
              icon="👥"
              label="Users"
              value={num(overview?.users?.total)}
              sub={`${num(overview?.users?.active)} active · +${num(overview?.users?.newThisMonth)} this month`}
              iconBg="bg-blue-50"
            />
            <StatCard
              icon="💰"
              label="Revenue"
              value={fmt(overview?.revenue?.total)}
              sub={`${fmt(overview?.revenue?.thisMonth)} this month`}
              iconBg="bg-gold/15"
            />
            <StatCard
              icon="🎓"
              label="Courses"
              value={num(overview?.courses?.total)}
              sub={`${num(overview?.courses?.enrollments)} enrollments · ${overview?.courses?.completionRate ?? 0}% done`}
              iconBg="bg-emerald-50"
            />
            <StatCard
              icon="🛒"
              label="Orders"
              value={num(overview?.orders?.total)}
              sub={`${num(overview?.orders?.pending)} pending · ${num(overview?.orders?.thisMonth)} this month`}
              iconBg="bg-purple-50"
            />
            <StatCard
              icon="📋"
              label="Leads"
              value={num(overview?.leads?.total)}
              sub={`${num(overview?.leads?.new)} new · ${num(overview?.leads?.converted)} converted`}
              iconBg="bg-maroon/10"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Quick Actions ── */}
        <div className="lg:col-span-1">
          <h2 className="section-title">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3">
            <QuickAction
              to="/admin/users"
              icon="👥"
              label="Manage Users"
              desc="Add, edit, or deactivate members"
              color="bg-blue-50"
            />
            <QuickAction
              to="/admin/courses"
              icon="🎓"
              label="Manage Courses"
              desc="Create and publish learning content"
              color="bg-emerald-50"
            />
            <QuickAction
              to="/admin/products"
              icon="🛍️"
              label="Manage Products"
              desc="Update your store catalogue"
              color="bg-gold/15"
            />
            <QuickAction
              to="/admin/crm"
              icon="📋"
              label="CRM & Leads"
              desc="Track pipeline and conversions"
              color="bg-maroon/10"
            />
          </div>
        </div>

        {/* ── Recent Activity ── */}
        <div className="lg:col-span-2">
          <h2 className="section-title">Recent Activity</h2>
          <div className="card">
            {STATIC_ACTIVITY.map((item, i) => (
              <ActivityRow key={i} {...item} />
            ))}
            <div className="pt-4">
              <Link
                to="/admin/analytics"
                className="font-body text-sm font-semibold text-gold hover:text-gold-dark transition-colors"
              >
                View full analytics →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Revenue Snapshot ── */}
      {!loading && overview && (
        <div className="mt-6 card">
          <h2 className="font-serif text-xl font-semibold text-navy mb-4">Revenue Snapshot</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-cream rounded-xl border border-border">
              <p className="font-body text-xs text-muted uppercase tracking-wide mb-1">This Month</p>
              <p className="font-serif text-2xl font-bold text-navy">{fmt(overview?.revenue?.thisMonth)}</p>
            </div>
            <div className="text-center p-4 bg-cream rounded-xl border border-border">
              <p className="font-body text-xs text-muted uppercase tracking-wide mb-1">Last Month</p>
              <p className="font-serif text-2xl font-bold text-navy">{fmt(overview?.revenue?.lastMonth)}</p>
            </div>
            <div className="text-center p-4 bg-cream rounded-xl border border-border">
              <p className="font-body text-xs text-muted uppercase tracking-wide mb-1">All Time</p>
              <p className="font-serif text-2xl font-bold text-navy">{fmt(overview?.revenue?.total)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
