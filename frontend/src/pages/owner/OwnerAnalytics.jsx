import { useState, useEffect } from 'react';
import { analyticsApi, companyApi } from '../../services/api';

const StatCard = ({ label, value, sub, color = 'text-navy-800' }) => (
  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
    <p className="text-sm text-gray-500">{label}</p>
    <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

export default function OwnerAnalytics() {
  const [overview, setOverview] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ovRes, compRes] = await Promise.allSettled([
          analyticsApi.getOwnerOverview(),
          companyApi.getAll({ limit: 10, page: 1 }),
        ]);
        if (ovRes.status === 'fulfilled') setOverview(ovRes.value.data?.data);
        if (compRes.status === 'fulfilled') setCompanies(compRes.value.data?.data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fmt = (n) => (n != null ? Number(n).toLocaleString('en-IN') : '—');
  const fmtInr = (n) => (n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—');

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />)}
      </div>
      <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
    </div>
  );

  const totalCompanies = overview?.totalCompanies ?? companies.length ?? 0;
  const totalUsers = overview?.totalUsers ?? 0;
  const totalRevenue = overview?.totalRevenue ?? 0;
  const activeSubs = overview?.activeSubscriptions ?? 0;

  const recentCompanies = [...companies].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  const PLAN_COLORS = {
    FREE: 'bg-gray-100 text-gray-600',
    STARTER: 'bg-blue-100 text-blue-700',
    PROFESSIONAL: 'bg-yellow-100 text-yellow-700',
    ENTERPRISE: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-bold text-navy-800">Platform Analytics</h1>
        <p className="text-gray-500 mt-1">Overview of all companies and platform health</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Companies" value={fmt(totalCompanies)} sub="All tenants" color="text-navy-800" />
        <StatCard label="Total Users" value={fmt(totalUsers)} sub="Across all companies" color="text-blue-600" />
        <StatCard label="Platform Revenue" value={fmtInr(totalRevenue)} sub="All time" color="text-green-600" />
        <StatCard label="Active Subscriptions" value={fmt(activeSubs)} sub="Paying customers" color="text-gold-600" />
      </div>

      {/* Company breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Companies */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-serif font-semibold text-navy-800 text-lg mb-4">Companies</h2>
          {companies.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No companies yet.</p>
          ) : (
            <div className="space-y-3">
              {companies.slice(0, 8).map((company, idx) => (
                <div key={company.id} className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm w-5 text-right">{idx + 1}</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
                    style={{ backgroundColor: company.primaryColor || '#1a3c6e' }}>
                    {company.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-navy-800 text-sm truncate">{company.name}</p>
                    <p className="text-xs text-gray-400">{company.slug}</p>
                  </div>
                  {company.subscription?.plan && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[company.subscription.plan.name] || 'bg-gray-100 text-gray-600'}`}>
                      {company.subscription.plan.name}
                    </span>
                  )}
                  <div className={`w-2 h-2 rounded-full ${company.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Signups */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-serif font-semibold text-navy-800 text-lg mb-4">Recent Signups</h2>
          {recentCompanies.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No recent signups.</p>
          ) : (
            <div className="space-y-4">
              {recentCompanies.map(company => (
                <div key={company.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                    style={{ backgroundColor: company.primaryColor || '#1a3c6e' }}>
                    {company.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-navy-800 text-sm">{company.name}</p>
                    <p className="text-xs text-gray-400">
                      Joined {new Date(company.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <a href={`/c/${company.slug}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline">
                    View →
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Platform summary */}
      <div className="bg-gradient-to-r from-navy-800 to-navy-700 rounded-2xl p-6 text-white">
        <h2 className="font-serif font-bold text-xl mb-4">Platform Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Companies', value: fmt(totalCompanies) },
            { label: 'Total Users', value: fmt(totalUsers) },
            { label: 'Revenue', value: fmtInr(totalRevenue) },
            { label: 'Active Plans', value: fmt(activeSubs) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-3xl font-bold text-gold-400">{value}</p>
              <p className="text-sm text-navy-200 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
