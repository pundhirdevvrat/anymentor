import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api';
import ParticleBackground from '@/components/shared/ParticleBackground';

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ email }) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch { toast.error('Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a3c6e, #800020)' }}>
      <ParticleBackground count={20} color="#d4a017" opacity={0.2} />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md mx-4 bg-cream rounded-2xl shadow-premium-lg overflow-hidden">
        <div className="px-8 py-8 text-center" style={{ background: 'linear-gradient(135deg, #1a3c6e, #800020)' }}>
          <h1 className="font-serif text-3xl font-bold text-white">Forgot Password?</h1>
          <p className="text-white/70 font-body mt-2">We'll send a reset link to your email</p>
        </div>
        <div className="px-8 py-8">
          {sent ? (
            <div className="text-center">
              <CheckCircle size={48} className="text-emerald-600 mx-auto mb-4" />
              <h2 className="font-serif text-xl font-bold text-navy mb-2">Email Sent!</h2>
              <p className="text-muted font-body mb-6">Check your inbox for the password reset link. It expires in 1 hour.</p>
              <Link to="/login" className="btn-secondary inline-flex items-center gap-2"><ArrowLeft size={16} /> Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-navy font-semibold text-sm mb-1.5">Email Address</label>
                <input type="email" className="input-field" placeholder="you@example.com"
                  {...register('email', { required: 'Email is required' })} />
                {errors.email && <p className="text-maroon text-xs mt-1">{errors.email.message}</p>}
              </div>
              <button type="submit" disabled={loading} className="btn-secondary w-full flex items-center justify-center gap-2">
                {loading ? <div className="w-5 h-5 border-2 border-cream/30 border-t-cream rounded-full animate-spin" /> : <><Mail size={18} /> Send Reset Link</>}
              </button>
              <Link to="/login" className="flex items-center justify-center gap-2 text-muted hover:text-navy font-body text-sm transition-colors">
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
