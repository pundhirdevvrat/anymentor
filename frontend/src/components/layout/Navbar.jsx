import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, ChevronDown, User, LogOut, Settings, LayoutDashboard } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import { authApi } from '@/services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function Navbar({ company = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, isAuthenticated, logout, isManager } = useAuthStore();
  const navigate = useNavigate();

  const primaryColor = company?.primaryColor || '#1a3c6e';
  const goldColor = company?.secondaryColor || '#d4a017';

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  return (
    <nav
      className="sticky top-0 z-50 shadow-premium"
      style={{ background: primaryColor }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={company ? `/c/${company.slug}` : '/'} className="flex items-center gap-2">
            {company?.logo ? (
              <img src={company.logo} alt={company.name} className="h-8 w-auto" />
            ) : (
              <span className="font-serif text-xl font-bold" style={{ color: goldColor }}>
                {company?.name || 'AnyMentor'}
              </span>
            )}
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {company && (
              <>
                {company.hasLms && (
                  <Link to={`/c/${company.slug}/courses`} className="text-cream/80 hover:text-cream font-body font-medium transition-colors">
                    Courses
                  </Link>
                )}
                {company.hasEcommerce && (
                  <Link to={`/c/${company.slug}/shop`} className="text-cream/80 hover:text-cream font-body font-medium transition-colors">
                    Shop
                  </Link>
                )}
                <Link to={`/c/${company.slug}/contact`} className="text-cream/80 hover:text-cream font-body font-medium transition-colors">
                  Contact
                </Link>
              </>
            )}

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 text-cream font-body font-medium transition-colors hover:opacity-80"
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover border-2" style={{ borderColor: goldColor }} />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm" style={{ background: goldColor, color: primaryColor }}>
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                  )}
                  <span>{user?.firstName}</span>
                  <ChevronDown size={14} className={clsx('transition-transform', dropdownOpen && 'rotate-180')} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-premium-lg border border-border overflow-hidden">
                    <Link to="/dashboard" className="flex items-center gap-2 px-4 py-3 text-navy hover:bg-cream transition-colors font-body text-sm"
                      onClick={() => setDropdownOpen(false)}>
                      <LayoutDashboard size={16} /> Dashboard
                    </Link>
                    {isManager() && (
                      <Link to="/admin" className="flex items-center gap-2 px-4 py-3 text-navy hover:bg-cream transition-colors font-body text-sm"
                        onClick={() => setDropdownOpen(false)}>
                        <Settings size={16} /> Admin Panel
                      </Link>
                    )}
                    <Link to="/profile" className="flex items-center gap-2 px-4 py-3 text-navy hover:bg-cream transition-colors font-body text-sm"
                      onClick={() => setDropdownOpen(false)}>
                      <User size={16} /> Profile
                    </Link>
                    <hr className="border-border" />
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 text-maroon hover:bg-red-50 transition-colors font-body text-sm">
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-cream/80 hover:text-cream font-body font-medium transition-colors">
                  Login
                </Link>
                <Link to="/register"
                  className="px-4 py-2 rounded-lg font-body font-semibold text-sm transition-all hover:opacity-90"
                  style={{ background: goldColor, color: primaryColor }}>
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden text-cream" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden pb-4 border-t border-white/10 mt-2 pt-4 space-y-2">
            {company?.hasLms && (
              <Link to={`/c/${company.slug}/courses`} className="block text-cream/80 hover:text-cream py-2 font-body">Courses</Link>
            )}
            {company?.hasEcommerce && (
              <Link to={`/c/${company.slug}/shop`} className="block text-cream/80 hover:text-cream py-2 font-body">Shop</Link>
            )}
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="block text-cream/80 hover:text-cream py-2 font-body">Dashboard</Link>
                <button onClick={handleLogout} className="block text-cream/80 hover:text-cream py-2 font-body">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="block text-cream/80 hover:text-cream py-2 font-body">Login</Link>
                <Link to="/register" className="block py-2 font-body font-semibold" style={{ color: goldColor }}>Get Started</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
