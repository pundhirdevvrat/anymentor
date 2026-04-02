const { HTTP_STATUS } = require('../config/constants');

class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = HTTP_STATUS.OK, meta = null) {
    const response = { success: true, message };
    if (data !== null) response.data = data;
    if (meta) response.meta = meta;
    return res.status(statusCode).json(response);
  }

  static created(res, data, message = 'Created successfully') {
    return ApiResponse.success(res, data, message, HTTP_STATUS.CREATED);
  }

  static noContent(res) {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  static paginated(res, data, { page, limit, total }, message = 'Success') {
    const totalPages = Math.ceil(total / limit);
    return ApiResponse.success(res, data, message, HTTP_STATUS.OK, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    });
  }

  static error(res, message, statusCode = HTTP_STATUS.INTERNAL_ERROR, code = 'INTERNAL_SERVER_ERROR', errors = null) {
    const response = {
      success: false,
      error: { code, message },
    };
    if (errors) response.error.errors = errors;
    return res.status(statusCode).json(response);
  }

  static badRequest(res, message, errors = null) {
    return ApiResponse.error(res, message, HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR', errors);
  }

  static unauthorized(res, message = 'Authentication required') {
    return ApiResponse.error(res, message, HTTP_STATUS.UNAUTHORIZED, 'AUTHENTICATION_ERROR');
  }

  static forbidden(res, message = 'Access denied') {
    return ApiResponse.error(res, message, HTTP_STATUS.FORBIDDEN, 'AUTHORIZATION_ERROR');
  }

  static notFound(res, resource = 'Resource') {
    return ApiResponse.error(res, `${resource} not found`, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
  }

  static conflict(res, message) {
    return ApiResponse.error(res, message, HTTP_STATUS.CONFLICT, 'CONFLICT');
  }

  static tooManyRequests(res, message = 'Too many requests') {
    return ApiResponse.error(res, message, HTTP_STATUS.TOO_MANY_REQUESTS, 'RATE_LIMIT_EXCEEDED');
  }
}

module.exports = ApiResponse;
