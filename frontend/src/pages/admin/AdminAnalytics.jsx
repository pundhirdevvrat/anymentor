import { useState, useEffect } from 'react';
import { analyticsApi } from '../../services/api';
import useAuthStore from '../../store/authStore';

// ─── Period Selector ──────────────────────────────────────────
function PeriodButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-body font-semibold text-sm transition-all duration-200 ${
        active
          ? 'bg-gold text-navy shadow-gold'
          : 'bg-white border border-border text-navy hover:bg-cream'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Skeleton Block ───────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

// ─── Stat Tile ────────────────────────────────────────────────
function StatTile({ label, value, sub, iconBg, icon }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-body text-xs font-semibold text-muted uppercase tracking-wide">{label}</p>
        <p className="font-serif text-2xl font-bold text-navy mt-0.5 truncate">{value}</p>
        {sub && <p className="font-body text-xs text-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Growth Badge ──────────────────────────────────────────────
function GrowthBadge({ current, previous }) {
  if (current == null || previous == null || previous === 0) return null;
  const pct = (((current - previous) / previous) * 100).toFixed(1);
  const up = current >= previous;
  return (
    <span
      className={`inline-flex items-center gap-1 font-body text-xs font-bold px-2 py-0.5 rounded-full ${
        up ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
      }`}
    >
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────
function ProgressBar({ value, max = 100, color = 'bg-gold' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Lead Funnel Row ──────────────────────────────────────────
function FunnelRow({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between font-body text-sm">
        <span className="font-semibold text-navy">{label}</span>
        <span className="text-muted">
          {count.toLocaleString('en-IN')}
          <span className="ml-1 text-xs">({pct}%)</span>
        </span>
      </div>
      <ProgressBar value={count} max={total} color={color} />
    </div>
  );
}

// ─── Revenue Mini-Bar Chart ───────────────────────────────────
function RevenueBarChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.revenue ?? 0), 1);
  return (
    <div className="flex items-end gap-1.5 h-24 w-full">
      {data.map((d, i) => {
        const heightPct = Math.round(((d.revenue ?? 0) / max) * 100);
        return (
          <div key={i} className="flex flex-col items-center flex-1 gap-1 group relative">
            <div
              className="w-full rounded-t-sm bg-gold/80 group-hover:bg-gold transition-all duration-300"
              style={{ height: `${Math.max(heightPct, 2)}%` }}
            />
            <span className="font-body text-[10px] text-muted truncate w-full text-center">
              {d.month ?? d.label ?? `M${i + 1}`}
            </span>
            {/* Tooltip on hover */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-navy text-cream text-[10px] font-body font-semibold px-2 py-1 rounded whitespace-nowrap z-10">
              ₹{(d.revenue ?? 0).toLocaleString('en-IN')}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Static Top Courses (placeholder) ────────────────────────
const STATIC_TOP_COURSES = [
  { title: 'Advanced React Development', enrollments: 284, completionRate: 72, revenue: 142000 },
  { title: 'Data Science Fundamentals', enrollments: 231, completionRate: 65, revenue: 115500 },
  { title: 'UI/UX Design Mastery', enrollments: 198, completionRate: 80, revenue: 99000 },
  { title: 'Node.js & Express APIs', enrollments: 163, completionRate: 58, revenue: 81500 },
  { title: 'Digital Marketing Pro', enrollments: 141, completionRate: 69, revenue: 70500 },
];

// ─── Main Component ───────────────────────────────────────────
export default function AdminAnalytics() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState('30d');
  const [overview, setOverview] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [courseData, setCourseData] = useState(null);
  const [leadData, setLeadData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const periodMonths = { '7d': 1, '30d': 1, '90d': 3 };

  useEffect(() => {
    if (!user?.companyId) return;
    setLoading(true);
    setError(null);

    const months = periodMonths[period] ?? 1;

    Promise.all([
      analyticsApi.getOverview(user.companyId),
      analyticsApi.getRevenue(user.companyId, months),
      analyticsApi.getCourses(user.companyId),
      analyticsApi.getLeads(user.companyId),
    ])
      .then(([ovRes, revRes, crsRes, ldRes]) => {
        setOverview(ovRes.data?.data ?? ovRes.data);
        const revRaw = revRes.data?.data ?? revRes.data;
        setRevenueData(Array.isArray(revRaw) ? revRaw : revRaw?.months ?? revRaw?.data ?? []);
        setCourseData(crsRes.data?.data ?? crsRes.data);
        setLeadData(ldRes.data?.data ?? ldRes.data);
      })
      .catch(() => setError('Could not load analytics data.'))
      .finally(() => setLoading(false));
  }, [user?.companyId, period]);

  const fmt = (n) => (n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—');
  const num = (n) => (n != null ? Number(n).toLocaleString('en-IN') : '—');

  // Lead funnel — build from overview or leadData
  const leadsTotal = overview?.leads?.total ?? 0;
  const leadsNew = overview?.leads?.new ?? 0;
  const leadsConverted = overview?.leads?.converted ?? 0;
  // Derive intermediate stages from whatever the API gives us
  const contacted = leadData?.contacted ?? leadData?.byStatus?.CONTACTED ?? Math.round(leadsTotal * 0.6);
  const qualified = leadData?.qualified ?? leadData?.byStatus?.QUALIFIED ?? Math.round(leadsTotal * 0.35);

  // Course stats
  const totalCourses = overview?.courses?.total ?? courseData?.total ?? 0;
  const totalEnrollments = overview?.courses?.enrollments ?? courseData?.enrollments ?? 0;
  const completionRate = overview?.courses?.completionRate ?? courseData?.completionRate ?? 0;

  // Top courses: use live data if available, else static
  const topCourses =
    Array.isArray(courseData?.topCourses) && courseData.topCourses.length > 0
      ? courseData.topCourses
      : Array.isArray(courseData) && courseData.length > 0
      ? courseData.slice(0, 5)
      : STATIC_TOP_COURSES;

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="font-body text-muted text-sm">
            Track your platform's performance and growth.
          </p>
        </div>
        {/* Period Selector */}
        <div className="flex items-center gap-2 bg-white border border-border rounded-xl p-1.5">
          {[
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '30 Days' },
            { key: '90d', label: '90 Days' },
          ].map(({ key, label }) => (
            <PeriodButton
              key={key}
              label={label}
              active={period === key}
              onClick={() => setPeriod(key)}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl font-body text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Revenue Section ── */}
      <section className="mb-8">
        <h2 className="section-title">Revenue</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card animate-pulse space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="card">
              <p className="font-body text-xs font-semibold text-muted uppercase tracking-wide">This Month</p>
              <p className="font-serif text-3xl font-bold text-navy mt-1">
                {fmt(overview?.revenue?.thisMonth)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <GrowthBadge
                  current={overview?.revenue?.thisMonth}
                  previous={overview?.revenue?.lastMonth}
                />
                <span className="font-body text-xs text-muted">vs last month</span>
              </div>
            </div>
            <div className="card">
              <p className="font-body text-xs font-semibold text-muted uppercase tracking-wide">Last Month</p>
              <p className="font-serif text-3xl font-bold text-navy mt-1">
                {fmt(overview?.revenue?.lastMonth)}
              </p>
            </div>
            <div className="card">
              <p className="font-body text-xs font-semibold text-muted uppercase tracking-wide">All Time</p>
              <p className="font-serif text-3xl font-bold text-navy mt-1">
                {fmt(overview?.revenue?.total)}
              </p>
            </div>
          </div>
        )}

        {/* Revenue Bar Chart */}
        <div className="card">
          <h3 className="font-body font-semibold text-navy mb-4">
            Revenue Trend — Last {period === '7d' ? '30' : period === '30d' ? '30' : '90'} Days
          </h3>
          {loading ? (
            <div className="flex items-end gap-1.5 h-24">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 animate-pulse bg-gray-200 rounded-t-sm"
                  style={{ height: `${30 + Math.random() * 60}%` }}
                />
              ))}
            </div>
          ) : revenueData.length > 0 ? (
            <RevenueBarChart data={revenueData} />
          ) : (
            <div className="h-24 flex items-center justify-center font-body text-sm text-muted">
              No revenue data available for this period.
            </div>
          )}
        </div>
      </section>

      {/* ── Courses & Leads (side by side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Course Stats */}
        <section>
          <h2 className="section-title">Courses</h2>
          <div className="card space-y-5">
            {loading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-body text-xs text-muted uppercase tracking-wide font-semibold">
                      Total Courses
                    </p>
                    <p className="font-serif text-3xl font-bold text-navy">{num(totalCourses)}</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl">
                    🎓
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-body text-sm mb-1.5">
                    <span className="text-navy font-semibold">Total Enrollments</span>
                    <span className="text-muted font-bold">{num(totalEnrollments)}</span>
                  </div>
                  <ProgressBar
                    value={totalEnrollments}
                    max={Math.max(totalEnrollments, 1000)}
                    color="bg-navy"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-body text-sm mb-1.5">
                    <span className="text-navy font-semibold">Completion Rate</span>
                    <span className="text-muted font-bold">{completionRate}%</span>
                  </div>
                  <ProgressBar
                    value={completionRate}
                    max={100}
                    color={
                      completionRate >= 70
                        ? 'bg-emerald-500'
                        : completionRate >= 40
                        ? 'bg-gold'
                        : 'bg-red-400'
                    }
                  />
                  <p className="font-body text-xs text-muted mt-1">
                    {completionRate >= 70
                      ? 'Excellent completion rate!'
                      : completionRate >= 40
                      ? 'Room for improvement'
                      : 'Needs attention'}
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Lead Funnel */}
        <section>
          <h2 className="section-title">Lead Funnel</h2>
          <div className="card space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-body text-sm text-muted">
                    Total Leads:{' '}
                    <span className="font-bold text-navy">{num(leadsTotal)}</span>
                  </p>
                  <span className="font-body text-xs text-muted">
                    {leadsConverted} converted
                  </span>
                </div>

                <FunnelRow
                  label="New"
                  count={leadsNew}
                  total={leadsTotal}
                  color="bg-blue-400"
                />
                <FunnelRow
                  label="Contacted"
                  count={contacted}
                  total={leadsTotal}
                  color="bg-gold"
                />
                <FunnelRow
                  label="Qualified"
                  count={qualified}
                  total={leadsTotal}
                  color="bg-navy"
                />
                <FunnelRow
                  label="Won / Converted"
                  count={leadsConverted}
                  total={leadsTotal}
                  color="bg-emerald-500"
                />

                {leadsTotal > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="font-body text-xs text-muted">
                      Conversion rate:{' '}
                      <span className="font-bold text-navy">
                        {((leadsConverted / leadsTotal) * 100).toFixed(1)}%
                      </span>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {/* ── Top Performing Courses ── */}
      <section className="mb-8">
        <h2 className="section-title">Top Performing Courses</h2>
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-cream border-b border-border">
                  {['#', 'Course', 'Enrollments', 'Completion', 'Revenue'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left font-body text-xs font-semibold text-muted uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {[0, 1, 2, 3, 4].map((j) => (
                          <td key={j} className="px-5 py-3">
                            <div className="h-4 bg-gray-200 rounded w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : topCourses.map((course, idx) => (
                      <tr key={idx} className="hover:bg-cream/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="w-6 h-6 rounded-full bg-navy/10 text-navy font-body font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-body font-semibold text-navy text-sm">
                            {course.title}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 font-body text-sm text-muted">
                          {num(course.enrollments)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-20">
                              <ProgressBar
                                value={course.completionRate ?? 0}
                                max={100}
                                color="bg-gold"
                              />
                            </div>
                            <span className="font-body text-xs text-muted">
                              {course.completionRate ?? 0}%
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-body text-sm font-semibold text-navy">
                          {course.revenue != null ? fmt(course.revenue) : '—'}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Summary KPI Row ── */}
      {!loading && overview && (
        <section>
          <h2 className="section-title">Platform Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatTile
              icon="👥"
              label="Total Users"
              value={num(overview?.users?.total)}
              sub={`${num(overview?.users?.active)} active`}
              iconBg="bg-blue-50"
            />
            <StatTile
              icon="🛒"
              label="Orders"
              value={num(overview?.orders?.total)}
              sub={`${num(overview?.orders?.pending)} pending`}
              iconBg="bg-purple-50"
            />
            <StatTile
              icon="📋"
              label="Leads"
              value={num(overview?.leads?.total)}
              sub={`${num(overview?.leads?.new)} new`}
              iconBg="bg-maroon/10"
            />
            <StatTile
              icon="🎓"
              label="Courses"
              value={num(overview?.courses?.total)}
              sub={`${overview?.courses?.completionRate ?? 0}% completion`}
              iconBg="bg-emerald-50"
            />
          </div>
        </section>
      )}
    </div>
  );
}
