import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import useCompanyStore from '@/store/companyStore';

export default function AdminLayout() {
  const { company } = useCompanyStore();

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      <Sidebar company={company} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
