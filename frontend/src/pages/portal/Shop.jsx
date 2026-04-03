import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { shopApi, companyApi } from '../../services/api';
import useCompanyStore from '../../store/companyStore';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const LIMIT = 12;

export default function Shop() {
  const { slug } = useParams();
  const { company, setCompany } = useCompanyStore();
  const { isAuthenticated } = useAuthStore();

  const [companyId, setCompanyId] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [addingToCart, setAddingToCart] = useState(null);

  // Resolve company
  useEffect(() => {
    if (!slug) return;
    const prom =
      company?.slug === slug
        ? Promise.resolve({ data: { data: company } })
        : companyApi.getBySlug(slug);

    prom
      .then((res) => {
        const data = res.data?.data || res.data;
        setCompany(data);
        const cid = data.id || data._id;
        setCompanyId(cid);
        // Load categories
        shopApi
          .getCategories(cid)
          .then((r) => {
            const cats = r.data?.data || r.data?.categories || r.data || [];
            setCategories(Array.isArray(cats) ? cats : []);
          })
          .catch(() => {});
        // Load cart count
        if (isAuthenticated) {
          shopApi
            .getCart(cid)
            .then((r) => {
              const items = r.data?.data?.items || r.data?.items || [];
              setCartCount(Array.isArray(items) ? items.length : 0);
            })
            .catch(() => {});
        }
      })
      .catch(() => toast.error('Failed to load shop'));
  }, [slug]);

  const fetchProducts = useCallback(() => {
    if (!companyId) return;
    setLoading(true);
    const params = { page, limit: LIMIT };
    if (selectedCategory) params.categoryId = selectedCategory;

    shopApi
      .getProducts(companyId, params)
      .then((res) => {
        const raw = res.data?.data || res.data;
        const list = Array.isArray(raw) ? raw : raw?.products || raw?.items || [];
        const total =
          res.data?.totalPages ||
          Math.ceil((res.data?.total || res.data?.count || list.length) / LIMIT) ||
          1;
        setProducts(list);
        setTotalPages(typeof total === 'number' && total > 0 ? total : 1);
      })
      .catch(() => {
        setProducts([]);
        toast.error('Failed to load products');
      })
      .finally(() => setLoading(false));
  }, [companyId, page, selectedCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddToCart = async (product) => {
    if (!isAuthenticated) {
      toast.error('Please log in to add items to cart');
      return;
    }
    const productId = product.id || product._id;
    setAddingToCart(productId);
    try {
      await shopApi.addToCart(companyId, { productId, quantity: 1 });
      setCartCount((c) => c + 1);
      toast.success(`"${product.name}" added to cart`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(null);
    }
  };

  const primaryColor = company?.primaryColor || '#1a3c6e';
  const goldColor = company?.secondaryColor || '#d4a017';

  const getInitials = (name = '') =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const stockBadge = (product) => {
    const qty = product.stock ?? product.quantity ?? product.stockQuantity;
    if (qty == null) return null;
    if (qty === 0) return { label: 'Out of Stock', cls: 'bg-red-100 text-red-700' };
    if (qty <= 5) return { label: 'Low Stock', cls: 'bg-yellow-100 text-yellow-700' };
    return { label: 'In Stock', cls: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div
        className="py-12 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #800020 100%)` }}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,#fff,transparent)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-white/60 font-body text-sm mb-3">
              <Link to={`/c/${slug}`} className="hover:text-white transition-colors">
                {company?.name || 'Home'}
              </Link>
              <span>/</span>
              <span className="text-white">Shop</span>
            </nav>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-white">Shop</h1>
            <p className="text-white/70 font-body mt-1 text-lg">Browse our curated products</p>
          </div>

          {/* Cart icon */}
          <Link
            to={`/c/${slug}/cart`}
            className="relative p-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-all duration-200"
          >
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {cartCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
                style={{ background: goldColor }}
              >
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category tabs */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
            <button
              onClick={() => { setSelectedCategory(null); setPage(1); }}
              className={`px-5 py-2.5 rounded-xl font-body font-semibold text-sm whitespace-nowrap transition-all duration-200 shrink-0 ${
                !selectedCategory
                  ? 'text-white shadow-premium'
                  : 'bg-white text-navy border border-border hover:border-navy/40'
              }`}
              style={!selectedCategory ? { background: primaryColor } : {}}
            >
              All
            </button>
            {categories.map((cat) => {
              const cid = cat.id || cat._id;
              const active = selectedCategory === cid;
              return (
                <button
                  key={cid}
                  onClick={() => { setSelectedCategory(cid); setPage(1); }}
                  className={`px-5 py-2.5 rounded-xl font-body font-semibold text-sm whitespace-nowrap transition-all duration-200 shrink-0 ${
                    active
                      ? 'text-white shadow-premium'
                      : 'bg-white text-navy border border-border hover:border-navy/40'
                  }`}
                  style={active ? { background: primaryColor } : {}}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Product grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-border animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-border shadow-premium">
            <div className="text-6xl mb-4">🛍️</div>
            <h3 className="font-serif text-2xl text-navy mb-2">No products found</h3>
            <p className="text-muted font-body">Check back soon for new arrivals.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const id = product.id || product._id;
              const badge = stockBadge(product);
              const isAdding = addingToCart === id;
              const outOfStock = (product.stock ?? product.stockQuantity) === 0;
              return (
                <div
                  key={id}
                  className="group bg-white rounded-2xl shadow-premium hover:shadow-premium-lg border border-border overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col"
                >
                  {/* Image */}
                  <div
                    className="h-44 flex items-center justify-center text-white text-4xl font-serif font-bold overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${goldColor}, #b8891a)` }}
                  >
                    {product.imageUrl || product.image ? (
                      <img
                        src={product.imageUrl || product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getInitials(product.name || 'P')
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    {badge && (
                      <span className={`self-start text-xs font-body font-semibold px-2 py-0.5 rounded-full mb-2 ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}

                    <h3 className="font-body font-semibold text-navy line-clamp-2 leading-snug flex-1">
                      {product.name}
                    </h3>

                    {product.shortDescription && (
                      <p className="text-muted text-xs font-body mt-1 line-clamp-2">{product.shortDescription}</p>
                    )}

                    {/* Price */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="font-serif font-bold text-navy text-lg">₹{product.price}</span>
                      {product.salePrice && product.salePrice < product.price && (
                        <span className="text-muted text-sm font-body line-through">₹{product.salePrice}</span>
                      )}
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <span className="text-muted text-sm font-body line-through">₹{product.compareAtPrice}</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={isAdding || outOfStock}
                      className="mt-4 w-full py-2.5 rounded-xl font-body font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: outOfStock ? '#9ca3af' : primaryColor }}
                    >
                      {isAdding ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Adding…
                        </>
                      ) : outOfStock ? (
                        'Out of Stock'
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Add to Cart
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-border bg-white text-navy font-body font-semibold disabled:opacity-40 hover:bg-cream transition-colors"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === '…' ? (
                  <span key={`e-${idx}`} className="px-2 text-muted font-body">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={`w-10 h-10 rounded-xl font-body font-semibold text-sm transition-all duration-200 ${
                      page === item
                        ? 'text-white shadow-premium'
                        : 'bg-white text-navy border border-border hover:bg-cream'
                    }`}
                    style={page === item ? { background: primaryColor } : {}}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-border bg-white text-navy font-body font-semibold disabled:opacity-40 hover:bg-cream transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
