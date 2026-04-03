import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { shopApi, companyApi } from '../../services/api';
import useCompanyStore from '../../store/companyStore';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function Cart() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { company, setCompany } = useCompanyStore();
  const { user, isAuthenticated } = useAuthStore();
  const companyId = company?.id || user?.companyId;

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [gateway, setGateway] = useState('RAZORPAY');
  const [placing, setPlacing] = useState(false);
  const [address, setAddress] = useState({ name: user?.name || '', phone: '', address: '', city: '', state: '', pincode: '' });

  useEffect(() => {
    const init = async () => {
      if (!company && slug) {
        try {
          const res = await companyApi.getBySlug(slug);
          setCompany(res.data.data);
        } catch {}
      }
    };
    init();
  }, [slug, company]);

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      try {
        const res = await shopApi.getCart(companyId);
        setCart(res.data?.data);
      } catch {
        setCart({ items: [] });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId]);

  const removeItem = async (itemId) => {
    setRemoving(itemId);
    try {
      await shopApi.removeFromCart(companyId, itemId);
      setCart(prev => ({ ...prev, items: prev.items.filter(i => i.id !== itemId) }));
      toast.success('Item removed');
    } catch {
      toast.error('Failed to remove item');
    } finally {
      setRemoving(null);
    }
  };

  const placeOrder = async () => {
    if (!address.name || !address.phone || !address.address || !address.city || !address.pincode) {
      toast.error('Please fill all address fields');
      return;
    }
    setPlacing(true);
    try {
      const res = await shopApi.createOrder(companyId, { shippingAddress: address, gateway });
      toast.success('Order placed successfully!');
      navigate(`/c/${slug}/shop`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Order failed. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const items = cart?.items || [];
  const subtotal = items.reduce((sum, i) => sum + (Number(i.price) * i.quantity), 0);
  const shipping = subtotal > 999 ? 0 : 99;
  const total = subtotal + shipping;

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-4">🛒</p>
        <h2 className="text-xl font-serif font-bold text-navy-800 mb-2">Sign in to view cart</h2>
        <Link to={`/login?redirect=/c/${slug}/cart`} className="text-gold-500 underline">Login</Link>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-navy-800 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Header */}
      <div className="bg-navy-800 text-white py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to={`/c/${slug}`} className="font-serif text-xl font-bold">{company?.name}</Link>
          <nav className="flex gap-4 text-sm">
            <Link to={`/c/${slug}/courses`} className="opacity-80 hover:opacity-100">Courses</Link>
            <Link to={`/c/${slug}/shop`} className="opacity-80 hover:opacity-100">Shop</Link>
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to={`/c/${slug}/shop`} className="hover:text-navy-800">Shop</Link>
          <span>/</span>
          <span className="text-navy-800 font-medium">Cart</span>
        </div>

        <h1 className="text-2xl font-serif font-bold text-navy-800 mb-6">
          Your Cart {items.length > 0 && <span className="text-base font-sans font-normal text-gray-500">({items.length} item{items.length !== 1 ? 's' : ''})</span>}
        </h1>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">🛒</p>
            <h2 className="text-xl font-serif font-bold text-navy-800 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Add some products to get started.</p>
            <Link to={`/c/${slug}/shop`} className="bg-navy-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-navy-700 transition">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map(item => (
                <div key={item.id} className="bg-white rounded-2xl p-4 flex gap-4 shadow-sm">
                  <div className="w-20 h-20 bg-gradient-to-br from-navy-800 to-maroon-700 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-lg">
                    {(item.product?.name || 'P').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-navy-800 truncate">{item.product?.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">SKU: {item.product?.sku || '—'}</p>
                    <p className="text-gold-600 font-bold mt-1">₹{Number(item.price).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={removing === item.id}
                      className="text-red-400 hover:text-red-600 text-sm transition"
                    >
                      {removing === item.id ? '…' : '✕ Remove'}
                    </button>
                    <div className="flex items-center gap-2 bg-cream-50 rounded-lg px-3 py-1">
                      <span className="text-sm font-medium">Qty: {item.quantity}</span>
                    </div>
                    <p className="text-sm font-bold text-navy-800">
                      ₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-serif font-bold text-navy-800 text-lg mb-4">Order Summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Shipping</span>
                    <span className={shipping === 0 ? 'text-green-600 font-medium' : 'font-medium'}>
                      {shipping === 0 ? 'FREE' : `₹${shipping}`}
                    </span>
                  </div>
                  {shipping > 0 && <p className="text-xs text-gray-400">Free shipping on orders above ₹999</p>}
                  <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-navy-800 text-base">
                    <span>Total</span>
                    <span>₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full mt-4 bg-navy-800 text-white py-3 rounded-xl font-semibold hover:bg-navy-700 transition"
                >
                  Proceed to Checkout
                </button>
                <Link to={`/c/${slug}/shop`} className="block text-center mt-3 text-sm text-gray-500 hover:text-navy-800">
                  ← Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-8 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl mb-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-serif font-bold text-navy-800 text-xl">Checkout</h2>
              <button onClick={() => setShowCheckout(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <h3 className="font-semibold text-navy-800">Shipping Address</h3>
              {[
                { key: 'name', label: 'Full Name', placeholder: 'Your name' },
                { key: 'phone', label: 'Phone', placeholder: '10-digit mobile number' },
                { key: 'address', label: 'Address', placeholder: 'Street address, house no.' },
                { key: 'city', label: 'City', placeholder: 'City' },
                { key: 'state', label: 'State', placeholder: 'State' },
                { key: 'pincode', label: 'PIN Code', placeholder: '6-digit PIN' },
              ].map(({ key, label, placeholder }) => (
                <input
                  key={key}
                  value={address[key]}
                  onChange={e => setAddress(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                />
              ))}

              <h3 className="font-semibold text-navy-800 pt-2">Payment Method</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'RAZORPAY', label: 'Razorpay', sub: 'Cards / UPI / Netbanking' },
                  { id: 'PHONEPE', label: 'PhonePe', sub: 'PhonePe wallet' },
                  { id: 'UPI', label: 'UPI QR', sub: 'Scan & Pay' },
                ].map(g => (
                  <button
                    key={g.id}
                    onClick={() => setGateway(g.id)}
                    className={`p-3 rounded-xl border-2 text-left transition ${gateway === g.id ? 'border-navy-800 bg-navy-50' : 'border-gray-200 hover:border-navy-300'}`}
                  >
                    <p className="font-semibold text-navy-800 text-sm">{g.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{g.sub}</p>
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between font-bold text-navy-800 mb-4">
                  <span>Total</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
                <button
                  onClick={placeOrder}
                  disabled={placing}
                  className="w-full bg-gold-500 text-white py-3 rounded-xl font-bold hover:bg-gold-600 transition disabled:opacity-60"
                >
                  {placing ? 'Placing Order…' : `Pay ₹${total.toLocaleString('en-IN')} via ${gateway}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
