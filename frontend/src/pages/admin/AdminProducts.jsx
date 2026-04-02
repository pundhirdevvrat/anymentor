import { useState, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import { shopApi } from '../../services/api';
import toast from 'react-hot-toast';

const emptyForm = {
  name: '',
  description: '',
  price: '',
  salePrice: '',
  stock: '',
  sku: '',
  categoryId: '',
  isActive: true,
};

export default function AdminProducts() {
  const { user } = useAuthStore();
  const companyId = user?.companyId;

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (!companyId) return;
    fetchProducts();
    fetchCategories();
  }, [companyId]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await shopApi.getProducts(companyId);
      setProducts(res.data?.data || res.data || []);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await shopApi.getCategories(companyId);
      setCategories(res.data?.data || res.data || []);
    } catch {}
  };

  const openNew = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price ?? '',
      salePrice: product.salePrice ?? '',
      stock: product.stock ?? '',
      sku: product.sku || '',
      categoryId: product.categoryId || product.category?._id || '',
      isActive: product.isActive !== false,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price) || 0,
        salePrice: form.salePrice !== '' ? parseFloat(form.salePrice) : null,
        stock: parseInt(form.stock) || 0,
      };
      if (editingProduct) {
        await shopApi.updateProduct(companyId, editingProduct._id || editingProduct.id, payload);
        toast.success('Product updated');
      } else {
        await shopApi.createProduct(companyId, payload);
        toast.success('Product created');
      }
      closeModal();
      fetchProducts();
    } catch {
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    try {
      await shopApi.updateProduct(companyId, product._id || product.id, { isActive: false });
      toast.success('Product removed');
      setDeleteConfirm(null);
      fetchProducts();
    } catch {
      toast.error('Failed to remove product');
    }
  };

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || (p.categoryId === categoryFilter || p.category?._id === categoryFilter);
    return matchSearch && matchCat;
  });

  const getCategoryName = (product) => {
    if (product.category?.name) return product.category.name;
    const cat = categories.find((c) => c._id === product.categoryId);
    return cat?.name || '—';
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a3c6e] font-serif">Products</h1>
          <p className="text-sm text-gray-500 mt-1">{products.length} total products</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-[#1a3c6e] text-white px-4 py-2 rounded-lg hover:bg-[#15325c] transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e]"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e] bg-white"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f5f0e8] text-[#1a3c6e] text-xs font-semibold uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-center">Stock</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-t border-gray-50 animate-pulse">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-200 rounded-lg" /><div className="h-4 bg-gray-200 rounded w-32" /></div></td>
                  <td className="px-4 py-3"><div className="h-3 bg-gray-200 rounded w-20" /></td>
                  <td className="px-4 py-3"><div className="h-3 bg-gray-200 rounded w-24" /></td>
                  <td className="px-4 py-3"><div className="h-3 bg-gray-200 rounded w-16 ml-auto" /></td>
                  <td className="px-4 py-3"><div className="h-3 bg-gray-200 rounded w-10 mx-auto" /></td>
                  <td className="px-4 py-3"><div className="h-5 bg-gray-200 rounded-full w-16 mx-auto" /></td>
                  <td className="px-4 py-3"><div className="h-5 bg-gray-200 rounded w-16 mx-auto" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="font-medium">No products found</p>
                </td>
              </tr>
            ) : (
              filtered.map((product) => {
                const stockLow = (product.stock ?? 0) <= 5;
                return (
                  <tr key={product._id || product.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#f5f0e8] to-[#e8dfc8] flex items-center justify-center shrink-0 border border-gray-100">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium text-gray-800 line-clamp-1">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{product.sku || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{getCategoryName(product)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-gray-800">₹{product.price || 0}</span>
                        {product.salePrice ? (
                          <span className="text-xs text-[#d4a017]">Sale: ₹{product.salePrice}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${stockLow ? 'text-red-600' : 'text-gray-700'}`}>
                        {product.stock ?? 0}
                      </span>
                      {stockLow && <span className="text-xs text-red-500 block">Low</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${product.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {product.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(product)}
                          className="p-1.5 text-gray-400 hover:text-[#1a3c6e] hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(product)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-[#f5f0e8] rounded-t-xl">
              <h2 className="text-lg font-bold text-[#1a3c6e]">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e]" placeholder="Product name" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e] resize-none" placeholder="Product description..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                  <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e]" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price (₹)</label>
                  <input type="number" min="0" step="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e]" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e]" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e]" placeholder="SKU-001" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e] bg-white">
                    <option value="">Select category</option>
                    {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div onClick={() => setForm({ ...form, isActive: !form.isActive })}
                      className={`relative w-10 h-5 rounded-full transition-colors ${form.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-[#1a3c6e] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#15325c] disabled:opacity-60 transition-colors">
                  {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
                <button type="button" onClick={closeModal}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 shadow-2xl w-80">
            <h3 className="font-bold text-[#1a3c6e] text-lg mb-2">Remove Product</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to deactivate <strong>{deleteConfirm.name}</strong>?</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Remove</button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-200 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
