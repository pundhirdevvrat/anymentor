const companyService = require('./company.service');
const ApiResponse = require('../../utils/apiResponse');
const auditLog = require('../../utils/auditLog');

const create = async (req, res, next) => {
  try {
    const company = await companyService.createCompany(req.body, req.user.id);
    await auditLog.log({ userId: req.user.id, action: 'CREATE_COMPANY', resource: 'Company', resourceId: company.id, req });
    return ApiResponse.created(res, company, 'Company created successfully');
  } catch (err) { next(err); }
};

const getAll = async (req, res, next) => {
  try {
    const { companies, total, page, limit } = await companyService.getAllCompanies(req.query, req.user);
    return ApiResponse.paginated(res, companies, { page, limit, total });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const company = await companyService.getCompanyById(req.params.id, req.user);
    return ApiResponse.success(res, company);
  } catch (err) { next(err); }
};

const getBySlug = async (req, res, next) => {
  try {
    const company = await companyService.getCompanyBySlug(req.params.slug);
    return ApiResponse.success(res, company);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const company = await companyService.updateCompany(req.params.id, req.body, req.user);
    await auditLog.log({ userId: req.user.id, companyId: req.params.id, action: 'UPDATE_COMPANY', resource: 'Company', resourceId: req.params.id, req });
    return ApiResponse.success(res, company, 'Company updated');
  } catch (err) { next(err); }
};

const updateBranding = async (req, res, next) => {
  try {
    const company = await companyService.updateBranding(req.params.id, req.body, req.user);
    return ApiResponse.success(res, company, 'Branding updated');
  } catch (err) { next(err); }
};

const updateFeatures = async (req, res, next) => {
  try {
    const company = await companyService.updateFeatures(req.params.id, req.body, req.user);
    await auditLog.log({ userId: req.user.id, action: 'UPDATE_FEATURES', resource: 'Company', resourceId: req.params.id, changes: req.body, req });
    return ApiResponse.success(res, company, 'Features updated');
  } catch (err) { next(err); }
};

const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) return ApiResponse.badRequest(res, 'No file uploaded');
    const logoPath = `/uploads/logos/${req.file.filename}`;
    const company = await companyService.updateBranding(req.params.id, { logo: logoPath }, req.user);
    return ApiResponse.success(res, { logo: logoPath }, 'Logo uploaded');
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await companyService.deleteCompany(req.params.id, req.user);
    await auditLog.log({ userId: req.user.id, action: 'DELETE_COMPANY', resource: 'Company', resourceId: req.params.id, req });
    return ApiResponse.success(res, null, 'Company deactivated');
  } catch (err) { next(err); }
};

module.exports = { create, getAll, getById, getBySlug, update, updateBranding, updateFeatures, uploadLogo, remove };
