const express = require('express');
const router = express.Router({ mergeParams: true });
const service = require('./support.service');
const ApiResponse = require('../../utils/apiResponse');
const { authenticate, requireManager, requireCompanyAdmin, optionalAuth } = require('../../middleware/auth');
const { resolveCompany, enforceCompanyAccess } = require('../../middleware/tenant');

// ─── Knowledge Base (public) ──────────────────────────────────
router.get('/kb', resolveCompany, optionalAuth, async (req, res, next) => {
  try {
    const isAdmin = req.user && ['OWNER', 'COMPANY_ADMIN', 'MANAGER'].includes(req.user.role);
    const result = await service.getArticles(req.query, req.companyId, isAdmin);
    return ApiResponse.paginated(res, result.articles, result);
  } catch (err) { next(err); }
});

router.get('/kb/:slug', resolveCompany, optionalAuth, async (req, res, next) => {
  try {
    const isAdmin = req.user && ['OWNER', 'COMPANY_ADMIN', 'MANAGER'].includes(req.user.role);
    const article = await service.getArticleBySlug(req.params.slug, req.companyId, isAdmin);
    return ApiResponse.success(res, article);
  } catch (err) { next(err); }
});

router.post('/kb/:id/helpful', resolveCompany, async (req, res, next) => {
  try {
    await service.markHelpful(req.params.id, req.companyId, req.body.helpful !== false);
    return ApiResponse.success(res, null, 'Feedback recorded');
  } catch (err) { next(err); }
});

// ─── Tickets ──────────────────────────────────────────────────
router.post('/tickets', authenticate, resolveCompany, async (req, res, next) => {
  try {
    const ticket = await service.createTicket(req.body, req.user.id, req.companyId);
    return ApiResponse.created(res, ticket);
  } catch (err) { next(err); }
});

router.get('/tickets', authenticate, resolveCompany, async (req, res, next) => {
  try {
    const isAgent = ['OWNER', 'COMPANY_ADMIN', 'MANAGER'].includes(req.user.role);
    const result = await service.getTickets(req.query, req.companyId, req.user.id, isAgent);
    return ApiResponse.paginated(res, result.tickets, result);
  } catch (err) { next(err); }
});

router.get('/tickets/stats', authenticate, resolveCompany, enforceCompanyAccess, requireManager, async (req, res, next) => {
  try {
    const stats = await service.getTicketStats(req.companyId);
    return ApiResponse.success(res, stats);
  } catch (err) { next(err); }
});

router.get('/tickets/:id', authenticate, resolveCompany, async (req, res, next) => {
  try {
    const isAgent = ['OWNER', 'COMPANY_ADMIN', 'MANAGER'].includes(req.user.role);
    const ticket = await service.getTicketById(req.params.id, req.companyId, req.user.id, isAgent);
    return ApiResponse.success(res, ticket);
  } catch (err) { next(err); }
});

router.post('/tickets/:id/messages', authenticate, resolveCompany, async (req, res, next) => {
  try {
    const isAgent = ['OWNER', 'COMPANY_ADMIN', 'MANAGER'].includes(req.user.role);
    const message = await service.addMessage(req.params.id, req.companyId, req.user.id, req.body, isAgent);
    return ApiResponse.created(res, message);
  } catch (err) { next(err); }
});

router.patch('/tickets/:id', authenticate, resolveCompany, enforceCompanyAccess, requireManager, async (req, res, next) => {
  try {
    const ticket = await service.updateTicketStatus(req.params.id, req.companyId, req.body);
    return ApiResponse.success(res, ticket, 'Ticket updated');
  } catch (err) { next(err); }
});

// Admin: Knowledge Base CRUD
router.post('/kb', authenticate, resolveCompany, enforceCompanyAccess, requireManager, async (req, res, next) => {
  try {
    const article = await service.createArticle(req.body, req.companyId, req.user.id);
    return ApiResponse.created(res, article);
  } catch (err) { next(err); }
});

module.exports = router;
