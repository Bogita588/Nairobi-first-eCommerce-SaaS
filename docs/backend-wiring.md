## Backend Wiring Checklist (Nest/Node)

### Tenancy middleware
- Derive tenant from host (e.g., `{store}.domain`) or `X-Tenant-ID` header for admin/API.
- In a Nest interceptor/middleware, before hitting services: `await dataSource.query("SET app.current_tenant = $1", [tenantId])`.
- On response end, clear setting if connection pooling might reuse sessions.
- Reject requests without resolvable tenant; log host/header.

### Idempotency & concurrency
- Require `Idempotency-Key` on `/payments/*`, `/checkout`, WhatsApp send. Persist in `payment_intents` and return 409 if key reused with different payload.
- Use Postgres advisory locks or row-level locks on inventory during checkout to avoid oversell.
- Queue MPesa webhooks and WhatsApp sends via BullMQ; process idempotently.

### Rate limiting
- Redis-backed limiter with sliding window; defaults:
  - Auth/login/OTP: 5/min per IP + per phone/email.
  - Payments initiation: 10/min per cart/tenant.
  - Webhooks: 60/min per provider IP.
- Return 429 with `Retry-After`.

### Validation & serialization
- Global validation pipe with whitelist + forbidNonWhitelisted; transform primitives; sanitize strings.
- DTOs with class-validator; enums for statuses; phone normalization to E.164; slugify inputs.
- Problem+json error filter with codes (e.g., `validation_error`, `rate_limited`, `tenant_not_found`).

### Security headers & CORS
- Helmet with CSP nonce; HSTS; frame busting; referrer-policy strict-origin-when-cross-origin.
- CORS allowlist: storefront domains + panel domain; block `*`.
- CSRF: double-submit token for panel if using cookies; JWT for APIs.

### Logging & metrics
- Interceptor adds `x-request-id`; log JSON with tenant_id, user_id, path, status, latency.
- Mask phone/email/MPesa receipts in logs.
- Prometheus metrics endpoint: request counts, latency, queue depth, MPesa success rate.

### Observability & alerts
- OpenTelemetry tracing for HTTP + queue jobs; propagate request id into jobs.
- Alerts: MPesa success rate drop, payment webhook failure spike, queue backlog, latency SLO breach.

### Dev/prod parity
- Env structure: `.env.example` with required vars (DB, Redis, MPesa keys, WhatsApp creds, CDN host).
- Use same images for api/worker; entrypoint decides command.
- Migrations run before app start; fail fast on pending migrations.
