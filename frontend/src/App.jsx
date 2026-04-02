import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';

// Layouts
import AdminLayout from '@/components/layout/AdminLayout';
import { ProtectedRoute, RoleRoute, GuestRoute } from '@/components/layout/ProtectedRoute';

// Eagerly loaded pages
import Landing from '@/pages/Landing';

// Lazy loaded pages
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const VerifyEmail = lazy(() => import('@/pages/auth/VerifyEmail'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));

// Admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminCourses = lazy(() => import('@/pages/admin/AdminCourses'));
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts'));
const AdminCRM = lazy(() => import('@/pages/admin/AdminCRM'));
const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics'));
const AdminBilling = lazy(() => import('@/pages/admin/AdminBilling'));
const AdminSupport = lazy(() => import('@/pages/admin/AdminSupport'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders'));

// Owner pages
const OwnerCompanies = lazy(() => import('@/pages/owner/OwnerCompanies'));
const OwnerAnalytics = lazy(() => import('@/pages/owner/OwnerAnalytics'));

// Portal pages
const CompanyPortal = lazy(() => import('@/pages/portal/CompanyPortal'));
const CourseCatalog = lazy(() => import('@/pages/portal/CourseCatalog'));
const CourseDetail = lazy(() => import('@/pages/portal/CourseDetail'));
const Shop = lazy(() => import('@/pages/portal/Shop'));
const Cart = lazy(() => import('@/pages/portal/Cart'));

// User pages
const Profile = lazy(() => import('@/pages/shared/Profile'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-cream">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-3 border-navy/20 border-t-gold rounded-full animate-spin border-[3px]" />
      <span className="font-serif text-navy font-medium">Loading...</span>
    </div>
  </div>
);

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
        <Route path="/auth/reset-password/:token" element={<ResetPassword />} />
        <Route path="/auth/verify-email/:token" element={<VerifyEmail />} />

        {/* Company Portals (public) */}
        <Route path="/c/:slug" element={<CompanyPortal />} />
        <Route path="/c/:slug/courses" element={<CourseCatalog />} />
        <Route path="/c/:slug/courses/:courseId" element={<CourseDetail />} />
        <Route path="/c/:slug/shop" element={<Shop />} />
        <Route path="/c/:slug/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />

        {/* Authenticated user routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Admin panel (Company Admin / Manager) */}
        <Route path="/admin" element={<ProtectedRoute><RoleRoute roles={['OWNER', 'COMPANY_ADMIN', 'MANAGER']}><AdminLayout /></RoleRoute></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="crm" element={<AdminCRM />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="billing" element={<AdminBilling />} />
          <Route path="support" element={<AdminSupport />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Owner panel */}
        <Route path="/owner" element={<ProtectedRoute><RoleRoute roles={['OWNER']}><AdminLayout /></RoleRoute></ProtectedRoute>}>
          <Route index element={<Navigate to="/owner/companies" replace />} />
          <Route path="companies" element={<OwnerCompanies />} />
          <Route path="analytics" element={<OwnerAnalytics />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={
          <div className="flex flex-col items-center justify-center h-screen bg-cream gap-4">
            <span className="font-serif text-6xl font-bold text-navy">404</span>
            <p className="text-muted font-body">Page not found</p>
            <a href="/" className="btn-primary">Go Home</a>
          </div>
        } />
      </Routes>
    </Suspense>
  );
}
