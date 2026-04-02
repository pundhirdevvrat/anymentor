import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Users, BookOpen, ShoppingBag, Target, BarChart2,
  CreditCard, HeadphonesIcon, Settings, Building2, ChevronLeft, ChevronRight
} from 'lucide-react';
import useAuthStore from '@/store/authStore';
import { useState } from 'react';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin', exact: true },
  { icon: Users, label: 'Users', path: '/admin/users' },
  { icon: BookOpen, label: 'Courses', path: '/admin/courses', feature: 'hasLms' },
  { icon: ShoppingBag, label: 'Products', path: '/admin/products', feature: 'hasEcommerce' },
  { icon: ShoppingBag, label: 'Orders', path: '/admin/orders', feature: 'hasEcommerce' },
  { icon: Target, label: 'CRM', path: '/admin/crm', feature: 'hasCrm' },
  { icon: BarChart2, label: 'Analytics', path: '/admin/analytics', feature: 'hasAnalytics' },
  { icon: CreditCard, label: 'Billing', path: '/admin/billing' },
  { icon: HeadphonesIcon, label: 'Support', path: '/admin/support', feature: 'hasSupport' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

const OWNER_ITEMS = [
  { icon: Building2, label: 'Companies', path: '/owner/companies' },
  { icon: BarChart2, label: 'Platform Analytics', path: '/owner/analytics' },
  { icon: CreditCard, label: 'Billing Plans', path: '/owner/plans' },
  { icon: Settings, label: 'Platform Settings', path: '/owner/settings' },
];

export default function Sidebar({ company = null }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, isOwner } = useAuthStore();

  const navItems = isOwner() ? OWNER_ITEMS : NAV_ITEMS;
  const filteredItems = navItems.filter(item => {
    if (!item.feature) return true;
    return company?.[item.feature] !== false;
  });

  return (
    <aside className={clsx(
      'flex flex-col bg-navy text-cream transition-all duration-300 h-full',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2">
            {company?.logo ? (
              <img src={company.logo} alt={company.name} className="h-7 w-auto" />
            ) : (
              <span className="font-serif text-lg font-bold text-gold">
                {company?.name || 'AnyMentor'}
              </span>
            )}
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg text-cream/60 hover:text-cream hover:bg-white/10 transition-colors ml-auto"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* User info */}
      {!collapsed && (
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center text-navy font-semibold text-sm flex-shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-sm truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-cream/60 truncate">{user?.role?.toLowerCase().replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group',
                isActive
                  ? 'bg-gold text-navy font-semibold shadow-gold'
                  : 'text-cream/70 hover:text-cream hover:bg-white/10'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="font-body font-medium text-sm">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
