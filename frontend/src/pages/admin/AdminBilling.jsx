import { useState, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import { billingApi } from '../../services/api';
import toast from 'react-hot-toast';

const PLAN_COLORS = {
  FREE: 'bg-gray-100 text-gray-700',
  STARTER: 'bg-blue-100 text-blue-700',
  PROFESSIONAL: 'bg-yellow-100 text-yellow-800',
  ENTERPRISE: 'bg-purple-100 text-purple-700',
};

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-700',
  PAST_DUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  TRIALING: 'bg-blue-100 text-blue-700',
};

export default function AdminBilling() {
  const { user } = useAuthStore();
  const companyId = user?.companyId;
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(null);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [plansRes, subRes, invRes] = await Promise.allSettled([
          billingApi.getPlans(),
          billingApi.getSubscription(companyId),
          billingApi.getInvoices(companyId),
        ]);
        if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data?.data || []);
        if (subRes.status === 'fulfilled') setSubscription(subRes.value.data?.data);
        if (invRes.status === 'fulfilled') setInvoices(invRes.value.data?.data || []);
      } finally {
        setLoading(false);
      }
    };
    if (companyId) load();
  }, [companyId]);

  const handleUpgrade = async (planId, planName) => {
    setUpgrading(planId);
    try {
      await billingApi.subscribe(companyId, { planId, gateway: 'RAZORPAY' });
      toast.success(`Upgraded to ${planName}!`);
      const res = await billingApi.getSubscription(companyId);
      setSubscription(res.data?.data);
    } catch {
      toast.error('Upgrade failed. Please try again.');
    } finally {
      setUpgrading(null);
    }
  };

  const handleCancel = async () => {
    try {
      await billingApi.cancel(companyId, {});
      toast.success('Subscription cancelled at period end.');
      setShowCancel(false);
      const res = await billingApi.getSubscription(companyId);
      setSubscription(res.data?.data);
    } catch {
      toast.error('Cancellation failed.');
    }
  };

  const currentPlan = subscription?.plan;

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-bold text-navy-800">Billing &amp; Subscription</h1>
        <p className="text-gray-500 mt-1">Manage your plan and payment history</p>
      </div>

      {subscription ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Current Plan</p>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-serif font-bold text-navy-800">
                  {currentPlan?.displayName || currentPlan?.name}
                </h2>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${PLAN_COLORS[currentPlan?.name] || 'bg-gray-100 text-gray-700'}`}>
                  {currentPlan?.name}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[subscription.status] || 'bg-gray-100'}`}>
                  {subscription.status}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-2">
                Renews on {subscription.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-navy-800">
                ₹{Number(currentPlan?.price || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-sm text-gray-400">/{currentPlan?.billingCycle?.toLowerCase() || 'month'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
            {[
              { label: 'Users', max: currentPlan?.maxUsers ?? '∞' },
              { label: 'Courses', max: currentPlan?.maxCourses ?? '∞' },
              { label: 'Products', max: currentPlan?.maxProducts ?? '∞' },
              { label: 'Storage', max: currentPlan?.maxStorage ? `${currentPlan.maxStorage} MB` : '∞' },
            ].map(({ label, max }) => (
              <div key={label} className="text-center bg-cream-50 rounded-xl p-3">
                <p className="text-lg font-bold text-navy-800">{max}</p>
                <p className="text-xs text-gray-500">{label} allowed</p>
              </div>
            ))}
          </div>
          {subscription.status === 'ACTIVE' && !subscription.cancelAtPeriodEnd && (
            <button onClick={() => setShowCancel(true)} className="mt-4 text-sm text-red-500 hover:text-red-700 underline">
              Cancel subscription
            </button>
          )}
          {subscription.cancelAtPeriodEnd && (
            <p className="mt-4 text-sm text-orange-600 font-medium">Cancels at end of billing period.</p>
          )}
        </div>
      ) : (
        <div className="bg-cream-50 rounded-2xl p-6 text-center text-gray-500">No active subscription found.</div>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-lg font-serif font-semibold text-navy-800 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrent = currentPlan?.name === plan.name;
            return (
              <div key={plan.id} className={`rounded-2xl border-2 p-5 flex flex-col transition ${isCurrent ? 'border-gold-500 bg-yellow-50' : 'border-gray-200 bg-white hover:border-navy-300'}`}>
                {isCurrent && <span className="text-xs bg-gold-500 text-white px-2 py-0.5 rounded-full self-start mb-2 font-medium">Current</span>}
                <h3 className="font-serif font-bold text-navy-800 text-lg">{plan.displayName || plan.name}</h3>
                <p className="text-2xl font-bold text-navy-800 mt-2">
                  ₹{Number(plan.price).toLocaleString('en-IN')}
                  <span className="text-sm font-normal text-gray-400">/{plan.billingCycle?.toLowerCase()}</span>
                </p>
                <ul className="mt-4 space-y-1.5 flex-1 text-sm text-gray-600">
                  {(plan.features?.length ? plan.features : [
                    `${plan.maxUsers ?? '∞'} Users`,
                    `${plan.maxCourses ?? '∞'} Courses`,
                    `${plan.maxProducts ?? '∞'} Products`,
                    plan.maxStorage ? `${plan.maxStorage} MB Storage` : 'Unlimited Storage',
                  ]).map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => !isCurrent && handleUpgrade(plan.id, plan.name)}
                  disabled={isCurrent || !!upgrading}
                  className={`mt-4 w-full py-2 rounded-lg text-sm font-semibold transition ${
                    isCurrent ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-navy-800 text-white hover:bg-navy-700'
                  }`}
                >
                  {upgrading === plan.id ? 'Processing…' : isCurrent ? 'Current Plan' : 'Upgrade'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice History */}
      <div>
        <h2 className="text-lg font-serif font-semibold text-navy-800 mb-4">Payment History</h2>
        {invoices.length === 0 ? (
          <div className="bg-cream-50 rounded-xl p-6 text-center text-gray-400">No payments recorded yet.</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cream-50 text-navy-800 text-left">
                <tr>{['Date', 'Amount', 'Gateway', 'Status'].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-cream-50/50">
                    <td className="px-4 py-3 text-gray-600">{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 font-medium text-navy-800">₹{Number(inv.amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-gray-600">{inv.gateway}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inv.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : inv.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCancel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-serif font-bold text-navy-800 text-lg mb-2">Cancel Subscription?</h3>
            <p className="text-gray-500 text-sm mb-6">Your plan stays active until period end. No further charges.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCancel(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Keep Plan</button>
              <button onClick={handleCancel} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
