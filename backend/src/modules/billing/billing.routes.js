const express = require('express');
const router = express.Router();
const service = require('./billing.service');
const paymentService = require('../../services/payment.service');
const ApiResponse = require('../../utils/apiResponse');
const { authenticate, requireOwner, requireCompanyAdmin } = require('../../middleware/auth');
const auditLog = require('../../utils/auditLog');

// Public: get plans
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await service.getPlans();
    return ApiResponse.success(res, plans);
  } catch (err) { next(err); }
});

// Authenticated routes
router.use(authenticate);

router.get('/companies/:companyId/subscription', requireCompanyAdmin, async (req, res, next) => {
  try {
    const sub = await service.getSubscription(req.params.companyId);
    return ApiResponse.success(res, sub);
  } catch (err) { next(err); }
});

router.post('/companies/:companyId/subscribe', requireCompanyAdmin, async (req, res, next) => {
  try {
    const { planId, billingCycle, gateway } = req.body;
    const result = await service.createSubscription(req.params.companyId, planId, billingCycle, gateway);
    await auditLog.log({ userId: req.user.id, companyId: req.params.companyId, action: 'SUBSCRIBE', resource: 'Subscription', req });
    return ApiResponse.success(res, result, 'Subscription initiated');
  } catch (err) { next(err); }
});

router.post('/companies/:companyId/subscription/cancel', requireCompanyAdmin, async (req, res, next) => {
  try {
    const { immediately } = req.body;
    await service.cancelSubscription(req.params.companyId, immediately);
    await auditLog.log({ userId: req.user.id, companyId: req.params.companyId, action: 'CANCEL_SUBSCRIPTION', resource: 'Subscription', req });
    return ApiResponse.success(res, null, immediately ? 'Subscription canceled' : 'Subscription will cancel at period end');
  } catch (err) { next(err); }
});

router.get('/companies/:companyId/invoices', requireCompanyAdmin, async (req, res, next) => {
  try {
    const invoices = await service.getInvoices(req.params.companyId);
    return ApiResponse.success(res, invoices);
  } catch (err) { next(err); }
});

// ─── Payment Webhooks (raw body required) ────────────────────
// These are mounted in app.js BEFORE json parser with express.raw()

const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const result = await paymentService.handleWebhook('RAZORPAY', req.body, signature);
    return res.json({ received: true, ...result });
  } catch (err) {
    if (err.message.includes('signature')) return res.status(400).json({ error: 'Invalid signature' });
    next(err);
  }
};

const handlePhonePeWebhook = async (req, res, next) => {
  try {
    const checksum = req.headers['x-verify'];
    const result = await paymentService.handleWebhook('PHONEPE', req.body, checksum);
    return res.json({ received: true, ...result });
  } catch (err) {
    if (err.message.includes('signature')) return res.status(400).json({ error: 'Invalid signature' });
    next(err);
  }
};

const handleStripeWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    const result = await paymentService.handleWebhook('STRIPE', req.body, signature);
    return res.json({ received: true, ...result });
  } catch (err) {
    if (err.message.includes('signature') || err.type?.includes('Signature')) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    next(err);
  }
};

module.exports = { billingRouter: router, handleRazorpayWebhook, handlePhonePeWebhook, handleStripeWebhook };
