import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, ShoppingBag, Target, BarChart2, Shield, Zap, ArrowRight, CheckCircle, Star } from 'lucide-react';
import ParticleBackground from '@/components/shared/ParticleBackground';

const FEATURES = [
  { icon: BookOpen, title: 'Learning Management', desc: 'Host courses, track progress, issue certificates', color: '#1a3c6e' },
  { icon: ShoppingBag, title: 'E-commerce Store', desc: 'Sell products with UPI, PhonePe, Razorpay', color: '#d4a017' },
  { icon: Target, title: 'CRM & Leads', desc: 'Capture and convert leads with pipeline management', color: '#800020' },
  { icon: BarChart2, title: 'Analytics Dashboard', desc: 'Revenue, growth, and performance insights', color: '#1a3c6e' },
  { icon: Shield, title: 'Enterprise Security', desc: 'JWT, bcrypt, RBAC, data isolation per company', color: '#d4a017' },
  { icon: Zap, title: 'Multi-Company', desc: 'One platform, unlimited companies, separate branding', color: '#800020' },
];

const PLANS = [
  { name: 'Free', price: '₹0', period: '/month', features: ['5 Users', '3 Courses', '10 Products', '1GB Storage', 'Email Support'], cta: 'Get Started', highlight: false },
  { name: 'Pro', price: '₹4,999', period: '/month', features: ['100 Users', 'Unlimited Courses', 'Unlimited Products', '50GB Storage', 'Priority Support', 'Custom Domain', 'API Access'], cta: 'Start Pro', highlight: true },
  { name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited Users', 'Unlimited Everything', 'Dedicated Support', 'SLA Guarantee', 'Custom Integrations', 'White-label'], cta: 'Contact Us', highlight: false },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: 'easeOut' },
};

export default function Landing() {
  return (
    <div className="min-h-screen font-body">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a3c6e 0%, #2a5499 40%, #800020 100%)' }}>
        <ParticleBackground count={50} color="#d4a017" opacity={0.3} />

        {/* Animated gradient orbs */}
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full opacity-10 blur-3xl animate-pulse" style={{ background: '#d4a017' }} />
        <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full opacity-10 blur-3xl animate-pulse" style={{ background: '#d4a017', animationDelay: '1s' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6"
              style={{ background: 'rgba(212, 160, 23, 0.15)', color: '#d4a017', border: '1px solid rgba(212, 160, 23, 0.3)' }}>
              <Zap size={14} /> Enterprise Multi-Tenant SaaS Platform
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
            className="font-serif text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
          >
            One Platform,{' '}
            <span style={{ color: '#d4a017' }}>Every Business</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto mb-10 font-body font-light"
          >
            Host multiple branded portals — LMS, E-commerce, CRM — all under one unified admin system with complete data isolation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/register"
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-body font-semibold text-lg transition-all hover:shadow-gold hover:scale-105 animate-pulse-gold"
              style={{ background: '#d4a017', color: '#1a3c6e' }}>
              Start Free Today <ArrowRight size={20} />
            </Link>
            <Link to="/c/demo-academy"
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-body font-semibold text-lg transition-all hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>
              View Live Demo
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }}
            className="flex flex-wrap justify-center gap-8 mt-16"
          >
            {[['100+', 'Companies'], ['50K+', 'Students'], ['₹2Cr+', 'Revenue Generated'], ['99.9%', 'Uptime']].map(([val, label]) => (
              <div key={label} className="text-center">
                <p className="font-serif text-3xl font-bold" style={{ color: '#d4a017' }}>{val}</p>
                <p className="text-white/70 text-sm font-body mt-1">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-navy mb-4">
              Everything Your Business Needs
            </h2>
            <p className="text-xl text-muted max-w-2xl mx-auto font-body">
              Six powerful modules, fully integrated, independently scalable
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feat, i) => (
              <motion.div key={feat.title} {...fadeUp} transition={{ duration: 0.6, delay: i * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-premium hover:shadow-premium-lg transition-all hover:-translate-y-1 border border-border group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110"
                  style={{ background: feat.color + '15' }}>
                  <feat.icon size={24} style={{ color: feat.color }} />
                </div>
                <h3 className="font-serif text-xl font-semibold text-navy mb-3">{feat.title}</h3>
                <p className="text-muted font-body">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24" style={{ background: 'linear-gradient(135deg, #1a3c6e 0%, #800020 100%)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 {...fadeUp} className="font-serif text-4xl font-bold text-white mb-4">
            How It Works
          </motion.h2>
          <motion.p {...fadeUp} className="text-xl text-white/70 mb-16 font-body">
            From signup to live portal in minutes
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Register', desc: 'Create your platform owner account in 30 seconds' },
              { step: '02', title: 'Add Company', desc: 'Set up a company with branding and features' },
              { step: '03', title: 'Add Content', desc: 'Upload courses, products, and manage leads' },
              { step: '04', title: 'Go Live', desc: 'Your branded portal is instantly accessible' },
            ].map((item, i) => (
              <motion.div key={item.step} {...fadeUp} transition={{ delay: i * 0.15 }}
                className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 font-serif text-2xl font-bold"
                  style={{ background: 'rgba(212, 160, 23, 0.2)', color: '#d4a017', border: '1px solid rgba(212, 160, 23, 0.3)' }}>
                  {item.step}
                </div>
                <h3 className="font-serif text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-white/60 text-sm font-body">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-navy mb-4">Simple Pricing</h2>
            <p className="text-xl text-muted font-body">Start free. Scale as you grow.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PLANS.map((plan, i) => (
              <motion.div key={plan.name} {...fadeUp} transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-8 border transition-all hover:-translate-y-1 ${
                  plan.highlight
                    ? 'shadow-premium-lg scale-105'
                    : 'bg-white border-border shadow-premium'
                }`}
                style={plan.highlight ? { background: '#1a3c6e', borderColor: '#d4a017', borderWidth: 2 } : {}}>
                {plan.highlight && (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4"
                    style={{ background: '#d4a017', color: '#1a3c6e' }}>Most Popular</span>
                )}
                <h3 className={`font-serif text-2xl font-bold mb-2 ${plan.highlight ? 'text-white' : 'text-navy'}`}>
                  {plan.name}
                </h3>
                <div className="flex items-end gap-1 mb-6">
                  <span className={`font-serif text-4xl font-bold ${plan.highlight ? 'text-gold' : 'text-navy'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm mb-1 ${plan.highlight ? 'text-white/60' : 'text-muted'}`}>{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(feat => (
                    <li key={feat} className="flex items-center gap-2">
                      <CheckCircle size={16} style={{ color: plan.highlight ? '#d4a017' : '#1a3c6e' }} />
                      <span className={`font-body text-sm ${plan.highlight ? 'text-white/80' : 'text-muted'}`}>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register"
                  className="block text-center py-3 rounded-xl font-body font-semibold transition-all hover:scale-105"
                  style={plan.highlight
                    ? { background: '#d4a017', color: '#1a3c6e' }
                    : { background: '#1a3c6e', color: '#f5f0e8' }}>
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-navy">
        <motion.div {...fadeUp} className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-white/70 font-body mb-10">
            Join hundreds of companies already using AnyMentor to grow their business.
          </p>
          <Link to="/register"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-body font-bold text-lg transition-all hover:shadow-gold hover:scale-105"
            style={{ background: '#d4a017', color: '#1a3c6e' }}>
            Start Free — No Credit Card Required <ArrowRight size={20} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-navy border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="font-serif text-2xl font-bold text-gold">AnyMentor</span>
            <p className="text-white/50 text-sm font-body">
              © {new Date().getFullYear()} AnyMentor. Built with ♥ for Indian businesses.
            </p>
            <div className="flex gap-6">
              <Link to="/login" className="text-white/60 hover:text-white text-sm font-body transition-colors">Login</Link>
              <Link to="/register" className="text-white/60 hover:text-white text-sm font-body transition-colors">Register</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
