import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { companyApi } from '@/services/api';
import useCompanyStore from '@/store/companyStore';
import { useEffect } from 'react';

export default function Shop() {
  const { slug } = useParams();
  const { setCompany, company } = useCompanyStore();

  const { data } = useQuery({
    queryKey: ['company', slug],
    queryFn: () => slug ? companyApi.getBySlug(slug).then(r => r.data.data) : null,
    enabled: !!slug,
  });

  useEffect(() => { if (data) setCompany(data); }, [data]);

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="font-serif text-4xl font-bold text-navy">{company?.name || 'Shop'}</h1>
        <p className="text-muted font-body mt-2">Company portal — connect to lmsApi / shopApi from services/api.js</p>
      </div>
    </div>
  );
}
