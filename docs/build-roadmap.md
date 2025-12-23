## Build Stages (dev → production)

### Stage 0: Foundations
- Repo scaffolding: `apps/web` (Next.js), `apps/api` (Nest), `packages` for shared types, `migrations`.
- Tooling: ESLint/Prettier, Husky/lint-staged, commitlint, jest/vitest; `.env.example`.
- Docker up: `docker-compose up --build`; confirm Postgres + Redis + web/api health.
- Migrations: run 0001 init; verify RLS by setting `app.current_tenant`.

### Stage 1: Auth, tenancy, and DX
- Implement middleware to derive tenant from domain/header and `SET app.current_tenant`.
- Auth module: JWT access/refresh, roles (owner/staff/viewer), OTP for owner; RBAC guards.
- Global DTO validation + class-transformer sanitization; global error filter with problem+json.
- Rate limiting middleware (Redis) for auth/payment/webhook endpoints.

### Stage 2: Catalog & media
- Catalog CRUD (categories/products/variants/images) with search (tsvector/trigram).
- Image upload flow with signed URLs to S3-compatible storage + CDN.
- Inventory adjustments with reasons; low-stock alerts.
- Frontend: merchant catalog manager + storefront product listing/detail (SSR/ISR).

### Stage 3: Cart, checkout, payments
- Cart API (guest token), delivery quote calculator (Nairobi areas + rules), promo engine.
- One-page checkout UX: phone-first, area selector, delivery fee preview, MPesa STK trigger, WhatsApp CTA.
- Payments: MPesa STK initiation + webhook reconciliation, idempotency keys, audit log.
- Orders lifecycle + status history; receipts; refunds.

### Stage 4: Delivery, WhatsApp, SEO
- Delivery partners (Pickup Mtaani/manual), dispatch API, tracking status updates.
- WhatsApp templates for cart/order continuation; inbound webhook to attach threads to carts.
- SEO engine: area/category landing pages, schema.org, sitemap generator + ping hook, ISR revalidation.

### Stage 5: Analytics & insights
- Event collector endpoint; frontend emits product views, add-to-cart, checkout steps, payment results.
- Aggregations to `product_insights`, funnels, and `insight_cards`; nightly jobs via worker.
- Owner dashboard with insight cards first, then charts (revenue, orders, AOV, conversion funnel).

### Stage 6: Hardening & production
- Observability: JSON logs, request ids, Prometheus metrics, OpenTelemetry traces.
- Security headers/CSP, CSRF for panel, CORS whitelist, webhook signature checks.
- Load/soak test critical paths (checkout/payment/webhooks).
- CI/CD: tests + lint + migrations + build; blue/green deploy; backups + restore drill.

### Stage 7: Launch & growth
- PageSpeed tuning (image sizes, font strategy, caching); monitor >90 mobile.
- SEO tuning for Nairobi estates; add content playbook.
- Merchant onboarding wizard (<30 min), in-app guides, SLA for support.
