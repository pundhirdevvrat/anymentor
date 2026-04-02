const { verifyAccessToken } = require('../utils/jwtHelper');
const ApiResponse = require('../utils/apiResponse');
const prisma = require('../config/database');
const { ROLE_HIERARCHY } = require('../config/constants');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        firstName: true,
        lastName: true,
        isActive: true,
        emailVerified: true,
      },
    });

    if (!user) return ApiResponse.unauthorized(res, 'User not found');
    if (!user.isActive) return ApiResponse.forbidden(res, 'Account is inactive');
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email address to continue',
        },
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return ApiResponse.unauthorized(res, 'Invalid or expired token');
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return ApiResponse.unauthorized(res);
    if (!roles.includes(req.user.role)) {
      return ApiResponse.forbidden(res, `Requires role: ${roles.join(' or ')}`);
    }
    next();
  };
};

const requireMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) return ApiResponse.unauthorized(res);
    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
    if (userLevel < requiredLevel) {
      return ApiResponse.forbidden(res, 'Insufficient permissions');
    }
    next();
  };
};

const requireOwner = requireRole('OWNER');
const requireCompanyAdmin = requireMinRole('COMPANY_ADMIN');
const requireManager = requireMinRole('MANAGER');

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true, companyId: true, isActive: true },
      });
      if (user && user.isActive) req.user = user;
    }
  } catch {
    // silently ignore auth errors for optional auth
  }
  next();
};

module.exports = {
  authenticate,
  requireRole,
  requireMinRole,
  requireOwner,
  requireCompanyAdmin,
  requireManager,
  optionalAuth,
};
