import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Eye, EyeOff, UserPlus, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api';
import ParticleBackground from '@/components/shared/ParticleBackground';

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authApi.register({ firstName: data.firstName, lastName: data.lastName, email: data.email, password: data.password });
      setSuccess(true);
      toast.success('Registration successful! Please verify your email.');
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a3c6e, #800020)' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-cream rounded-2xl p-10 max-w-md mx-4 text-center shadow-premium-lg">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-navy mb-3">Check Your Email!</h2>
          <p className="text-muted font-body mb-6">
            We've sent a verification link to your email address. Click the link to activate your account.
          </p>
          <Link to="/login" className="btn-secondary inline-block">Go to Login</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-12"
      style={{ background: 'linear-gradient(135deg, #1a3c6e 0%, #800020 100%)' }}>
      <ParticleBackground count={25} color="#d4a017" opacity={0.2} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-cream rounded-2xl shadow-premium-lg overflow-hidden">
          <div className="px-8 py-8 text-center" style={{ background: 'linear-gradient(135deg, #1a3c6e, #800020)' }}>
            <Link to="/" className="font-serif text-2xl font-bold" style={{ color: '#d4a017' }}>AnyMentor</Link>
            <h1 className="font-serif text-3xl font-bold text-white mt-2">Create Account</h1>
            <p className="text-white/70 font-body mt-1">Join thousands of businesses</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-8 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-navy font-semibold text-sm mb-1.5">First Name</label>
                <input className="input-field" placeholder="Rahul"
                  {...register('firstName', { required: 'Required', minLength: { value: 2, message: 'Min 2 chars' } })} />
                {errors.firstName && <p className="text-maroon text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-navy font-semibold text-sm mb-1.5">Last Name</label>
                <input className="input-field" placeholder="Sharma"
                  {...register('lastName', { required: 'Required' })} />
                {errors.lastName && <p className="text-maroon text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-navy font-semibold text-sm mb-1.5">Email Address</label>
              <input type="email" className="input-field" placeholder="rahul@example.com"
                {...register('email', { required: 'Email is required' })} />
              {errors.email && <p className="text-maroon text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-navy font-semibold text-sm mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className="input-field pr-10"
                  placeholder="Min 8 chars, uppercase, number"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Minimum 8 characters' },
                    pattern: { value: /(?=.*[A-Z])(?=.*[0-9])/, message: 'Must have uppercase + number' },
                  })} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-maroon text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-navy font-semibold text-sm mb-1.5">Confirm Password</label>
              <input type="password" className="input-field" placeholder="Repeat password"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (val) => val === password || 'Passwords do not match',
                })} />
              {errors.confirmPassword && <p className="text-maroon text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-secondary w-full flex items-center justify-center gap-2">
              {loading
                ? <div className="w-5 h-5 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
                : <><UserPlus size={18} /> Create Account</>
              }
            </button>

            <p className="text-center text-sm font-body text-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-navy font-semibold hover:text-gold transition-colors">Sign in</Link>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
