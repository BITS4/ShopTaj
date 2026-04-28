# ShopTaj — Full-Stack E-Commerce Platform

A production-ready e-commerce platform with web frontend, mobile app, and backend API.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS + PostgreSQL + Prisma ORM + Redis |
| Web | Next.js 14 + Tailwind CSS + shadcn/ui + Zustand |
| Mobile | React Native (Expo) |
| Payments | Stripe (Payment Intents) |
| Storage | Cloudinary |
| Email | SendGrid / Nodemailer |
| Auth | JWT + Refresh Tokens + Google OAuth |

## Quick Start

### 1. Prerequisites
- Node.js 20+
- PostgreSQL 16
- Redis 7
- Docker (optional, for DB)

### 2. Start PostgreSQL & Redis (with Docker)
```bash
docker compose up -d
```

### 3. Backend Setup
```bash
cd backend
# Edit .env with your API keys (Stripe, Cloudinary, SendGrid)
npm install
npx prisma migrate dev --name init
npm run prisma:seed            # Seeds demo users, products, coupons
npm run dev                    # Runs on http://localhost:3001
```

### 4. Web Frontend
```bash
cd web
# Edit .env.local — add your Stripe publishable key
npm install
npm run dev                    # Runs on http://localhost:3000
```

### 5. Mobile App
```bash
cd mobile
npm install
npm start                      # Scan QR code with Expo Go
```

## Demo Credentials (after seed)

| Role  | Email                 | Password   |
|-------|-----------------------|------------|
| Admin | admin@shoptaj.com     | Admin123!  |
| User  | user@shoptaj.com      | User1234!  |

## Demo Coupons
- `WELCOME10` — 10% off orders over $20
- `SAVE20` — $20 off orders over $100

## Stripe Test Card
`4242 4242 4242 4242` · Any future expiry · Any CVV

## API Docs (Swagger)
http://localhost:3001/api/docs

## Project Structure
```
ShopTaj/
├── backend/           # NestJS REST API
│   ├── src/
│   │   ├── auth/      # JWT, refresh tokens, Google OAuth
│   │   ├── users/     # Profile, addresses
│   │   ├── products/  # Catalog, search, variants, images
│   │   ├── categories/
│   │   ├── cart/      # Cart management + coupon application
│   │   ├── orders/    # Order lifecycle
│   │   ├── payments/  # Stripe Payment Intents + webhooks
│   │   ├── reviews/   # Purchase-gated product reviews
│   │   ├── wishlist/
│   │   └── admin/     # Dashboard, analytics, CRUD
│   └── prisma/        # Schema (15 models) + seed
├── web/               # Next.js 14 (App Router)
│   └── src/app/
│       ├── (auth)/    # login, register, forgot/reset password
│       ├── products/  # listing with filters + product detail
│       ├── cart/
│       ├── checkout/  # Stripe Elements payment flow
│       ├── profile/   # orders, wishlist, addresses
│       └── admin/     # dashboard, products, orders, users, coupons
└── mobile/            # React Native (Expo Router)
    └── app/
        ├── (tabs)/    # home, search, cart, profile tabs
        ├── (auth)/    # login, register screens
        └── product/   # product detail screen
```

## Security
- Rate limiting: 100 req/15min global, 10 req/15min on auth routes
- Helmet.js HTTP security headers
- CORS restricted to frontend origin only
- JWT access tokens (15min) + httpOnly refresh token cookies
- Bcrypt password hashing (salt rounds: 12)
- Prisma parameterized queries (SQL injection safe)
- Role-based access control (USER / ADMIN)
- Stripe PCI-compliant payment handling (card data never touches server)
- File upload MIME validation + 5MB size limit + Cloudinary storage
