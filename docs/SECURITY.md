# AnyMentor — Security Reference

## Authentication

### Password Storage
- **bcrypt** with 12 rounds (cost factor)
- Plaintext passwords are never stored, logged, or transmitted after the initial hash
- Password validation uses constant-time comparison via bcrypt.compare()
- Minimum requirements enforced via Zod: 8+ chars, uppercase, lowercase, number, special char

### JWT Tokens

| Token | Expiry | Location | Purpose |
|-------|--------|----------|---------|
| Access Token | 15 minutes | Authorization header | API authentication |
| Refresh Token | 7 days | httpOnly cookie | Issue new access tokens |

**Access Token payload:**
```json
{ "userId": "uuid", "email": "...", "role": "COMPANY_ADMIN", "companyId": "uuid", "iat": 1234, "exp": 1234 }
```

**Refresh Token security:**
- Stored as SHA-256 hash in database — raw token never stored
- Token rotation on every use: old token invalidated, new token issued
- Reuse detection: if a revoked token is presented, all user sessions are invalidated (prevents theft exploitation)
- Cookie flags: `httpOnly`, `Secure`, `SameSite=Strict`

### Password Reset
- Time-limited token (1 hour) stored as SHA-256 hash in DB
- Reset endpoint always returns HTTP 200 regardless of whether email exists (prevents email enumeration)
- Token is single-use: invalidated immediately after use

---

## Authorization

### Role Hierarchy

```
OWNER (level 4)         → Full platform access
COMPANY_ADMIN (level 3) → Full access within their company
MANAGER (level 2)       → Content + leads within their department
USER (level 1)          → Self-service: courses, purchases, tickets
```

`requireMinRole('MANAGER')` checks `ROLE_HIERARCHY[req.user.role] >= ROLE_HIERARCHY['MANAGER']`.

### Tenant Isolation

Every request to a company-scoped resource goes through:
1. `authenticate` — verifies JWT validity and user isActive
2. `resolveCompany` — loads company from URL param, caches it 5 min
3. `enforceCompanyAccess` — blocks cross-company access:

```javascript
if (user.role !== 'OWNER' && user.companyId !== company.id) {
  throw new ForbiddenError('Access denied to this company');
}
```

At the database layer, every query explicitly passes `companyId = req.company.id`. There is no reliance on a single middleware to auto-inject this — it is deliberately explicit for auditability.

---

## Input Validation

All request bodies, URL params, and query strings are validated with **Zod** schemas before reaching controller logic.

Common validations enforced:
- UUIDs validated as UUIDs (not arbitrary strings in DB queries)
- Email addresses normalized and validated
- Enum fields restricted to allowed values
- Numeric fields checked for range (e.g., price > 0, stock >= 0)
- String fields sanitized with `xss-clean` middleware (strips HTML/script tags)

---

## SQL Injection Prevention

Prisma ORM uses **parameterized queries exclusively** — no string concatenation in SQL. Raw queries are avoided. If a raw query is absolutely necessary, Prisma's tagged template `prisma.$queryRaw` is used, which also parameterizes values.

---

## Rate Limiting

| Endpoint Group | Limit | Window |
|---------------|-------|--------|
| Auth endpoints (`/auth/*`) | 5 requests | 15 minutes |
| All other API endpoints | 100 requests | 15 minutes |
| Public lead capture | 10 requests | 15 minutes |

Rate limiting uses `express-rate-limit` with an in-memory store (Redis store recommended for multi-instance deployments).

On limit exceeded: HTTP 429 with `Retry-After` header.

---

## HTTP Security Headers (Helmet.js)

All responses include:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains (HTTPS only)
```

---

## CORS

CORS is configured per-company domain. The allowed origins list is dynamically built from:
1. Frontend development URL (`http://localhost:5173`)
2. All active company domains in the database

Cross-origin requests without a valid origin are rejected.

---

## Webhook Security

### Razorpay
- HMAC-SHA256 signature verification: `razorpay_order_id + "|" + razorpay_payment_id`
- Signature compared using `crypto.timingSafeEqual()` (prevents timing attacks)

### Stripe
- Stripe webhook signature verified using `stripe.webhooks.constructEvent(rawBody, sig, secret)`
- Requires raw (unparsed) request body — webhook routes are mounted BEFORE `express.json()`

### PhonePe
- SHA-256 checksum verification: `base64(payload) + "/callback" + salt + saltIndex`

### Idempotency
- Before processing any webhook: check if `gatewayPaymentId` already exists in DB as COMPLETED
- Prevents double-processing on duplicate webhook delivery

---

## File Upload Security

- File type validated by MIME type (not just extension)
- Maximum file size enforced: images 5MB, documents 10MB, videos 500MB
- Files stored in AWS S3 (or local `/uploads` in development)
- Uploaded filenames are sanitized and replaced with UUID-based names
- Direct S3 object access is controlled via bucket policy (no public-read by default)

---

## Audit Logging

Every create/update/delete operation records:
```json
{
  "userId": "who performed the action",
  "companyId": "which tenant",
  "action": "course.updated",
  "entityType": "Course",
  "entityId": "uuid",
  "changes": { "before": {...}, "after": {...} },
  "ipAddress": "client IP",
  "userAgent": "browser/client info",
  "createdAt": "timestamp"
}
```

Audit logs are append-only and never deleted. They provide a complete trail for compliance and incident investigation.

---

## Secrets Management

**Development**: All secrets in `backend/.env` (gitignored)

**Production**: Secrets passed as environment variables to Docker containers (not baked into images)

```bash
# .env.example shows all required variables — no defaults for secrets
DATABASE_URL=         # Required
JWT_ACCESS_SECRET=    # Min 32 chars (enforced on startup)
JWT_REFRESH_SECRET=   # Min 32 chars (enforced on startup)
RAZORPAY_KEY_SECRET=  # Required for payments
STRIPE_SECRET_KEY=    # Required for international payments
```

Server startup fails fast if required secrets are missing (validated in `server.js` before binding port).

---

## Dependency Security

```bash
# Audit dependencies for known vulnerabilities
npm audit

# Auto-fix non-breaking vulnerabilities
npm audit fix
```

Dependencies are pinned to exact versions in `package-lock.json` to prevent supply chain attacks from minor/patch version changes.

---

## Production Hardening Checklist

- [ ] All env vars set (no `.env.example` defaults in use)
- [ ] `NODE_ENV=production` set
- [ ] JWT secrets are 64+ character random strings (not guessable)
- [ ] Database not exposed on public network (internal Docker network only)
- [ ] Redis not exposed on public network
- [ ] SSL/TLS enforced via Nginx + Let's Encrypt
- [ ] Rate limiting active
- [ ] CORS origin list reviewed (no wildcard `*`)
- [ ] Webhook secrets set for all active payment gateways
- [ ] S3 bucket policy reviewed (no public-read)
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] Log level set to `warn` in production (not `debug`)
- [ ] Database connection pooling configured (Prisma connection_limit)
- [ ] Automated database backups configured
