const prisma = require('../config/database');
const logger = require('./logger');

const log = async ({ companyId, userId, action, resource, resourceId, changes, req }) => {
  try {
    await prisma.auditLog.create({
      data: {
        companyId: companyId || null,
        userId: userId || null,
        action,
        resource,
        resourceId: resourceId ? String(resourceId) : null,
        changes: changes || null,
        ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || null,
        userAgent: req?.headers?.['user-agent'] || null,
      },
    });
  } catch (err) {
    logger.error('Audit log failed:', err.message);
  }
};

module.exports = { log };
