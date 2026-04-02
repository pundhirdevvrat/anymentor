const rateLimit = require('express-rate-limit');
const ApiResponse = require('../utils/apiResponse');

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => ApiResponse.tooManyRequests(res, message),
  });

// Global: 100 requests per 15 minutes
const globalLimiter = createLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  parseInt(process.env.RATE_LIMIT_MAX || '100'),
  'Too many requests. Please try again later.'
);

// Auth: 5 requests per 15 minutes
const authLimiter = createLimiter(
  900000,
  parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5'),
  'Too many authentication attempts. Please try again in 15 minutes.'
);

// Password reset: 3 per hour
const passwordResetLimiter = createLimiter(
  3600000,
  3,
  'Too many password reset requests. Please wait 1 hour.'
);

// File upload: 20 per minute
const uploadLimiter = createLimiter(
  60000,
  20,
  'Too many file uploads. Please wait a minute.'
);

module.exports = { globalLimiter, authLimiter, passwordResetLimiter, uploadLimiter };
