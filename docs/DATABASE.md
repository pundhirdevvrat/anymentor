# AnyMentor — Database Schema Reference

## Technology

- **Database**: PostgreSQL 16
- **ORM**: Prisma 5 (type-safe queries, auto-migrations)
- **Schema file**: `backend/prisma/schema.prisma`

---

## Entity Relationship Overview

```
Platform
  ├── User (role: OWNER)
  └── Plan (FREE / STARTER / PROFESSIONAL / ENTERPRISE)

Company (tenant)
  ├── User[] (COMPANY_ADMIN, MANAGER, USER)
  ├── Subscription → Plan
  ├── Payment[]
  │
  ├── LMS
  │   ├── Course[]
  │   │   └── CourseModule[]
  │   │       └── Lesson[]
  │   └── Enrollment[]
  │       └── LessonProgress[]
  │
  ├── E-commerce
  │   ├── Category[]
  │   ├── Product[]
  │   ├── Cart[]
  │   │   └── CartItem[]
  │   └── Order[]
  │       └── OrderItem[]
  │
  ├── CRM
  │   ├── Lead[]
  │   ├── Contact[]
  │   ├── Deal[]
  │   └── Activity[]
  │
  └── Support
      ├── Ticket[]
      │   └── TicketMessage[]
      └── KnowledgeBase[]
```

---

## Core Tables

### User
```
id            UUID (PK)
email         VARCHAR UNIQUE
password      VARCHAR (bcrypt hash, never plaintext)
name          VARCHAR
role          Enum: OWNER | COMPANY_ADMIN | MANAGER | USER
companyId     UUID FK → Company (null for OWNER)
phone         VARCHAR
avatar        VARCHAR (URL)
isActive      BOOLEAN DEFAULT true
emailVerified BOOLEAN DEFAULT false
lastLoginAt   TIMESTAMP
createdAt     TIMESTAMP
updatedAt     TIMESTAMP

Indexes: email, companyId, role
```

### Company
```
id            UUID (PK)
name          VARCHAR
slug          VARCHAR UNIQUE (URL identifier: /c/:slug)
domain        VARCHAR (custom domain support)
logo          VARCHAR (URL)
primaryColor  VARCHAR DEFAULT '#1a3c6e'
secondaryColor VARCHAR DEFAULT '#d4a017'
accentColor   VARCHAR DEFAULT '#800020'
bgColor       VARCHAR DEFAULT '#f5f0e8'
font          VARCHAR
tagline       VARCHAR
description   TEXT
isActive      BOOLEAN DEFAULT true
createdAt     TIMESTAMP
updatedAt     TIMESTAMP

Indexes: slug, domain
```

### RefreshToken
```
id            UUID (PK)
userId        UUID FK → User (CASCADE delete)
tokenHash     VARCHAR UNIQUE (SHA-256 of actual token)
expiresAt     TIMESTAMP
createdAt     TIMESTAMP
isRevoked     BOOLEAN DEFAULT false

Indexes: userId, tokenHash
```

---

## Billing Tables

### Plan
```
id            UUID (PK)
name          Enum: FREE | STARTER | PROFESSIONAL | ENTERPRISE
displayName   VARCHAR
price         DECIMAL(10,2)
billingCycle  Enum: MONTHLY | YEARLY
maxUsers      INT
maxCourses    INT
maxProducts   INT
maxStorage    INT (MB)
features      TEXT[] (array of feature strings)
isActive      BOOLEAN DEFAULT true
```

### Subscription
```
id            UUID (PK)
companyId     UUID FK → Company (UNIQUE — one active sub per company)
planId        UUID FK → Plan
status        Enum: ACTIVE | PAST_DUE | CANCELLED | TRIALING
currentPeriodStart TIMESTAMP
currentPeriodEnd   TIMESTAMP
cancelAtPeriodEnd  BOOLEAN DEFAULT false
gatewaySubId  VARCHAR (external subscription ID)
createdAt     TIMESTAMP
updatedAt     TIMESTAMP
```

### Payment
```
id              UUID (PK)
companyId       UUID FK → Company
subscriptionId  UUID FK → Subscription (nullable)
orderId         UUID FK → Order (nullable — for ecommerce payments)
amount          DECIMAL(10,2)
currency        VARCHAR DEFAULT 'INR'
gateway         Enum: RAZORPAY | PHONEPE | STRIPE | UPI
status          Enum: PENDING | COMPLETED | FAILED | REFUNDED
gatewayOrderId  VARCHAR (gateway's order ID)
gatewayPaymentId VARCHAR UNIQUE (used for idempotency)
metadata        JSONB
createdAt       TIMESTAMP
updatedAt       TIMESTAMP

Indexes: companyId, gatewayPaymentId (UNIQUE — prevents double-processing)
```

---

## LMS Tables

### Course
```
id           UUID (PK)
companyId    UUID FK → Company
title        VARCHAR
slug         VARCHAR (unique per company)
description  TEXT
thumbnail    VARCHAR (URL)
level        Enum: BEGINNER | INTERMEDIATE | ADVANCED
price        DECIMAL(10,2)
isFree       BOOLEAN DEFAULT false
isPublished  BOOLEAN DEFAULT false
isActive     BOOLEAN DEFAULT true
instructorId UUID FK → User
totalDuration INT (minutes, computed)
totalLessons  INT (computed)
createdAt    TIMESTAMP
updatedAt    TIMESTAMP

Indexes: companyId, slug, isPublished
```

### CourseModule
```
id        UUID (PK)
courseId  UUID FK → Course (CASCADE delete)
title     VARCHAR
order     INT
createdAt TIMESTAMP
```

### Lesson
```
id          UUID (PK)
moduleId    UUID FK → CourseModule (CASCADE delete)
courseId    UUID FK → Course
title       VARCHAR
type        Enum: VIDEO | DOCUMENT | QUIZ | LIVE
content     TEXT (video URL, document URL, or quiz JSON)
duration    INT (minutes)
order       INT
isFree      BOOLEAN DEFAULT false (preview lesson)
createdAt   TIMESTAMP
updatedAt   TIMESTAMP
```

### Enrollment
```
id          UUID (PK)
userId      UUID FK → User
courseId    UUID FK → Course
companyId   UUID FK → Company
status      Enum: ACTIVE | COMPLETED | EXPIRED
enrolledAt  TIMESTAMP
completedAt TIMESTAMP
expiresAt   TIMESTAMP
paymentId   UUID FK → Payment

UNIQUE(userId, courseId)
```

### LessonProgress
```
id           UUID (PK)
enrollmentId UUID FK → Enrollment (CASCADE delete)
lessonId     UUID FK → Lesson
userId       UUID FK → User
isCompleted  BOOLEAN DEFAULT false
watchedSeconds INT DEFAULT 0
completedAt  TIMESTAMP

UNIQUE(enrollmentId, lessonId)
```

---

## E-commerce Tables

### Category
```
id          UUID (PK)
companyId   UUID FK → Company
name        VARCHAR
slug        VARCHAR
description TEXT
image       VARCHAR
isActive    BOOLEAN DEFAULT true
createdAt   TIMESTAMP
```

### Product
```
id          UUID (PK)
companyId   UUID FK → Company
categoryId  UUID FK → Category
name        VARCHAR
slug        VARCHAR
description TEXT
images      TEXT[] (array of image URLs)
price       DECIMAL(10,2)
salePrice   DECIMAL(10,2)
stock       INT DEFAULT 0
sku         VARCHAR
isActive    BOOLEAN DEFAULT true
isDigital   BOOLEAN DEFAULT false
createdAt   TIMESTAMP
updatedAt   TIMESTAMP

Indexes: companyId, slug, isActive
```

### Cart
```
id        UUID (PK)
userId    UUID FK → User
companyId UUID FK → Company

UNIQUE(userId, companyId) — one cart per user per company
```

### CartItem
```
id         UUID (PK)
cartId     UUID FK → Cart (CASCADE delete)
productId  UUID FK → Product
quantity   INT DEFAULT 1
price      DECIMAL(10,2) (snapshot at add time — not affected by price changes)

UNIQUE(cartId, productId)
```

### Order
```
id            UUID (PK)
orderNumber   VARCHAR UNIQUE (e.g., "ORD-1704067200-A3X9")
companyId     UUID FK → Company
userId        UUID FK → User
status        Enum: PENDING | CONFIRMED | PROCESSING | SHIPPED | DELIVERED | CANCELLED | REFUNDED
subtotal      DECIMAL(10,2)
tax           DECIMAL(10,2)
shipping      DECIMAL(10,2)
total         DECIMAL(10,2)
shippingAddress JSONB
notes         TEXT
createdAt     TIMESTAMP
updatedAt     TIMESTAMP

Indexes: companyId, userId, orderNumber, status
```

### OrderItem
```
id          UUID (PK)
orderId     UUID FK → Order (CASCADE delete)
productId   UUID FK → Product
quantity    INT
price       DECIMAL(10,2) (price at time of order)
total       DECIMAL(10,2)
```

---

## CRM Tables

### Lead
```
id         UUID (PK)
companyId  UUID FK → Company
name       VARCHAR
email      VARCHAR
phone      VARCHAR
source     VARCHAR (web, referral, social, etc.)
status     Enum: NEW | CONTACTED | QUALIFIED | PROPOSAL | NEGOTIATION | WON | LOST
notes      TEXT
assignedTo UUID FK → User
createdAt  TIMESTAMP
updatedAt  TIMESTAMP

Indexes: companyId, status, assignedTo
```

### Contact
```
id        UUID (PK)
companyId UUID FK → Company
name      VARCHAR
email     VARCHAR UNIQUE (per company)
phone     VARCHAR
company   VARCHAR (their company name)
title     VARCHAR
notes     TEXT
createdAt TIMESTAMP
updatedAt TIMESTAMP
```

### Deal
```
id         UUID (PK)
companyId  UUID FK → Company
contactId  UUID FK → Contact
title      VARCHAR
value      DECIMAL(10,2)
stage      VARCHAR
probability INT (0-100)
closeDate  DATE
assignedTo UUID FK → User
notes      TEXT
createdAt  TIMESTAMP
updatedAt  TIMESTAMP
```

### Activity
```
id         UUID (PK)
companyId  UUID FK → Company
userId     UUID FK → User (who performed the action)
type       Enum: NOTE | EMAIL | CALL | MEETING | TASK
entityType VARCHAR (lead, contact, deal)
entityId   UUID
description TEXT
metadata   JSONB
createdAt  TIMESTAMP
```

---

## Support Tables

### Ticket
```
id          UUID (PK)
companyId   UUID FK → Company
userId      UUID FK → User (submitter)
assignedTo  UUID FK → User (agent)
subject     VARCHAR
status      Enum: OPEN | IN_PROGRESS | WAITING | RESOLVED | CLOSED
priority    Enum: LOW | MEDIUM | HIGH | URGENT
createdAt   TIMESTAMP
updatedAt   TIMESTAMP
resolvedAt  TIMESTAMP
```

### TicketMessage
```
id        UUID (PK)
ticketId  UUID FK → Ticket (CASCADE delete)
userId    UUID FK → User
message   TEXT
isInternal BOOLEAN DEFAULT false (internal notes not visible to customer)
attachments TEXT[]
createdAt TIMESTAMP
```

### KnowledgeBase
```
id          UUID (PK)
companyId   UUID FK → Company
title       VARCHAR
content     TEXT (markdown)
category    VARCHAR
tags        TEXT[]
isPublished BOOLEAN DEFAULT false
views       INT DEFAULT 0
createdAt   TIMESTAMP
updatedAt   TIMESTAMP
```

---

## Audit Table

### AuditLog
```
id         UUID (PK)
companyId  UUID FK → Company (nullable for platform-level actions)
userId     UUID FK → User
action     VARCHAR (e.g., "course.created", "user.role_changed")
entityType VARCHAR
entityId   UUID
changes    JSONB (before/after snapshot for updates)
ipAddress  VARCHAR
userAgent  VARCHAR
createdAt  TIMESTAMP

Indexes: companyId, userId, entityType+entityId, createdAt
```

---

## Migrations

Prisma manages all schema migrations:

```bash
# Development — creates migration file + applies it
npx prisma migrate dev --name "add_feature_x"

# Production — applies pending migrations (no file creation)
npx prisma migrate deploy

# View migration history
npx prisma migrate status

# Reset DB (development only — destroys all data)
npx prisma migrate reset
```

Migration files are stored in `backend/prisma/migrations/` and committed to git.

---

## Indexes Summary

Key composite indexes for performance:

```sql
-- Tenant isolation (every tenant-scoped query)
CREATE INDEX ON course(company_id, is_published, is_active);
CREATE INDEX ON product(company_id, is_active, category_id);
CREATE INDEX ON lead(company_id, status, assigned_to);
CREATE INDEX ON order(company_id, user_id, status);
CREATE INDEX ON enrollment(user_id, course_id);  -- UNIQUE

-- Idempotency
CREATE UNIQUE INDEX ON payment(gateway_payment_id);
CREATE UNIQUE INDEX ON refresh_token(token_hash);
CREATE UNIQUE INDEX ON cart(user_id, company_id);
```

---

## Seeded Data

After running `node prisma/seed.js`:

| Entity | Data |
|--------|------|
| Plans | FREE, STARTER ($29), PROFESSIONAL ($79), ENTERPRISE ($199) |
| Platform Owner | owner@anymentor.com / SuperSecureOwnerPass123! |
| Demo Company | "Demo Academy" (slug: `demo-academy`) |
| Company Admin | admin@demoacademy.com / AdminPass123! |
| Subscription | Demo Academy on FREE plan |
| Sample Course | "Introduction to Web Development" |
| Sample Product | "Developer Toolkit Bundle" |
| Sample Lead | Jane Smith (status: NEW) |
