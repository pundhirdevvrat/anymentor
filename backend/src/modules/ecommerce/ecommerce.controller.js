const service = require('./ecommerce.service');
const ApiResponse = require('../../utils/apiResponse');
const auditLog = require('../../utils/auditLog');
const emailService = require('../../services/email.service');
const prisma = require('../../config/database');

// ─── Products ─────────────────────────────────────────────────

const getProducts = async (req, res, next) => {
  try {
    const isAdmin = req.user && ['OWNER', 'COMPANY_ADMIN', 'MANAGER'].includes(req.user.role);
    const result = await service.getProducts(req.query, req.companyId, isAdmin);
    return ApiResponse.paginated(res, result.products, result);
  } catch (err) { next(err); }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await service.getProductById(req.params.id, req.companyId);
    return ApiResponse.success(res, product);
  } catch (err) { next(err); }
};

const createProduct = async (req, res, next) => {
  try {
    const product = await service.createProduct(req.body, req.companyId);
    await auditLog.log({ userId: req.user.id, companyId: req.companyId, action: 'CREATE_PRODUCT', resource: 'Product', resourceId: product.id, req });
    return ApiResponse.created(res, product);
  } catch (err) { next(err); }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await service.updateProduct(req.params.id, req.body, req.companyId);
    return ApiResponse.success(res, product, 'Product updated');
  } catch (err) { next(err); }
};

// ─── Categories ───────────────────────────────────────────────

const getCategories = async (req, res, next) => {
  try {
    const categories = await service.getCategories(req.companyId);
    return ApiResponse.success(res, categories);
  } catch (err) { next(err); }
};

const createCategory = async (req, res, next) => {
  try {
    const category = await service.createCategory(req.body, req.companyId);
    return ApiResponse.created(res, category);
  } catch (err) { next(err); }
};

// ─── Cart ─────────────────────────────────────────────────────

const getCart = async (req, res, next) => {
  try {
    const cart = await service.getCart(req.user.id, req.companyId);
    return ApiResponse.success(res, cart);
  } catch (err) { next(err); }
};

const addToCart = async (req, res, next) => {
  try {
    const cart = await service.addToCart(req.user.id, req.companyId, req.body);
    return ApiResponse.success(res, cart, 'Added to cart');
  } catch (err) { next(err); }
};

const removeFromCart = async (req, res, next) => {
  try {
    const cart = await service.removeFromCart(req.user.id, req.companyId, req.params.itemId);
    return ApiResponse.success(res, cart, 'Item removed from cart');
  } catch (err) { next(err); }
};

const clearCart = async (req, res, next) => {
  try {
    await service.clearCart(req.user.id, req.companyId);
    return ApiResponse.success(res, null, 'Cart cleared');
  } catch (err) { next(err); }
};

// ─── Orders ───────────────────────────────────────────────────

const createOrder = async (req, res, next) => {
  try {
    const order = await service.createOrder(req.user.id, req.companyId, req.body);
    await auditLog.log({ userId: req.user.id, companyId: req.companyId, action: 'CREATE_ORDER', resource: 'Order', resourceId: order.id, req });

    // Clear cart after successful order
    await service.clearCart(req.user.id, req.companyId);

    return ApiResponse.created(res, order, 'Order created');
  } catch (err) { next(err); }
};

const getOrders = async (req, res, next) => {
  try {
    const isAdmin = req.user && ['OWNER', 'COMPANY_ADMIN', 'MANAGER'].includes(req.user.role);
    const userId = isAdmin ? null : req.user.id;
    const result = await service.getOrders(req.query, req.companyId, userId, isAdmin);
    return ApiResponse.paginated(res, result.orders, result);
  } catch (err) { next(err); }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { items: true, user: { select: { id: true, firstName: true, lastName: true, email: true } }, payments: true },
    });
    if (!order) return ApiResponse.notFound(res, 'Order');
    return ApiResponse.success(res, order);
  } catch (err) { next(err); }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const order = await service.updateOrderStatus(req.params.id, req.companyId, req.body.status);
    await auditLog.log({ userId: req.user.id, companyId: req.companyId, action: 'UPDATE_ORDER_STATUS', resource: 'Order', resourceId: req.params.id, changes: { status: req.body.status }, req });
    return ApiResponse.success(res, order, 'Order status updated');
  } catch (err) { next(err); }
};

module.exports = {
  getProducts, getProductById, createProduct, updateProduct,
  getCategories, createCategory,
  getCart, addToCart, removeFromCart, clearCart,
  createOrder, getOrders, getOrderById, updateOrderStatus,
};
