# AnyMentor — Multi-Tenant SaaS Platform

**Enterprise-grade platform for hosting multiple branded company portals under one unified admin system.**

Each company gets: LMS, E-commerce store, CRM pipeline, Analytics dashboard — all with their own branding and full data isolation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20 + Express.js |
| ORM | Prisma + PostgreSQL 16 |
| Frontend | React 18 + Vite + TailwindCSS |
| Auth | JWT (15min) + Refresh Tokens (7d, httpOnly cookie) |
| Payments | Razorpay (UPI/Cards/Netbanking), PhonePe Direct, UPI Deep Link, Stripe |
| Container | Docker + Docker Compose |
| CI/CD | GitHub Actions |

---

## Quick Start — Single Command Setup

```bash
git clone https://github.com/pundhirdevvrat/anymentor.git
cd anymentor
node setup.js
```

**Browser automatically opens at `http://localhost:3099`** — fill the form, click Start Setup. Done.

No terminal configuration needed. The wizard:
- Asks all credentials via browser form
- Auto-generates JWT secrets
- Writes `backend/.env`
- Starts Docker containers
- Runs DB migrations
- Seeds initial data

---

## Manual Setup (Docker)
# Edit backend/.env — add DATABASE_URL, JWT secrets, SMTP, payment keys

# 2. Start all services (PostgreSQL + Redis + Backend + Frontend)
docker-compose up -d

# 3. Run database migrations and seed demo data
docker-compose exec backend npx prisma migrate dev
docker-compose exec backend node prisma/seed.js

# 4. Open browser
# Frontend:    http://localhost:5173
# API Docs:    http://localhost:3000/api/docs
# Health:      http://localhost:3000/api/v1/health
```

---

## Quick Start (Local Development)

```bash
# Requirements: Node.js 20+, PostgreSQL 16 running locally

# Backend
cd backend
npm install
cp .env.example .env          # Edit DATABASE_URL and JWT secrets (minimum)
npx prisma migrate dev        # Creates all tables
node prisma/seed.js           # Seeds demo data
npm run dev                   # API at http://localhost:3000

# Frontend (new terminal)
cd frontend
npm install
npm run dev                   # UI at http://localhost:5173
```

---

## Default Login Credentials (after seed)

| Role | Email | Password |
|------|-------|----------|
| Platform Owner | owner@anymentor.com | SuperSecureOwnerPass123! |
| Company Admin  | admin@demoacademy.com | AdminPass123! |

> Live demo portal: http://localhost:5173/c/demo-academy

---

## Project Structure

```
anymentor/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       ← All DB models
│   │   └── seed.js             ← Demo data seeder
│   ├── src/
│   │   ├── config/             ← database, email, swagger, constants
│   │   ├── middleware/         ← auth JWT, tenant isolation, rate-limit, validation
│   │   ├── modules/            ← auth · users · companies · lms · ecommerce
│   │   │                         crm · analytics · billing · support
│   │   ├── services/           ← email · payment (Razorpay/PhonePe/Stripe/UPI) · storage
│   │   └── utils/              ← logger · apiResponse · jwtHelper · pagination
│   ├── server.js
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/              ← Landing · auth · dashboard · admin panel · portals
│   │   ├── components/         ← Navbar · Sidebar · UI library + ParticleBackground
│   │   ├── store/              ← Zustand (auth, company branding)
│   │   └── services/api.js     ← All API calls (authApi, lmsApi, shopApi, crmApi...)
│   └── vite.config.js
├── docker-compose.yml           ← Development
├── docker-compose.prod.yml      ← Production (Nginx + SSL)
├── nginx.conf
└── .github/workflows/           ← ci.yml (tests) + deploy.yml (VPS SSH)
```

---

## Role Hierarchy

```
Platform Owner  → All companies, billing plans, platform-wide analytics
  Company Admin → One company: users, branding, content, analytics, billing
    Manager     → Content + leads for their department
      User      → Student / Customer / Contact
```

---

## Payment Gateways

| Gateway | Methods |
|---------|---------|
| **Razorpay** | UPI, Google Pay, PhonePe, Paytm, Cards, Netbanking, Wallets, EMI |
| **PhonePe Direct** | PhonePe Business merchant account |
| **UPI Deep Link** | Direct `upi://` link + auto-generated QR code |
| **Stripe** | International credit/debit cards (USD, EUR) |

Webhook endpoints: `/api/v1/webhooks/razorpay` · `/api/v1/webhooks/phonepe` · `/api/v1/webhooks/stripe`

---

## Brand Design System

| Name | Hex | Use |
|------|-----|-----|
| Navy | `#1a3c6e` | Primary backgrounds, headings, navbar |
| Gold | `#d4a017` | CTAs, buttons, highlights, accents |
| Maroon | `#800020` | Danger, gradients, secondary accents |
| Cream | `#f5f0e8` | Page backgrounds, card backgrounds |

Fonts: **Cormorant Garamond** (headings) + **Rajdhani** (body)
> ⚠️ NO dark blue or black colors used anywhere in the UI.

---

## API Documentation

Swagger UI available at: `http://localhost:3000/api/docs`

Base: `/api/v1` · Key endpoints:

```
POST /auth/register          Register user
POST /auth/login             Login → access token + refresh cookie
POST /auth/refresh           Rotate refresh token
GET  /companies/slug/:slug   Company branding (public)
GET  /lms/companies/:id/     Course catalog
POST /ecommerce/:id/orders   Create order
GET  /analytics/:id/overview Dashboard metrics
POST /crm/:id/leads          Create lead
POST /public/leads           Public lead capture form
```

---

## Security

- **bcrypt** (12 rounds) password hashing — never stored plaintext
- **JWT rotation**: access (15min) + refresh (7d) with token reuse detection
- **Rate limiting**: 5 req/15min on auth · 100 req/15min globally
- **Prisma ORM**: parameterized queries — SQL injection impossible by design
- **Zod** validation on every request body
- **Tenant isolation**: `companyId` enforced on every database query
- **Audit trail**: every create/update/delete logged with user + IP
- **Helmet.js** security headers · **CORS** per company domain

---

## Production Deployment (VPS + Docker)

```bash
# 1. On your VPS (Ubuntu 22.04):
sudo apt update && sudo apt install docker.io docker-compose-plugin git -y

# 2. Clone and configure
git clone https://github.com/pundhirdevvrat/anymentor.git /opt/anymentor
cd /opt/anymentor
cp backend/.env.example backend/.env.prod  # Fill all production values

# 3. Start production stack
docker-compose -f docker-compose.prod.yml up -d --build

# 4. SSL Certificate (replace yourdomain.com)
docker-compose -f docker-compose.prod.yml run certbot certonly \
  --webroot -w /var/www/certbot -d yourdomain.com

# 5. Reload nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

GitHub Actions auto-deploys on push to `main` (configure VPS secrets).

---

## Contributing

1. Fork the project
2. Create feature branch: `git checkout -b feature/YourFeature`
3. Commit: `git commit -m 'Add YourFeature'`
4. Push: `git push origin feature/YourFeature`
5. Open a Pull Request

---

## License

GNU GPL v3 — See [LICENSE](LICENSE)
