const logger = require('../utils/logger');
const { HTTP_STATUS } = require('../config/constants');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_ERROR;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let errors = null;

  // Prisma errors
  if (err.code === 'P2002') {
    statusCode = HTTP_STATUS.CONFLICT;
    code = 'CONFLICT';
    const field = err.meta?.target?.[0];
    message = field ? `${field} already exists` : 'Duplicate entry';
  } else if (err.code === 'P2025') {
    statusCode = HTTP_STATUS.NOT_FOUND;
    code = 'NOT_FOUND';
    message = 'Record not found';
  } else if (err.code === 'P2003') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = 'VALIDATION_ERROR';
    message = 'Foreign key constraint failed';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    code = 'AUTHENTICATION_ERROR';
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    code = 'AUTHENTICATION_ERROR';
    message = 'Token expired';
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = 'VALIDATION_ERROR';
    message = `File too large. Max size: ${process.env.MAX_FILE_SIZE / 1024 / 1024}MB`;
  }

  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.path} - ${message}`, err);
  } else {
    logger.warn(`[${req.method}] ${req.path} - ${statusCode} - ${message}`);
  }

  const response = { success: false, error: { code, message } };
  if (errors) response.error.errors = errors;

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;
