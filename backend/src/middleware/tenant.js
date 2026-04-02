const prisma = require('../config/database');
const ApiResponse = require('../utils/apiResponse');
const NodeCache = require('node-cache');

const companyCache = new NodeCache({ stdTTL: 300 }); // 5 minute cache

// Resolves company from: URL param :companyId, req.user.companyId, or slug in subdomain/path
const resolveCompany = async (req, res, next) => {
  try {
    const companyId = req.params.companyId || req.params.cid;

    if (companyId) {
      let company = companyCache.get(companyId);

      if (!company) {
        company = await prisma.company.findUnique({
          where: { id: companyId },
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            hasLms: true,
            hasEcommerce: true,
            hasCrm: true,
            hasAnalytics: true,
            hasSupport: true,
          },
        });
        if (company) companyCache.set(companyId, company);
      }

      if (!company || !company.isActive) {
        return ApiResponse.notFound(res, 'Company');
      }

      req.company = company;
      req.companyId = company.id;
    } else if (req.user?.companyId) {
      req.companyId = req.user.companyId;
    }

    next();
  } catch (err) {
    next(err);
  }
};

// Enforce that authenticated user belongs to the resolved company (non-owners only)
const enforceCompanyAccess = (req, res, next) => {
  if (!req.user) return ApiResponse.unauthorized(res);
  if (req.user.role === 'OWNER') return next();

  if (req.companyId && req.user.companyId !== req.companyId) {
    return ApiResponse.forbidden(res, 'Access to this company is not allowed');
  }

  next();
};

const invalidateCompanyCache = (companyId) => {
  companyCache.del(companyId);
};

module.exports = { resolveCompany, enforceCompanyAccess, invalidateCompanyCache };
