# AnyMentor — API Reference

> **Full interactive docs**: `http://localhost:3000/api/docs` (Swagger UI)
>
> Base URL: `/api/v1`
>
> All endpoints return JSON in the format:
> ```json
> { "success": true, "data": {...}, "message": "..." }
> { "success": false, "error": "...", "code": "VALIDATION_ERROR" }
> ```

---

## Authentication

### POST /auth/register
Register a new user (defaults to USER role within a company).

**Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "companyId": "uuid"
}
```

**Response:** `201` — `{ user, accessToken }` + sets refresh cookie

---

### POST /auth/login
Login and receive tokens.

**Body:**
```json
{ "email": "jane@example.com", "password": "SecurePass123!" }
```

**Response:** `200` — `{ user, accessToken }` + sets `refreshToken` httpOnly cookie

---

### POST /auth/refresh
Rotate refresh token and get new access token.

**Requires:** `refreshToken` cookie

**Response:** `200` — `{ accessToken }` + new refresh cookie

---

### POST /auth/logout
Revoke refresh token.

**Requires:** `refreshToken` cookie

**Response:** `200` — Clears refresh cookie

---

### POST /auth/forgot-password
Request password reset email.

**Body:** `{ "email": "jane@example.com" }`

**Response:** Always `200` (prevents email enumeration)

---

### POST /auth/reset-password
Set new password using reset token.

**Body:** `{ "token": "...", "password": "NewPass123!" }`

**Response:** `200` on success

---

## Users

All user endpoints require `Authorization: Bearer <accessToken>`.

### GET /users/me
Get current user profile.

### PATCH /users/me
Update profile (name, phone, avatar).

### GET /users (COMPANY_ADMIN+)
List all users in the authenticated user's company.

**Query:** `?page=1&limit=20&role=USER&search=jane`

### POST /users (COMPANY_ADMIN+)
Create a user within the company.

### PATCH /users/:id/role (COMPANY_ADMIN+)
Change a user's role.

**Body:** `{ "role": "MANAGER" }`

### DELETE /users/:id (COMPANY_ADMIN+)
Soft-deactivate a user (`isActive = false`).

---

## Companies

### GET /companies/slug/:slug (public)
Get company branding and public info by slug.

**Response:** `{ id, name, slug, logo, primaryColor, secondaryColor, tagline }`

### GET /companies (OWNER only)
List all companies on the platform.

### POST /companies (OWNER only)
Create a new company.

**Body:**
```json
{
  "name": "Acme Academy",
  "slug": "acme-academy",
  "adminEmail": "admin@acme.com",
  "adminName": "John Admin",
  "planId": "uuid"
}
```

### GET /companies/:id (COMPANY_ADMIN+)
Get company details.

### PATCH /companies/:id (COMPANY_ADMIN+)
Update company settings or branding.

**Body (partial):**
```json
{
  "name": "Acme Academy v2",
  "primaryColor": "#1a3c6e",
  "secondaryColor": "#d4a017",
  "tagline": "Learn anything"
}
```

---

## LMS

### GET /lms/companies/:companyId/courses (public)
List published courses for a company portal.

**Query:** `?page=1&limit=12&level=BEGINNER&search=javascript`

### GET /lms/companies/:companyId/courses/:courseId (public)
Get course details + module/lesson outline (lesson content requires enrollment).

### POST /lms/companies/:companyId/courses (MANAGER+)
Create a new course.

**Body:**
```json
{
  "title": "JavaScript Fundamentals",
  "description": "...",
  "level": "BEGINNER",
  "price": 999.00,
  "isFree": false
}
```

### PATCH /lms/companies/:companyId/courses/:courseId (MANAGER+)
Update course details.

### POST /lms/companies/:companyId/courses/:courseId/modules (MANAGER+)
Add a module to a course.

### POST /lms/companies/:companyId/courses/:courseId/modules/:moduleId/lessons (MANAGER+)
Add a lesson to a module.

**Body:**
```json
{
  "title": "Variables and Types",
  "type": "VIDEO",
  "content": "https://vimeo.com/...",
  "duration": 12,
  "order": 1,
  "isFree": true
}
```

### POST /lms/companies/:companyId/courses/:courseId/enroll (USER+)
Enroll current user in a course (free courses enroll directly; paid courses initiate payment).

### GET /lms/companies/:companyId/enrollments/me (USER+)
List current user's enrollments.

### PATCH /lms/companies/:companyId/lessons/:lessonId/progress (USER+)
Update lesson watch progress.

**Body:** `{ "watchedSeconds": 300, "isCompleted": true }`

---

## E-commerce

### GET /ecommerce/:companyId/products (public)
List active products.

**Query:** `?page=1&limit=20&categoryId=uuid&search=toolkit`

### GET /ecommerce/:companyId/products/:productId (public)
Get product details.

### POST /ecommerce/:companyId/products (MANAGER+)
Create a product.

### PATCH /ecommerce/:companyId/products/:productId (MANAGER+)
Update a product.

### GET /ecommerce/:companyId/categories (public)
List product categories.

### GET /ecommerce/:companyId/cart (USER+)
Get current user's cart.

### POST /ecommerce/:companyId/cart/items (USER+)
Add item to cart.

**Body:** `{ "productId": "uuid", "quantity": 2 }`

### PATCH /ecommerce/:companyId/cart/items/:itemId (USER+)
Update item quantity.

### DELETE /ecommerce/:companyId/cart/items/:itemId (USER+)
Remove item from cart.

### POST /ecommerce/:companyId/orders (USER+)
Create order from cart. Atomically decrements stock.

**Body:**
```json
{
  "shippingAddress": {
    "name": "Jane Smith",
    "address": "123 Main St",
    "city": "Mumbai",
    "state": "MH",
    "pincode": "400001",
    "phone": "9876543210"
  },
  "gateway": "RAZORPAY"
}
```

**Response:** `{ order, paymentDetails }` — paymentDetails includes gateway-specific data for frontend checkout.

### GET /ecommerce/:companyId/orders/me (USER+)
List current user's orders.

### PATCH /ecommerce/:companyId/orders/:orderId/status (MANAGER+)
Update order fulfillment status.

---

## CRM

### GET /crm/:companyId/leads (MANAGER+)
List leads.

**Query:** `?status=NEW&assignedTo=uuid&page=1`

### POST /crm/:companyId/leads (MANAGER+)
Create a lead.

### POST /public/leads
Public lead capture form (no auth required — for embedding in company portals).

**Body:**
```json
{
  "companyId": "uuid",
  "name": "Prospect Name",
  "email": "prospect@example.com",
  "phone": "9876543210",
  "source": "website"
}
```

### PATCH /crm/:companyId/leads/:leadId (MANAGER+)
Update lead status or assignment.

### POST /crm/:companyId/leads/:leadId/activities (MANAGER+)
Log an activity on a lead.

**Body:**
```json
{
  "type": "CALL",
  "description": "Called to discuss pricing",
  "metadata": { "duration": 15 }
}
```

### GET /crm/:companyId/contacts (MANAGER+)
List contacts.

### POST /crm/:companyId/contacts (MANAGER+)
Create a contact.

### GET /crm/:companyId/deals (MANAGER+)
List deals (CRM pipeline).

### POST /crm/:companyId/deals (MANAGER+)
Create a deal.

---

## Analytics

### GET /analytics/:companyId/overview (COMPANY_ADMIN+)
Dashboard summary metrics.

**Response:**
```json
{
  "users": { "total": 150, "active": 120, "newThisMonth": 25 },
  "revenue": { "total": 45000, "thisMonth": 8500, "lastMonth": 7200 },
  "courses": { "total": 12, "enrollments": 340, "completionRate": 68 },
  "orders": { "total": 89, "pending": 5, "thisMonth": 23 },
  "leads": { "total": 67, "new": 12, "converted": 8 }
}
```

### GET /analytics/:companyId/revenue (COMPANY_ADMIN+)
Revenue chart data.

**Query:** `?period=30d` (7d, 30d, 90d, 12m)

### GET /analytics/:companyId/users (COMPANY_ADMIN+)
User growth and activity metrics.

### GET /analytics (OWNER only)
Platform-wide analytics across all companies.

---

## Billing

### GET /billing/plans (public)
List available subscription plans.

### GET /billing/:companyId/subscription (COMPANY_ADMIN+)
Get current subscription details.

### POST /billing/:companyId/subscribe (COMPANY_ADMIN+)
Subscribe to a plan.

**Body:** `{ "planId": "uuid", "gateway": "RAZORPAY" }`

### POST /billing/:companyId/create-order (COMPANY_ADMIN+)
Create payment order for checkout.

**Body:** `{ "amount": 2900, "currency": "INR", "gateway": "RAZORPAY" }`

**Response (Razorpay):**
```json
{
  "gateway": "RAZORPAY",
  "orderId": "order_xxx",
  "amount": 290000,
  "currency": "INR",
  "key": "rzp_live_xxx"
}
```

**Response (UPI):**
```json
{
  "gateway": "UPI",
  "upiLink": "upi://pay?pa=merchant@upi&pn=AnyMentor&am=2900&cu=INR&tn=Subscription",
  "qrCodeUrl": "https://chart.googleapis.com/chart?..."
}
```

---

## Webhooks

> These endpoints receive POST from payment gateways. Do not call them directly.

### POST /webhooks/razorpay
Razorpay payment confirmation webhook.

### POST /webhooks/phonepe
PhonePe payment status webhook.

### POST /webhooks/stripe
Stripe payment event webhook.

---

## Support

### GET /support/:companyId/tickets (USER+)
List tickets (users see own tickets, managers see all).

### POST /support/:companyId/tickets (USER+)
Create a support ticket.

**Body:** `{ "subject": "Course video not loading", "priority": "HIGH" }`

### POST /support/:companyId/tickets/:ticketId/messages (USER+)
Reply to a ticket.

### GET /support/:companyId/knowledge-base (public)
List published knowledge base articles.

---

## Health Check

### GET /health
Returns server health status (no auth required).

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "database": "connected",
  "version": "1.0.0"
}
```

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Request body/params failed Zod validation |
| `UNAUTHORIZED` | 401 | Missing or expired access token |
| `FORBIDDEN` | 403 | Authenticated but lacks required role/access |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Unique constraint violation (e.g., email already registered) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error (logged, never exposes stack trace) |

---

## Pagination

All list endpoints support:
- `?page=1` (1-indexed)
- `?limit=20` (max 100)

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```
