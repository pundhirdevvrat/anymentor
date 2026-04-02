const prisma = require('../../config/database');
const { getPaginationParams, getSortParams } = require('../../utils/pagination');
const { createUniqueSlug } = require('../../utils/slugify');
const { invalidateCompanyCache } = require('../../middleware/tenant');

const createCompany = async (data, ownerId) => {
  const slug = await createUniqueSlug(data.name, prisma.company, 'slug');

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  const freePlan = await prisma.plan.findUnique({ where: { name: 'FREE' } });

  const company = await prisma.company.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      ownerId,
      phone: data.phone,
      email: data.email,
      website: data.website,
      address: data.address,
      hasLms: data.hasLms ?? true,
      hasEcommerce: data.hasEcommerce ?? true,
      hasCrm: data.hasCrm ?? true,
    },
  });

  if (freePlan) {
    await prisma.subscription.create({
      data: {
        companyId: company.id,
        planId: freePlan.id,
        status: 'TRIALING',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEnd,
        trialEndsAt: trialEnd,
      },
    });
  }

  return company;
};

const getAllCompanies = async (query, requestingUser) => {
  const { page, limit, skip } = getPaginationParams(query);
  const where = {};

  if (requestingUser.role !== 'OWNER') {
    where.id = requestingUser.companyId;
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { slug: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      include: {
        subscription: { include: { plan: { select: { name: true, displayName: true } } } },
        _count: { select: { users: true, courses: true, products: true, leads: true } },
      },
      orderBy: getSortParams(query, ['name', 'createdAt']),
      skip,
      take: limit,
    }),
    prisma.company.count({ where }),
  ]);

  return { companies, total, page, limit };
};

const getCompanyById = async (id, requestingUser) => {
  const where = { id };
  if (requestingUser.role !== 'OWNER') {
    where.id = requestingUser.companyId;
    if (id !== requestingUser.companyId) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }
  }

  const company = await prisma.company.findUnique({
    where,
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      subscription: { include: { plan: true } },
      _count: { select: { users: true, courses: true, products: true, leads: true, tickets: true } },
    },
  });

  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    throw err;
  }

  return company;
};

const getCompanyBySlug = async (slug) => {
  const company = await prisma.company.findUnique({
    where: { slug },
    select: {
      id: true, name: true, slug: true, description: true, logo: true, favicon: true,
      primaryColor: true, secondaryColor: true, accentColor: true, bgColor: true,
      fontHeading: true, fontBody: true, phone: true, email: true, website: true,
      socialLinks: true, address: true, hasLms: true, hasEcommerce: true, hasCrm: true,
      isActive: true,
    },
  });

  if (!company || !company.isActive) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    throw err;
  }

  return company;
};

const updateCompany = async (id, data, requestingUser) => {
  await getCompanyById(id, requestingUser);

  if (data.slug) {
    const existingSlug = await prisma.company.findFirst({
      where: { slug: data.slug, id: { not: id } },
    });
    if (existingSlug) {
      const err = new Error('Slug already in use');
      err.statusCode = 409;
      throw err;
    }
  }

  const updated = await prisma.company.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      phone: data.phone,
      email: data.email,
      website: data.website,
      address: data.address,
      socialLinks: data.socialLinks,
      settings: data.settings,
      isActive: data.isActive,
    },
  });

  invalidateCompanyCache(id);
  return updated;
};

const updateBranding = async (id, branding, requestingUser) => {
  await getCompanyById(id, requestingUser);

  const updated = await prisma.company.update({
    where: { id },
    data: {
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      accentColor: branding.accentColor,
      bgColor: branding.bgColor,
      fontHeading: branding.fontHeading,
      fontBody: branding.fontBody,
      logo: branding.logo,
      favicon: branding.favicon,
    },
  });

  invalidateCompanyCache(id);
  return updated;
};

const updateFeatures = async (id, features, requestingUser) => {
  if (requestingUser.role !== 'OWNER') {
    const err = new Error('Only platform owner can toggle features');
    err.statusCode = 403;
    throw err;
  }

  const updated = await prisma.company.update({
    where: { id },
    data: {
      hasLms: features.hasLms,
      hasEcommerce: features.hasEcommerce,
      hasCrm: features.hasCrm,
      hasAnalytics: features.hasAnalytics,
      hasSupport: features.hasSupport,
    },
  });

  invalidateCompanyCache(id);
  return updated;
};

const deleteCompany = async (id, requestingUser) => {
  if (requestingUser.role !== 'OWNER') {
    const err = new Error('Only platform owner can delete companies');
    err.statusCode = 403;
    throw err;
  }

  await prisma.company.update({ where: { id }, data: { isActive: false } });
  invalidateCompanyCache(id);
};

module.exports = {
  createCompany,
  getAllCompanies,
  getCompanyById,
  getCompanyBySlug,
  updateCompany,
  updateBranding,
  updateFeatures,
  deleteCompany,
};
