const prisma = require('../../config/database');
const { getPaginationParams, getSortParams } = require('../../utils/pagination');
const { createUniqueSlug } = require('../../utils/slugify');
const { v4: uuidv4 } = require('uuid');

// ─── Products ─────────────────────────────────────────────────

const createProduct = async (data, companyId) => {
  const slug = await createUniqueSlug(data.name, prisma.product, 'slug', { companyId });
  return prisma.product.create({
    data: {
      companyId,
      name: data.name,
      slug,
      description: data.description,
      sku: data.sku,
      price: data.price,
      comparePrice: data.comparePrice,
      categoryId: data.categoryId,
      images: data.images || [],
      stock: data.stock || 0,
      lowStockAlert: data.lowStockAlert || 5,
      isDigital: data.isDigital || false,
      weight: data.weight,
      tags: data.tags || [],
    },
  });
};

const getProducts = async (query, companyId, isAdmin = false) => {
  const { page, limit, skip } = getPaginationParams(query);
  const where = { companyId };

  if (!isAdmin) where.isActive = true;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.isDigital !== undefined) where.isDigital = query.isDigital === 'true';
  if (query.inStock === 'true') where.stock = { gt: 0 };
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { sku: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy: getSortParams(query, ['name', 'price', 'createdAt', 'stock']),
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page, limit };
};

const getProductById = async (id, companyId) => {
  const product = await prisma.product.findFirst({
    where: { id, companyId },
    include: { category: true },
  });
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }
  return product;
};

const updateProduct = async (id, data, companyId) => {
  await getProductById(id, companyId);
  return prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      sku: data.sku,
      price: data.price,
      comparePrice: data.comparePrice,
      categoryId: data.categoryId,
      images: data.images,
      stock: data.stock,
      lowStockAlert: data.lowStockAlert,
      isActive: data.isActive,
      isDigital: data.isDigital,
      weight: data.weight,
      tags: data.tags,
    },
  });
};

// ─── Categories ───────────────────────────────────────────────

const createCategory = async (data, companyId) => {
  const slug = await createUniqueSlug(data.name, prisma.category, 'slug', { companyId });
  return prisma.category.create({ data: { companyId, name: data.name, slug, parentId: data.parentId, image: data.image } });
};

const getCategories = async (companyId) => {
  return prisma.category.findMany({
    where: { companyId, isActive: true },
    include: {
      children: { where: { isActive: true }, select: { id: true, name: true, slug: true } },
      _count: { select: { products: true } },
    },
    orderBy: { order: 'asc' },
  });
};

// ─── Cart ─────────────────────────────────────────────────────

const getCart = async (userId, companyId) => {
  const cart = await prisma.cart.findUnique({ where: { userId_companyId: { userId, companyId } } });
  return cart || { userId, companyId, items: [], total: 0 };
};

const addToCart = async (userId, companyId, { productId, courseId, quantity = 1 }) => {
  const cart = await getCart(userId, companyId);
  const items = Array.isArray(cart.items) ? cart.items : [];

  const itemKey = productId || courseId;
  const existingIdx = items.findIndex(i => (i.productId || i.courseId) === itemKey);

  if (existingIdx >= 0) {
    items[existingIdx].quantity += quantity;
  } else {
    let itemData = {};
    if (productId) {
      const product = await getProductById(productId, companyId);
      if (product.stock < quantity && !product.isDigital) {
        const err = new Error('Insufficient stock');
        err.statusCode = 400;
        throw err;
      }
      itemData = { productId, name: product.name, price: product.price, image: product.images[0] || null, quantity };
    } else if (courseId) {
      const course = await prisma.course.findFirst({ where: { id: courseId, companyId } });
      if (!course) {
        const err = new Error('Course not found');
        err.statusCode = 404;
        throw err;
      }
      itemData = { courseId, name: course.title, price: course.price, image: course.thumbnail, quantity: 1 };
    }
    items.push(itemData);
  }

  return prisma.cart.upsert({
    where: { userId_companyId: { userId, companyId } },
    create: { userId, companyId, items },
    update: { items },
  });
};

const removeFromCart = async (userId, companyId, itemKey) => {
  const cart = await getCart(userId, companyId);
  const items = Array.isArray(cart.items) ? cart.items : [];
  const filtered = items.filter(i => i.productId !== itemKey && i.courseId !== itemKey);

  return prisma.cart.upsert({
    where: { userId_companyId: { userId, companyId } },
    create: { userId, companyId, items: filtered },
    update: { items: filtered },
  });
};

const clearCart = async (userId, companyId) => {
  await prisma.cart.upsert({
    where: { userId_companyId: { userId, companyId } },
    create: { userId, companyId, items: [] },
    update: { items: [] },
  });
};

// ─── Orders ───────────────────────────────────────────────────

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

const createOrder = async (userId, companyId, { items, shippingAddress, billingAddress, notes, couponCode }) => {
  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    if (item.productId) {
      const product = await getProductById(item.productId, companyId);
      if (product.stock < item.quantity && !product.isDigital) {
        const err = new Error(`Insufficient stock for ${product.name}`);
        err.statusCode = 400;
        throw err;
      }
      orderItems.push({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        quantity: item.quantity,
        total: product.price * item.quantity,
        image: product.images[0] || null,
      });
      subtotal += product.price * item.quantity;
    } else if (item.courseId) {
      const course = await prisma.course.findFirst({ where: { id: item.courseId, companyId } });
      if (!course) continue;
      orderItems.push({
        courseId: course.id,
        name: course.title,
        price: course.price,
        quantity: 1,
        total: course.price,
        image: course.thumbnail,
      });
      subtotal += course.price;
    }
  }

  const tax = Math.round(subtotal * 0.18 * 100) / 100; // 18% GST
  const total = subtotal + tax;

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        companyId,
        userId,
        orderNumber: generateOrderNumber(),
        subtotal,
        tax,
        total,
        shippingAddress,
        billingAddress,
        notes,
        couponCode,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    // Decrement stock for physical products
    for (const item of orderItems) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    return newOrder;
  });

  return order;
};

const getOrders = async (query, companyId, userId = null, isAdmin = false) => {
  const { page, limit, skip } = getPaginationParams(query);
  const where = { companyId };

  if (!isAdmin && userId) where.userId = userId;
  if (query.status) where.status = query.status;
  if (query.paymentStatus) where.paymentStatus = query.paymentStatus;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total, page, limit };
};

const updateOrderStatus = async (id, companyId, status) => {
  return prisma.order.update({
    where: { id },
    data: {
      status,
      shippedAt: status === 'SHIPPED' ? new Date() : undefined,
      deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
      canceledAt: status === 'CANCELED' ? new Date() : undefined,
    },
  });
};

module.exports = {
  createProduct, getProducts, getProductById, updateProduct,
  createCategory, getCategories,
  getCart, addToCart, removeFromCart, clearCart,
  createOrder, getOrders, updateOrderStatus,
};
