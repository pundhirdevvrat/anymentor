import useAuthStore from '@/store/authStore';
import { User, Mail, Phone, Shield } from 'lucide-react';

export default function Profile() {
  const { user } = useAuthStore();
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="page-title mb-8">My Profile</h1>
      <div className="card space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-navy flex items-center justify-center text-gold font-serif text-2xl font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-navy">{user?.firstName} {user?.lastName}</h2>
            <span className="badge-navy">{user?.role?.toLowerCase().replace('_', ' ')}</span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-muted font-body"><Mail size={16} />{user?.email}</div>
          {user?.phone && <div className="flex items-center gap-3 text-muted font-body"><Phone size={16} />{user?.phone}</div>}
          <div className="flex items-center gap-3 text-muted font-body"><Shield size={16} />Role: {user?.role}</div>
        </div>
      </div>
    </div>
  );
}
