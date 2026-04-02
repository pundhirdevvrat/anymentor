const express = require('express');
const router = express.Router({ mergeParams: true });
const c = require('./ecommerce.controller');
const { authenticate, requireManager, requireCompanyAdmin, optionalAuth } = require('../../middleware/auth');
const { resolveCompany, enforceCompanyAccess } = require('../../middleware/tenant');
const { upload, setUploadFolder } = require('../../middleware/upload');

// ─── Categories (public) ──────────────────────────────────────
router.get('/categories', resolveCompany, c.getCategories);
router.post('/categories', authenticate, resolveCompany, enforceCompanyAccess, requireManager, c.createCategory);

// ─── Products (public catalog, admin CRUD) ────────────────────
router.get('/products', resolveCompany, optionalAuth, c.getProducts);
router.get('/products/:id', resolveCompany, c.getProductById);
router.post('/products', authenticate, resolveCompany, enforceCompanyAccess, requireManager, c.createProduct);
router.put('/products/:id', authenticate, resolveCompany, enforceCompanyAccess, requireManager, c.updateProduct);

// Product image upload
router.post('/products/:id/images', authenticate, resolveCompany, enforceCompanyAccess, requireManager,
  setUploadFolder('products'), upload.array('images', 5), async (req, res, next) => {
    try {
      if (!req.files?.length) return require('../../utils/apiResponse').badRequest(res, 'No files');
      const images = req.files.map(f => `/uploads/products/${f.filename}`);
      const product = await require('./ecommerce.service').updateProduct(req.params.id, { images }, req.companyId);
      return require('../../utils/apiResponse').success(res, { images });
    } catch (err) { next(err); }
  }
);

// ─── Cart (authenticated) ─────────────────────────────────────
router.get('/cart', authenticate, resolveCompany, c.getCart);
router.post('/cart', authenticate, resolveCompany, c.addToCart);
router.delete('/cart/:itemId', authenticate, resolveCompany, c.removeFromCart);
router.delete('/cart', authenticate, resolveCompany, c.clearCart);

// ─── Orders ───────────────────────────────────────────────────
router.post('/orders', authenticate, resolveCompany, c.createOrder);
router.get('/orders', authenticate, resolveCompany, enforceCompanyAccess, c.getOrders);
router.get('/orders/:id', authenticate, resolveCompany, c.getOrderById);
router.patch('/orders/:id/status', authenticate, resolveCompany, enforceCompanyAccess, requireManager, c.updateOrderStatus);

module.exports = router;
