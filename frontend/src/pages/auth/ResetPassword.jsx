import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api';
import ParticleBackground from '@/components/shared/ParticleBackground';

export default function ResetPassword() {
  const { token } = useParams();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const onSubmit = async ({ password }) => {
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      setDone(true);
      toast.success('Password reset successfully!');
    } catch (err) { toast.error(err.response?.data?.error?.message || 'Reset failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a3c6e, #800020)' }}>
      <ParticleBackground count={20} color="#d4a017" opacity={0.2} />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md mx-4 bg-cream rounded-2xl shadow-premium-lg overflow-hidden">
        <div className="px-8 py-8 text-center" style={{ background: 'linear-gradient(135deg, #1a3c6e, #800020)' }}>
          <h1 className="font-serif text-3xl font-bold text-white">Reset Password</h1>
        </div>
        <div className="px-8 py-8">
          {done ? (
            <div className="text-center">
              <CheckCircle size={48} className="text-emerald-600 mx-auto mb-4" />
              <h2 className="font-serif text-xl font-bold text-navy mb-2">Password Updated!</h2>
              <Link to="/login" className="btn-secondary inline-block mt-4">Go to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-navy font-semibold text-sm mb-1.5">New Password</label>
                <div className="relative">
                  <input type={show ? 'text' : 'password'} className="input-field pr-10"
                    {...register('password', { required: true, minLength: { value: 8, message: 'Min 8 chars' }, pattern: { value: /(?=.*[A-Z])(?=.*[0-9])/, message: 'Uppercase + number required' } })} />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
                {errors.password && <p className="text-maroon text-xs mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-navy font-semibold text-sm mb-1.5">Confirm Password</label>
                <input type="password" className="input-field"
                  {...register('confirm', { validate: v => v === watch('password') || 'Passwords do not match' })} />
                {errors.confirm && <p className="text-maroon text-xs mt-1">{errors.confirm.message}</p>}
              </div>
              <button type="submit" disabled={loading} className="btn-secondary w-full">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
