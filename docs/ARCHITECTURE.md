# AnyMentor — Architecture Overview

## System Architecture

AnyMentor uses a **monorepo** structure with a clear separation between frontend and backend, deployed via Docker on a single VPS.

```
Internet
    │
    ▼
 Nginx (port 80/443)
    │
    ├── /api/*  ─────► Backend (Node.js :3000)
    │                       │
    │                       ├── PostgreSQL 16
    │                       ├── Redis (sessions/cache)
    │                       └── External APIs (Razorpay, Stripe, PhonePe, SMTP, S3)
    │
    └── /*  ────────► Frontend (React SPA, Nginx :5173 in dev / static in prod)
```

---

## Multi-Tenancy Design

**Approach: Shared Database, Row-Level Isolation**

All companies share one PostgreSQL instance. Every tenant-scoped table has a `companyId` foreign key. A Prisma middleware layer enforces this at the ORM level.

### Why This Approach?

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| Separate DB per tenant | Perfect isolation | Complex ops, expensive | ✗ Too costly |
| Separate schema per tenant | Good isolation | Migration hell | ✗ Overcomplicated |
| Shared DB, row-level | Simple ops, cheap | Must enforce `companyId` | ✓ **Chosen** |

### Tenant Resolution Flow

```
Request: GET /api/v1/lms/companies/42/courses

1. authenticate middleware  → verifies JWT, attaches req.user
2. resolveCompany middleware → reads :companyId from URL params
                              → checks node-cache (5min TTL)
                              → queries DB if cache miss
                              → attaches req.company
3. enforceCompanyAccess     → if role !== OWNER, assert req.user.companyId === req.company.id
4. Route handler            → all queries include WHERE companyId = req.company.id
```

### Prisma Query Enforcement

Every service function explicitly passes `companyId` in all queries. There is no global middleware that auto-injects it — intentional, for clarity and auditability.

```javascript
// Example: enforced in every service
const courses = await prisma.course.findMany({
  where: { companyId: req.company.id, isActive: true }
});
```

---

## Module Structure

```
backend/src/modules/
├── auth/           Auth, JWT, refresh tokens, password reset, email verification
├── users/          User CRUD, role management, profile
├── companies/      Company CRUD, branding, slug management
├── lms/            Courses, modules, lessons, enrollments, progress tracking
├── ecommerce/      Products, categories, cart, orders, stock management
├── crm/            Leads, contacts, deals, activities, pipeline
├── analytics/      Dashboard metrics, aggregated stats per company
├── billing/        Plans, subscriptions, payment gateways, webhooks
└── support/        Tickets, ticket messages, knowledge base
```

Each module follows this file layout:
```
modules/auth/
├── auth.routes.js      → Express Router, middleware wiring, Swagger JSDoc annotations
├── auth.controller.js  → HTTP layer: parse req, call service, send response
├── auth.service.js     → Business logic, DB queries, external API calls
└── auth.validation.js  → Zod schemas for request body/params validation
```

---

## Authentication & Authorization

### Token Strategy

```
Login
  └─► POST /auth/login
        ├── Returns: accessToken (JWT, 15min, Authorization header)
        └── Sets:    refreshToken (JWT, 7d, httpOnly Secure SameSite=Strict cookie)

Every API request
  └─► Authorization: Bearer <accessToken>

Token refresh (automatic via Axios interceptor)
  └─► POST /auth/refresh
        ├── Reads cookie (refreshToken)
        ├── Validates hash against DB (rotation detection)
        ├── Issues new accessToken + new refreshToken
        └── Invalidates old refreshToken in DB
```

### Role Hierarchy

```
OWNER          → Platform-wide: all companies, billing plans, global analytics
COMPANY_ADMIN  → One company: users, branding, content, subscriptions
MANAGER        → Department: leads, content, their team's users
USER           → Student / Customer / Contact
```

Middleware: `requireMinRole('MANAGER')` uses a numeric hierarchy map to allow higher roles through.

### Refresh Token Race Condition

When multiple API calls fire simultaneously and all get 401:

```
Axios interceptor state:
  isRefreshing = false → first 401 sets it to true, calls /auth/refresh
  failedQueue = []     → subsequent 401s push { resolve, reject } into queue

On refresh success: iterate failedQueue, resolve all with new token → retry requests
On refresh failure: iterate failedQueue, reject all → redirect to /login
```

---

## Frontend Architecture

### State Management

| Store | Library | Persisted | Contents |
|-------|---------|-----------|---------|
| `authStore` | Zustand | localStorage | user object, accessToken, isAuthenticated |
| `companyStore` | Zustand | sessionStorage | company branding, slug, settings |

### Per-Company Branding

Company branding is applied at runtime via CSS custom properties:

```javascript
// companyStore.setCompany(company)
document.documentElement.style.setProperty('--color-primary', company.primaryColor);
document.documentElement.style.setProperty('--color-secondary', company.secondaryColor);
// etc.
```

Tailwind uses `var(--color-primary)` in its config, so all components automatically reflect the active company's colors.

### Routing

```
/                     → Landing page (public)
/login                → Auth login
/register             → Auth register
/c/:slug              → Company portal (loads branding from /companies/slug/:slug)
/c/:slug/courses      → Course catalog
/c/:slug/shop         → E-commerce store
/admin                → Company admin panel (COMPANY_ADMIN+)
/admin/users          → User management
/admin/courses        → LMS management
/admin/products       → E-commerce management
/admin/crm            → CRM pipeline
/admin/analytics      → Analytics dashboard
/admin/settings       → Company settings & branding
/owner                → Platform owner panel (OWNER only)
/owner/companies      → All companies
/owner/billing        → Subscription plans
/owner/analytics      → Platform-wide analytics
```

---

## Payment Architecture

```
Frontend
  └─► POST /api/v1/billing/:companyId/create-order
        ├── Razorpay: returns { orderId, amount, currency, key }
        ├── PhonePe: returns { redirectUrl } (user redirected to PhonePe page)
        ├── UPI: returns { upiLink, qrCodeUrl }
        └── Stripe: returns { clientSecret } (Stripe.js handles UI)

Payment Gateway
  └─► POST /api/v1/webhooks/:gateway  (raw body, verified signature)
        └─► Updates payment status, triggers fulfillment
```

### Webhook Idempotency

Before processing any webhook:
```javascript
const existing = await prisma.payment.findFirst({
  where: { gatewayPaymentId: paymentId }
});
if (existing?.status === 'COMPLETED') return; // Already processed
```

---

## Data Flow: Order Creation

```
1. User adds items to cart (prices captured at add time as snapshots)
2. POST /ecommerce/:id/orders
3. Prisma $transaction:
   a. For each item: SELECT product WHERE id AND stock >= quantity
   b. UPDATE product SET stock = stock - quantity
   c. INSERT order + order_items
   d. DELETE cart items
   (All atomic — failure rolls back stock decrements)
4. Return order with payment gateway details
```

---

## Caching Strategy

| Cache | Mechanism | TTL | What |
|-------|-----------|-----|------|
| Company lookup | node-cache (in-process) | 5 min | Company by slug/id |
| Company branding | node-cache | 5 min | Branding object |
| Analytics queries | Redis (optional) | 1 hour | Aggregated stats |
| Static assets | Nginx | 1 year | JS/CSS/images |

Cache invalidation on company update: `invalidateCompanyCache(companyId)` clears node-cache entries.

---

## Infrastructure

### Development (docker-compose.yml)

```
postgres:16-alpine  → :5432  (persistent volume)
redis:7-alpine      → :6379
backend             → :3000  (nodemon hot-reload, bind-mounted src/)
frontend            → :5173  (Vite HMR, bind-mounted src/)
```

### Production (docker-compose.prod.yml)

```
postgres:16-alpine  → internal network only
redis:7-alpine      → internal network only
backend             → internal network :3000
frontend            → static build served by nginx
nginx               → :80 + :443 (SSL termination, reverse proxy)
certbot             → auto-renew Let's Encrypt certificates
```

### CI/CD

```
git push → GitHub Actions

ci.yml:
  ├── backend-test: spins up postgres service, runs Jest + Supertest
  ├── frontend-build: npm ci + npm run build
  └── docker-build: builds backend + frontend images

deploy.yml (main branch only):
  └── SSH to VPS:
        ├── git pull
        ├── prisma migrate deploy
        ├── docker-compose up --build -d
        └── curl health check
```
