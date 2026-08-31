# ShopTaj

[![CI](https://github.com/BITS4/ShopTaj/actions/workflows/ci.yml/badge.svg)](https://github.com/BITS4/ShopTaj/actions/workflows/ci.yml)

ShopTaj is a full-stack e-commerce monorepo with a NestJS REST API, a Next.js
storefront and admin application, and an Expo mobile client. It includes product
discovery, multilingual catalog content, carts, checkout, order tracking,
reviews, wishlists, seller workflows, and role-based administration.

## Applications

| Application | Stack | Local URL |
| --- | --- | --- |
| `backend/` | NestJS, Prisma, PostgreSQL | `http://localhost:3001` |
| `web/` | Next.js, React, Tailwind CSS, Zustand | `http://localhost:3000` |
| `mobile/` | Expo Router, React Native | Expo development server |

Optional integrations include Stripe and bePaid payments, Cloudinary storage,
Gmail or Resend email, Google OAuth, and WhatsApp Business notifications. The
unit tests replace these integrations with local mocks and make no external
network calls.

## Fresh-clone quick start

### Prerequisites

- Node.js 20.9 or newer (the Node 20 line is recorded in `.nvmrc`)
- npm 10 or later
- Docker with Compose v2 for local PostgreSQL and Redis

### 1. Install locked dependencies

```bash
git clone https://github.com/BITS4/ShopTaj.git
cd ShopTaj
nvm use
npm ci
```

The root manifest declares `backend`, `web`, and `mobile` as npm workspaces, so
one `npm ci` installs the exact dependency graph in `package-lock.json`.
Package-local lockfiles are also committed for tooling that operates on one app.

### 2. Configure local environment files

The root `.env.example` is the canonical catalog for all supported variables.
Both frameworks ignore variables that do not belong to them.

```bash
cp .env.example backend/.env
cp .env.example web/.env.local
```

PowerShell equivalents:

```powershell
Copy-Item .env.example backend/.env
Copy-Item .env.example web/.env.local
```

The placeholder JWT and Stripe values are sufficient to boot the application,
but real test-mode Stripe keys are required to exercise payment flows manually.
Email, Cloudinary, OAuth, WhatsApp, and bePaid may remain blank for core local
development.

### 3. Start infrastructure and initialize the database

```bash
docker compose up -d postgres redis
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

The seed creates demo catalog data plus these local accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@shoptaj.com` | `Admin123!` |
| User | `user@shoptaj.com` | `User1234!` |

Demo coupons are `WELCOME10` (10% off orders over $20) and `SAVE20` ($20 off
orders over $100). Stripe's standard test card is `4242 4242 4242 4242` with
any future expiry and any CVC.

### 4. Run the applications

Use separate terminals from the repository root:

```bash
npm run dev:backend
npm run dev:web
npm run dev:mobile
```

Swagger documentation is available at `http://localhost:3001/api/docs` after
the API starts. Readiness and Prometheus-compatible metrics are exposed at
`/api/health` and `/api/metrics`. A physical mobile device must be able to reach
the computer running the API; set `EXPO_PUBLIC_DEV_HOST` to the computer's LAN
address when automatic Metro host detection is not sufficient.

## Environment reference

Every value below is present in `.env.example` with a safe placeholder.

| Area | Variables | Required for |
| --- | --- | --- |
| Core | `DATABASE_URL`, `PORT`, `NODE_ENV`, `LOG_LEVEL`, `FRONTEND_URL`, `BACKEND_URL`, `CORS_ORIGINS` | API and database |
| Auth | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, expiry settings | Login and tokens |
| Web | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DOMAIN`, `NEXT_PUBLIC_STRIPE_PK`, `VERCEL_URL` | Browser API/payment configuration and hosted origins |
| Mobile | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_DEV_HOST` | Expo builds and physical-device development |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe checkout/webhooks |
| Storage | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Hosted uploads; blank uses local uploads |
| Email | Gmail or Resend variables | Delivery; blank logs local verification codes |
| Optional | Google OAuth, WhatsApp, bePaid, `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE` | Corresponding integration |
| Tests | `TEST_MODE` | Optional deterministic provider adapters |

Never commit populated `.env` files. See [SECURITY.md](SECURITY.md) for private
vulnerability reporting and credential-handling guidance.

## Quality commands

All commands run from the repository root and fail on errors:

```bash
npm run lint          # backend + web + mobile lint rules
npm run typecheck     # TypeScript checks for all three apps
npm test              # isolated unit/component suites for all three apps
npm run test:coverage # backend and web coverage reports
npm run build         # production backend and web builds
npm run audit         # production dependency audit baseline
npm run verify        # lint + typecheck + test + build
```

Tests do not require Docker, a database, or live provider credentials. For
integration or end-to-end work that needs disposable services, start the
separate test stack:

```bash
docker compose -f docker-compose.test.yml up -d --wait
# PostgreSQL: localhost:5433; Redis: localhost:6380
docker compose -f docker-compose.test.yml down --volumes
```

## Continuous integration and dependency maintenance

`.github/workflows/ci.yml` runs independent lint, typecheck, test, build, and
dependency-audit jobs on every push and pull request. CI uses `npm ci`, generates
the Prisma client, enforces backend/web coverage thresholds, and supplies
non-secret build placeholders; no third-party accounts are needed.

The audit job compares production high/critical advisories with an explicit
checked-in baseline and fails if the count increases. Existing debt can only
stay level or decrease. Dependabot checks the root, backend, web, mobile, and
GitHub Actions dependency graphs every week.

## Containers

`docker-compose.yml` starts persistent local PostgreSQL and Redis services. The
root `Dockerfile` builds a non-root, production API image from the workspace
lockfile:

```bash
docker build -t shoptaj-api .
```

Run Prisma migrations as a deployment step, then start the image with a
network-reachable `DATABASE_URL` and the backend environment values. The image
exposes port `3001` and includes an API health check.

## Repository layout

```text
ShopTaj/
├── backend/
│   ├── prisma/             # schema, migrations, and deterministic seed
│   └── src/                # auth, catalog, cart, orders, payments, admin
├── web/
│   └── src/                # App Router pages, UI components, hooks, stores
├── mobile/
│   ├── app/                # Expo Router screens
│   ├── lib/                # API and URL helpers
│   └── store/              # client state
├── .github/                # CI, Dependabot, and pull-request guidance
├── docker-compose.yml      # local development infrastructure
└── docker-compose.test.yml # ephemeral integration-test infrastructure
```

See [ADMIN_GUIDE.md](ADMIN_GUIDE.md) and
[BACKEND_ADMIN_GUIDE.md](BACKEND_ADMIN_GUIDE.md) for the administration flows,
[CONTRIBUTING.md](CONTRIBUTING.md) for change discipline, and
[CHANGELOG.md](CHANGELOG.md) for notable changes.

## License

ShopTaj is available under the [MIT License](LICENSE).
