const { z } = require('zod');
const ApiResponse = require('../utils/apiResponse');

const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    req.body = parsed.body || req.body;
    req.query = parsed.query || req.query;
    req.params = parsed.params || req.params;
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const errors = err.errors.map((e) => ({
        field: e.path.slice(1).join('.'),
        message: e.message,
      }));
      return ApiResponse.badRequest(res, 'Validation failed', errors);
    }
    next(err);
  }
};

const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const errors = err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return ApiResponse.badRequest(res, 'Validation failed', errors);
    }
    next(err);
  }
};

const validateQuery = (schema) => (req, res, next) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return ApiResponse.badRequest(res, 'Invalid query parameters');
    }
    next(err);
  }
};

module.exports = { validate, validateBody, validateQuery };
