const express = require('express');
const router = express.Router({ mergeParams: true });
const service = require('./crm.service');
const ApiResponse = require('../../utils/apiResponse');
const { authenticate, requireManager, requireCompanyAdmin } = require('../../middleware/auth');
const { resolveCompany, enforceCompanyAccess } = require('../../middleware/tenant');
const auditLog = require('../../utils/auditLog');

router.use(authenticate, resolveCompany, enforceCompanyAccess, requireManager);

// ─── Stats ────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await service.getCrmStats(req.companyId);
    return ApiResponse.success(res, stats);
  } catch (err) { next(err); }
});

// ─── Leads ────────────────────────────────────────────────────
router.get('/leads', async (req, res, next) => {
  try {
    const result = await service.getLeads(req.query, req.companyId);
    return ApiResponse.paginated(res, result.leads, result);
  } catch (err) { next(err); }
});

router.get('/leads/pipeline', async (req, res, next) => {
  try {
    const pipeline = await service.getLeadsByPipeline(req.companyId);
    return ApiResponse.success(res, pipeline);
  } catch (err) { next(err); }
});

router.get('/leads/:id', async (req, res, next) => {
  try {
    const lead = await service.getLeadById(req.params.id, req.companyId);
    return ApiResponse.success(res, lead);
  } catch (err) { next(err); }
});

router.post('/leads', async (req, res, next) => {
  try {
    const lead = await service.createLead(req.body, req.companyId, req.user.id);
    await auditLog.log({ userId: req.user.id, companyId: req.companyId, action: 'CREATE_LEAD', resource: 'Lead', resourceId: lead.id, req });
    return ApiResponse.created(res, lead);
  } catch (err) { next(err); }
});

router.put('/leads/:id', async (req, res, next) => {
  try {
    const lead = await service.updateLead(req.params.id, req.body, req.companyId);
    return ApiResponse.success(res, lead, 'Lead updated');
  } catch (err) { next(err); }
});

router.delete('/leads/:id', async (req, res, next) => {
  try {
    await service.deleteLead(req.params.id, req.companyId);
    return ApiResponse.success(res, null, 'Lead closed');
  } catch (err) { next(err); }
});

// ─── Activities ───────────────────────────────────────────────
router.post('/leads/:id/activities', async (req, res, next) => {
  try {
    const activity = await service.addActivity(req.params.id, req.companyId, req.body, req.user.id);
    return ApiResponse.created(res, activity);
  } catch (err) { next(err); }
});

router.get('/activities', async (req, res, next) => {
  try {
    const result = await service.getActivities(req.companyId, req.query);
    return ApiResponse.paginated(res, result.activities, result);
  } catch (err) { next(err); }
});

// ─── Contacts ─────────────────────────────────────────────────
router.get('/contacts', async (req, res, next) => {
  try {
    const result = await service.getContacts(req.query, req.companyId);
    return ApiResponse.paginated(res, result.contacts, result);
  } catch (err) { next(err); }
});

router.post('/contacts', async (req, res, next) => {
  try {
    const contact = await service.createContact(req.body, req.companyId);
    return ApiResponse.created(res, contact);
  } catch (err) { next(err); }
});

// ─── Deals ────────────────────────────────────────────────────
router.get('/deals', async (req, res, next) => {
  try {
    const result = await service.getDeals(req.query, req.companyId);
    return ApiResponse.paginated(res, result.deals, result);
  } catch (err) { next(err); }
});

router.post('/deals', async (req, res, next) => {
  try {
    const deal = await service.createDeal(req.body, req.companyId);
    return ApiResponse.created(res, deal);
  } catch (err) { next(err); }
});

router.put('/deals/:id', async (req, res, next) => {
  try {
    const deal = await service.updateDeal(req.params.id, req.body, req.companyId);
    return ApiResponse.success(res, deal, 'Deal updated');
  } catch (err) { next(err); }
});

// ─── Public Lead Capture (no auth) ───────────────────────────
// This is mounted separately in app.js at /api/v1/public/leads
router.post('/public/leads', async (req, res, next) => {
  // This route is re-exported and mounted without auth
  try {
    const { companySlug, ...leadData } = req.body;
    const company = await require('../../config/database').company.findUnique({ where: { slug: companySlug } });
    if (!company || !company.isActive) return ApiResponse.notFound(res, 'Company');
    const lead = await service.createLead(leadData, company.id, null);
    return ApiResponse.created(res, { id: lead.id }, 'Thank you! We will contact you soon.');
  } catch (err) { next(err); }
});

module.exports = router;
