const express = require('express');
const router = express.Router({ mergeParams: true });
const service = require('./analytics.service');
const ApiResponse = require('../../utils/apiResponse');
const { authenticate, requireOwner, requireCompanyAdmin } = require('../../middleware/auth');
const { resolveCompany, enforceCompanyAccess } = require('../../middleware/tenant');

router.use(authenticate);

// Owner: platform-wide analytics
router.get('/owner', requireOwner, async (req, res, next) => {
  try {
    const overview = await service.getOwnerOverview();
    return ApiResponse.success(res, overview);
  } catch (err) { next(err); }
});

// Company analytics
router.get('/:companyId/overview', resolveCompany, enforceCompanyAccess, requireCompanyAdmin, async (req, res, next) => {
  try {
    const overview = await service.getOverview(req.companyId);
    return ApiResponse.success(res, overview);
  } catch (err) { next(err); }
});

router.get('/:companyId/revenue', resolveCompany, enforceCompanyAccess, requireCompanyAdmin, async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const data = await service.getRevenueChart(req.companyId, Math.min(months, 24));
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
});

router.get('/:companyId/courses', resolveCompany, enforceCompanyAccess, requireCompanyAdmin, async (req, res, next) => {
  try {
    const data = await service.getCoursePerformance(req.companyId);
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
});

router.get('/:companyId/leads', resolveCompany, enforceCompanyAccess, requireCompanyAdmin, async (req, res, next) => {
  try {
    const data = await service.getLeadConversion(req.companyId);
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
});

module.exports = router;
