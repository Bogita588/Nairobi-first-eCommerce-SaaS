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
- One-page checkout UX: phone-first, area selector, delivery fee preview, cash-on-delivery or pickup (MPesa STK deferred to future).
- Payments: record pay-on-delivery/pickup intent, future MPesa STK webhook reconciliation, idempotency keys, audit log.
- Orders lifecycle + status history; receipts; refunds.

#### Checkout differentiation vs traditional ecommerce
- Single-screen, mobile-first: all inputs (cart, contact, delivery area, payment choice) on one page, reducing taps/back/forth.
- Nairobi-local payments: COD and pickup-first; no forced card/MPesa STK to avoid failed-PIN friction.
- WhatsApp handoff: one-click “Send order on WhatsApp” with structured cart summary to merchant number.
- Area-aware delivery UX: simple city-area entry with instant fee estimate to prevent surprise fees.
- Pickup-first option: clear pickup CTA with location/map link; delivery fee auto-zeroed for pickup.
- Phone-first data entry: prioritizes phone/WhatsApp contact; no account creation required.
- Real-time cart persistence: shared cart token across shop/checkout/WhatsApp handoff.

### Stage 4: Delivery, WhatsApp, SEO
- Delivery partners (Pickup Mtaani/manual), dispatch API, tracking status updates (delivery module added).
- WhatsApp templates for cart/order continuation; inbound webhook to attach threads to carts (whatsapp module stubbed, DB-backed logs).
- SEO engine: area/category landing pages, schema.org, sitemap generator + ping hook, ISR revalidation (sitemap endpoint + area list added).

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
