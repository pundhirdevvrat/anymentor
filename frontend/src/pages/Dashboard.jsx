import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, BookOpen, ShoppingBag, TrendingUp, Building2, DollarSign, Target, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import { analyticsApi } from '@/services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function StatCard({ icon: Icon, label, value, sub, color, to }) {
  const card = (
    <div className="card flex items-center gap-4 hover:shadow-premium-lg transition-all">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '15' }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-muted text-sm font-body">{label}</p>
        <p className="font-serif text-2xl font-bold text-navy">{value ?? '—'}</p>
        {sub && <p className="text-xs text-muted font-body mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  return to ? <Link to={to} className="block">{card}</Link> : card;
}

export default function Dashboard() {
  const { user, isOwner, isCompanyAdmin } = useAuthStore();
  const companyId = user?.companyId;

  const { data: overview, isLoading } = useQuery({
    queryKey: ['analytics', 'overview', companyId],
    queryFn: () => isOwner()
      ? analyticsApi.getOwnerOverview().then(r => r.data.data)
      : analyticsApi.getOverview(companyId).then(r => r.data.data),
    enabled: !!(companyId || isOwner()),
  });

  const { data: revenueData } = useQuery({
    queryKey: ['analytics', 'revenue', companyId],
    queryFn: () => analyticsApi.getRevenue(companyId, 6).then(r => r.data.data),
    enabled: !!companyId && !isOwner(),
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Welcome back, {user?.firstName}! 👋</h1>
        <p className="text-muted font-body">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Owner Dashboard */}
      {isOwner() && overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard icon={Building2} label="Total Companies" value={overview.totalCompanies} sub={`${overview.activeCompanies} active`} color="#1a3c6e" to="/owner/companies" />
          <StatCard icon={Users} label="Total Users" value={overview.totalUsers?.toLocaleString()} color="#d4a017" />
          <StatCard icon={DollarSign} label="Platform Revenue" value={`₹${overview.totalRevenue?.toLocaleString()}`} color="#800020" />
          <StatCard icon={TrendingUp} label="Companies This Month" value={overview.recentCompanies?.length} color="#1a3c6e" />
        </div>
      )}

      {/* Company Admin Dashboard */}
      {!isOwner() && overview && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={DollarSign} label="Revenue This Month" value={`₹${overview.revenue?.thisMonth?.toLocaleString()}`}
              sub={`${overview.revenue?.growth > 0 ? '+' : ''}${overview.revenue?.growth}% vs last month`} color="#800020" to="/admin/analytics" />
            <StatCard icon={Users} label="Total Users" value={overview.users?.total} sub={`+${overview.users?.newThisMonth} this month`} color="#1a3c6e" to="/admin/users" />
            <StatCard icon={BookOpen} label="Courses" value={overview.lms?.publishedCourses} sub={`${overview.lms?.totalEnrollments} enrollments`} color="#d4a017" to="/admin/courses" />
            <StatCard icon={ShoppingBag} label="Orders" value={overview.ecommerce?.ordersThisMonth} sub="This month" color="#1a3c6e" to="/admin/orders" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard icon={Target} label="New Leads" value={overview.crm?.newThisMonth} sub="This month" color="#800020" to="/admin/crm" />
            <StatCard icon={Ticket} label="Open Tickets" value={overview.support?.openTickets} color="#d4a017" to="/admin/support" />
            <StatCard icon={TrendingUp} label="Enrollments" value={overview.lms?.enrollmentsThisMonth} sub="This month" color="#1a3c6e" to="/admin/courses" />
          </div>
        </>
      )}

      {/* Revenue Chart */}
      {!isOwner() && revenueData && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="card mb-8">
          <h2 className="section-title">Revenue Overview</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1a3c6e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1a3c6e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
              <XAxis dataKey="label" tick={{ fontFamily: 'Rajdhani', fill: '#6b7280', fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} tick={{ fontFamily: 'Rajdhani', fill: '#6b7280', fontSize: 12 }} />
              <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']}
                contentStyle={{ fontFamily: 'Rajdhani', background: '#f5f0e8', border: '1px solid #e0d8cc', borderRadius: 8 }} />
              <Area type="monotone" dataKey="revenue" stroke="#1a3c6e" strokeWidth={2} fill="url(#revenueGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Quick Links */}
      {!isOwner() && (
        <div className="card">
          <h2 className="section-title">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Add Course', to: '/admin/courses/new', color: '#1a3c6e', icon: BookOpen },
              { label: 'Add Product', to: '/admin/products/new', color: '#d4a017', icon: ShoppingBag },
              { label: 'View Leads', to: '/admin/crm', color: '#800020', icon: Target },
              { label: 'View Reports', to: '/admin/analytics', color: '#1a3c6e', icon: TrendingUp },
            ].map(q => (
              <Link key={q.to} to={q.to}
                className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border hover:border-gold transition-all hover:-translate-y-0.5 hover:shadow-premium text-center bg-white">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: q.color + '15' }}>
                  <q.icon size={20} style={{ color: q.color }} />
                </div>
                <span className="font-body font-semibold text-navy text-sm">{q.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
