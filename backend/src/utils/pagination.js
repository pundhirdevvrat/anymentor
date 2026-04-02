const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const getSortParams = (query, allowedFields = [], defaultField = 'createdAt', defaultOrder = 'desc') => {
  const sortField = allowedFields.includes(query.sortBy) ? query.sortBy : defaultField;
  const sortOrder = ['asc', 'desc'].includes(query.sortOrder) ? query.sortOrder : defaultOrder;
  return { [sortField]: sortOrder };
};

module.exports = { getPaginationParams, getSortParams };
