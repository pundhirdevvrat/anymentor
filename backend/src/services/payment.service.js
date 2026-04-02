/**
 * Payment Service - Unified abstraction for all Indian + International payment gateways
 * Supports: Razorpay (UPI/Cards/Netbanking/Wallets), PhonePe, Stripe
 */

const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger');
const prisma = require('../config/database');

// ─── Razorpay ─────────────────────────────────────────────────
// Handles: UPI, Google Pay, PhonePe (via Razorpay), Credit/Debit Cards,
//          Netbanking, Paytm Wallet, Amazon Pay, BHIM UPI

let razorpayInstance = null;
const getRazorpay = () => {
  if (!razorpayInstance) {
    const Razorpay = require('razorpay');
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
};

const createRazorpayOrder = async ({ amount, currency = 'INR', receipt, notes = {} }) => {
  const rzp = getRazorpay();
  const order = await rzp.orders.create({
    amount: Math.round(amount * 100), // Razorpay uses paise
    currency,
    receipt,
    notes,
  });
  logger.info(`Razorpay order created: ${order.id}`);
  return {
    gateway: 'RAZORPAY',
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  };
};

const verifyRazorpayPayment = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  const isValid = expectedSignature === razorpay_signature;
  if (!isValid) logger.warn(`Razorpay signature mismatch for order: ${razorpay_order_id}`);
  return isValid;
};

const verifyRazorpayWebhook = (body, signature) => {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
  return expectedSignature === signature;
};

const refundRazorpayPayment = async (paymentId, amount, reason = 'requested_by_customer') => {
  const rzp = getRazorpay();
  return rzp.payments.refund(paymentId, {
    amount: Math.round(amount * 100),
    speed: 'normal',
    notes: { reason },
  });
};

// ─── PhonePe Direct ───────────────────────────────────────────
// For merchants with direct PhonePe Business account

const PHONEPE_BASE_URL =
  process.env.PHONEPE_ENV === 'production'
    ? 'https://api.phonepe.com/apis/hermes'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

const createPhonePeOrder = async ({ amount, merchantTransactionId, userId, callbackUrl, redirectUrl }) => {
  const payload = {
    merchantId: process.env.PHONEPE_MERCHANT_ID,
    merchantTransactionId,
    merchantUserId: userId,
    amount: Math.round(amount * 100), // paise
    redirectUrl,
    redirectMode: 'POST',
    callbackUrl,
    mobileNumber: '',
    paymentInstrument: { type: 'PAY_PAGE' },
  };

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const saltKey = process.env.PHONEPE_SALT_KEY;
  const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
  const checksum = `${crypto.createHash('sha256').update(`${base64Payload}/pg/v1/pay${saltKey}`).digest('hex')}###${saltIndex}`;

  const response = await axios.post(
    `${PHONEPE_BASE_URL}/pg/v1/pay`,
    { request: base64Payload },
    { headers: { 'Content-Type': 'application/json', 'X-VERIFY': checksum } }
  );

  if (!response.data?.success) {
    throw new Error(response.data?.message || 'PhonePe order creation failed');
  }

  logger.info(`PhonePe order created: ${merchantTransactionId}`);
  return {
    gateway: 'PHONEPE',
    orderId: merchantTransactionId,
    redirectUrl: response.data.data?.instrumentResponse?.redirectInfo?.url,
    amount,
  };
};

const verifyPhonePePayment = async (merchantTransactionId) => {
  const saltKey = process.env.PHONEPE_SALT_KEY;
  const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
  const path = `/pg/v1/status/${process.env.PHONEPE_MERCHANT_ID}/${merchantTransactionId}`;
  const checksum = `${crypto.createHash('sha256').update(`${path}${saltKey}`).digest('hex')}###${saltIndex}`;

  const response = await axios.get(`${PHONEPE_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
      'X-MERCHANT-ID': process.env.PHONEPE_MERCHANT_ID,
    },
  });

  return {
    success: response.data?.success && response.data?.data?.state === 'COMPLETED',
    transactionId: response.data?.data?.transactionId,
    data: response.data,
  };
};

const verifyPhonePeWebhook = (payload, checksum) => {
  const saltKey = process.env.PHONEPE_SALT_KEY;
  const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const expectedChecksum = `${crypto.createHash('sha256').update(`${base64Payload}${saltKey}`).digest('hex')}###${saltIndex}`;
  return expectedChecksum === checksum;
};

// ─── UPI Deep Link ────────────────────────────────────────────
// Direct UPI payment without gateway (for static VPA)

const generateUpiLink = ({ vpa, name, amount, transactionId, note }) => {
  const params = new URLSearchParams({
    pa: vpa,       // Payment Address (UPI ID)
    pn: name,      // Payee Name
    am: amount.toString(),
    cu: 'INR',
    tn: note || 'Payment',
    tr: transactionId,
  });
  return `upi://pay?${params.toString()}`;
};

const generateUpiQrUrl = (upiLink) => {
  // Return Google Charts QR URL for UPI link
  return `https://chart.googleapis.com/chart?chs=256x256&cht=qr&chl=${encodeURIComponent(upiLink)}`;
};

// ─── Stripe (International) ───────────────────────────────────

let stripeInstance = null;
const getStripe = () => {
  if (!stripeInstance) {
    const Stripe = require('stripe');
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
};

const createStripePaymentIntent = async ({ amount, currency = 'usd', metadata = {} }) => {
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // cents
    currency,
    metadata,
    automatic_payment_methods: { enabled: true },
  });

  logger.info(`Stripe PaymentIntent created: ${paymentIntent.id}`);
  return {
    gateway: 'STRIPE',
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount,
    currency,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  };
};

const verifyStripeWebhook = (body, signature) => {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
};

const refundStripePayment = async (paymentIntentId, amount) => {
  const stripe = getStripe();
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: Math.round(amount * 100),
  });
};

// ─── Unified Interface ────────────────────────────────────────

const createPaymentOrder = async (gateway, params) => {
  switch (gateway) {
    case 'RAZORPAY': return createRazorpayOrder(params);
    case 'PHONEPE': return createPhonePeOrder(params);
    case 'STRIPE': return createStripePaymentIntent(params);
    case 'UPI': return {
      gateway: 'UPI',
      upiLink: generateUpiLink(params),
      qrUrl: generateUpiQrUrl(generateUpiLink(params)),
    };
    default: throw new Error(`Unsupported gateway: ${gateway}`);
  }
};

const handleWebhook = async (gateway, body, signature) => {
  let event;

  switch (gateway) {
    case 'RAZORPAY': {
      if (!verifyRazorpayWebhook(body, signature)) {
        throw new Error('Invalid Razorpay webhook signature');
      }
      event = body;
      break;
    }
    case 'PHONEPE': {
      if (!verifyPhonePeWebhook(body, signature)) {
        throw new Error('Invalid PhonePe webhook signature');
      }
      event = body;
      break;
    }
    case 'STRIPE': {
      event = verifyStripeWebhook(body, signature);
      break;
    }
    default:
      throw new Error(`Unknown gateway: ${gateway}`);
  }

  return processWebhookEvent(gateway, event);
};

const processWebhookEvent = async (gateway, event) => {
  let paymentId, status, orderId, amount;

  if (gateway === 'RAZORPAY') {
    const payment = event.payload?.payment?.entity;
    if (!payment) return { processed: false };

    paymentId = payment.id;
    orderId = payment.order_id;
    amount = payment.amount / 100;
    status = event.event === 'payment.captured' ? 'PAID' :
             event.event === 'payment.failed' ? 'FAILED' : null;

  } else if (gateway === 'PHONEPE') {
    const response = event?.response;
    if (!response) return { processed: false };

    paymentId = response.transactionId || response.merchantTransactionId;
    amount = (response.amount || 0) / 100;
    status = response.code === 'PAYMENT_SUCCESS' ? 'PAID' :
             response.code === 'PAYMENT_ERROR' ? 'FAILED' : null;

  } else if (gateway === 'STRIPE') {
    const pi = event.data?.object;
    if (!pi) return { processed: false };

    paymentId = pi.id;
    amount = pi.amount / 100;
    status = event.type === 'payment_intent.succeeded' ? 'PAID' :
             event.type === 'payment_intent.payment_failed' ? 'FAILED' : null;
  }

  if (!status || !paymentId) return { processed: false };

  // Idempotency check — skip if already processed
  const existing = await prisma.payment.findFirst({
    where: { gatewayPaymentId: paymentId },
  });

  if (existing?.status === status) {
    logger.info(`Webhook already processed: ${paymentId}`);
    return { processed: false, reason: 'already_processed' };
  }

  await prisma.payment.updateMany({
    where: { gatewayPaymentId: paymentId },
    data: { status },
  });

  // Update related order if payment successful
  if (status === 'PAID' && orderId) {
    await prisma.order.updateMany({
      where: { id: orderId },
      data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
    }).catch(() => {});
  }

  logger.info(`Webhook processed: ${gateway} ${paymentId} -> ${status}`);
  return { processed: true, paymentId, status };
};

module.exports = {
  // Razorpay
  createRazorpayOrder,
  verifyRazorpayPayment,
  verifyRazorpayWebhook,
  refundRazorpayPayment,
  // PhonePe
  createPhonePeOrder,
  verifyPhonePePayment,
  verifyPhonePeWebhook,
  // UPI
  generateUpiLink,
  generateUpiQrUrl,
  // Stripe
  createStripePaymentIntent,
  verifyStripeWebhook,
  refundStripePayment,
  // Unified
  createPaymentOrder,
  handleWebhook,
};
