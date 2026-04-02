import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { authApi } from '@/services/api';
import ParticleBackground from '@/components/shared/ParticleBackground';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a3c6e, #800020)' }}>
      <ParticleBackground count={20} color="#d4a017" opacity={0.2} />
      <div className="relative z-10 bg-cream rounded-2xl p-10 max-w-md mx-4 text-center shadow-premium-lg">
        {status === 'loading' && <><Loader size={48} className="animate-spin text-gold mx-auto mb-4" /><p className="font-serif text-xl text-navy">Verifying your email...</p></>}
        {status === 'success' && <><CheckCircle size={48} className="text-emerald-600 mx-auto mb-4" /><h2 className="font-serif text-2xl font-bold text-navy mb-3">Email Verified!</h2><p className="text-muted font-body mb-6">Your account is now active.</p><Link to="/login" className="btn-secondary inline-block">Sign In</Link></>}
        {status === 'error' && <><XCircle size={48} className="text-maroon mx-auto mb-4" /><h2 className="font-serif text-2xl font-bold text-navy mb-3">Verification Failed</h2><p className="text-muted font-body mb-6">The link is invalid or expired. Try registering again.</p><Link to="/register" className="btn-secondary inline-block">Register Again</Link></>}
      </div>
    </div>
  );
}
