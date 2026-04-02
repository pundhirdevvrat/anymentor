const ROLES = {
  OWNER: 'OWNER',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  MANAGER: 'MANAGER',
  USER: 'USER',
};

const ROLE_HIERARCHY = {
  OWNER: 4,
  COMPANY_ADMIN: 3,
  MANAGER: 2,
  USER: 1,
};

const PLANS = {
  FREE: 'FREE',
  STARTER: 'STARTER',
  PRO: 'PRO',
  ENTERPRISE: 'ENTERPRISE',
};

const PLAN_LIMITS = {
  FREE: {
    maxUsers: 5,
    maxCourses: 3,
    maxProducts: 10,
    maxStorageGb: 1,
    hasCustomDomain: false,
    hasAnalytics: false,
    hasApiAccess: false,
    hasPrioritySupport: false,
  },
  STARTER: {
    maxUsers: 25,
    maxCourses: 20,
    maxProducts: 100,
    maxStorageGb: 10,
    hasCustomDomain: true,
    hasAnalytics: true,
    hasApiAccess: false,
    hasPrioritySupport: false,
  },
  PRO: {
    maxUsers: 100,
    maxCourses: -1,
    maxProducts: -1,
    maxStorageGb: 50,
    hasCustomDomain: true,
    hasAnalytics: true,
    hasApiAccess: true,
    hasPrioritySupport: true,
  },
  ENTERPRISE: {
    maxUsers: -1,
    maxCourses: -1,
    maxProducts: -1,
    maxStorageGb: -1,
    hasCustomDomain: true,
    hasAnalytics: true,
    hasApiAccess: true,
    hasPrioritySupport: true,
  },
};

const SUBSCRIPTION_STATUS = {
  ACTIVE: 'ACTIVE',
  TRIALING: 'TRIALING',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
  UNPAID: 'UNPAID',
};

const ORDER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELED: 'CANCELED',
  REFUNDED: 'REFUNDED',
};

const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
};

const LEAD_STATUS = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  PROPOSAL: 'PROPOSAL',
  NEGOTIATION: 'NEGOTIATION',
  CLOSED_WON: 'CLOSED_WON',
  CLOSED_LOST: 'CLOSED_LOST',
};

const TICKET_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_FOR_CUSTOMER: 'WAITING_FOR_CUSTOMER',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
};

const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT: 'RATE_LIMIT_EXCEEDED',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  INTERNAL_ERROR: 'INTERNAL_SERVER_ERROR',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  PLAN_LIMIT_EXCEEDED: 'PLAN_LIMIT_EXCEEDED',
};

const BRAND = {
  PRIMARY: '#1a3c6e',
  GOLD: '#d4a017',
  MAROON: '#800020',
  CREAM: '#f5f0e8',
  FONT_HEADING: 'Cormorant Garamond',
  FONT_BODY: 'Rajdhani',
};

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  PLANS,
  PLAN_LIMITS,
  SUBSCRIPTION_STATUS,
  ORDER_STATUS,
  PAYMENT_STATUS,
  LEAD_STATUS,
  TICKET_STATUS,
  HTTP_STATUS,
  ERROR_CODES,
  BRAND,
};
