require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');
const ApiResponse = require('./utils/apiResponse');

// Route imports
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const companyRoutes = require('./modules/companies/company.routes');
const lmsRoutes = require('./modules/lms/lms.routes');
const ecommerceRoutes = require('./modules/ecommerce/ecommerce.routes');
const crmRoutes = require('./modules/crm/crm.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const { billingRouter, handleRazorpayWebhook, handlePhonePeWebhook, handleStripeWebhook } = require('./modules/billing/billing.routes');
const supportRoutes = require('./modules/support/support.routes');

const app = express();

// ─── Trust Proxy (for nginx / Heroku) ─────────────────────────
app.set('trust proxy', 1);

// ─── Security Headers ─────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Configured separately for Swagger UI
  crossOriginEmbedderPolicy: false,
}));

// ─── CORS ──────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// ─── Webhook routes need RAW body (before JSON parser) ─────────
app.post('/api/v1/webhooks/razorpay', express.raw({ type: '*/*' }), handleRazorpayWebhook);
app.post('/api/v1/webhooks/phonepe', express.raw({ type: '*/*' }), handlePhonePeWebhook);
app.post('/api/v1/webhooks/stripe', express.raw({ type: '*/*' }), handleStripeWebhook);

// ─── Body Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// ─── Request Logging ──────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip: (req) => req.path === '/api/v1/health',
}));

// ─── Request ID ───────────────────────────────────────────────
app.use((req, res, next) => {
  req.id = require('crypto').randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ─── Global Rate Limiting ─────────────────────────────────────
app.use('/api/', globalLimiter);

// ─── Static Files (uploads) ───────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

// ─── Swagger Docs ─────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpec = require('./config/swagger');
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { background-color: #1a3c6e; }',
    customSiteTitle: 'AnyMentor API Docs',
  }));
  logger.info('Swagger UI available at /api/docs');
}

// ─── API Routes ───────────────────────────────────────────────
const v1 = express.Router();

v1.get('/health', async (req, res) => {
  const prisma = require('./config/database');
  let dbStatus = 'unknown';

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  return res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: dbStatus,
    environment: process.env.NODE_ENV,
    version: '1.0.0',
  });
});

v1.use('/auth', authRoutes);
v1.use('/users', userRoutes);
v1.use('/companies', companyRoutes);
v1.use('/lms/companies/:companyId', lmsRoutes);
v1.use('/ecommerce/companies/:companyId', ecommerceRoutes);
v1.use('/crm/companies/:companyId', crmRoutes);
v1.use('/analytics', analyticsRoutes);
v1.use('/billing', billingRouter);
v1.use('/support/companies/:companyId', supportRoutes);

// Public lead capture
v1.post('/public/leads', async (req, res, next) => {
  try {
    const { companySlug, ...leadData } = req.body;
    if (!companySlug) return ApiResponse.badRequest(res, 'companySlug is required');
    const prisma = require('./config/database');
    const company = await prisma.company.findUnique({ where: { slug: companySlug } });
    if (!company || !company.isActive) return ApiResponse.notFound(res, 'Company');
    const crmService = require('./modules/crm/crm.service');
    const lead = await crmService.createLead(leadData, company.id, null);
    return ApiResponse.created(res, { id: lead.id }, 'Thank you! We will contact you soon.');
  } catch (err) { next(err); }
});

app.use('/api/v1', v1);

// ─── 404 Handler ──────────────────────────────────────────────
app.use('*', (req, res) => {
  return ApiResponse.notFound(res, `Route ${req.method} ${req.originalUrl}`);
});

// ─── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;
