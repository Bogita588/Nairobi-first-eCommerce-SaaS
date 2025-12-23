## Security Blueprint

### Identity & access
- Auth: JWT access (short TTL) + rotating refresh; per-tenant signing keys. Owner can force logout of all sessions.
- Roles: owner, staff, viewer; route guards + RBAC checks on mutations (price changes, refunds, permissions).
- MFA/OTP: optional OTP for owner login and sensitive actions (refunds, payout updates).
- Session scope: tenant derived from host or `X-Tenant-ID`; middleware sets `app.current_tenant` for RLS.

### Multi-tenancy isolation
- Postgres RLS on all business tables via `tenant_id = app.current_tenant()`.
- Before any DB call, set `SET app.current_tenant = '<tenant-uuid>'`; default denies if unset.
- Separate object storage prefixes per tenant; signed URLs scoped to tenant.

### Payments (MPesa) safety
- Idempotency keys on payment/checkout/refund endpoints; persisted in `payment_intents`.
- Webhook security: validate MPesa callback origin/signature, enforce idempotent processing, and reconcile payment status via queue.
- Store paybill/till per tenant; encrypt at rest (KMS/HashiCorp Vault); mask in logs.

### Rate limiting & abuse
- Redis-backed rate limits on auth, payment initiation, webhooks.
- IP + user/tenant scoped throttles; exponential backoff for OTP.
- Captcha on high-risk flows (login brute-force).

### Data protection
- PII fields (phone/email) encrypted at rest where supported; always TLS in transit.
- Secrets managed via environment/KMS; never checked into repo.
- Backups encrypted; restore drills tested.

### Input/output handling
- Validate all payloads with DTO schemas; reject unknown fields.
- Normalize phone numbers (E.164), emails lowercase, slugify slugs.
- Prevent overposting on nested writes (allow-lists).
- Use parameterized queries only; ORM protections + explicit allow lists for sort/filter fields.

### Web app hardening
- Security headers: HSTS, CSP with nonce, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin.
- CSRF: SameSite=Lax cookies; double-submit tokens for panel; JWT for APIs.
- Auth cookies httpOnly/secure in browser flows; short-lived access tokens.
- Disable directory listing; serve static via CDN with cache-control.

### Logging & audit
- Structured JSON logs with correlation/request ids; scrub phone/email and MPesa receipts.
- Audit trails on auth events, permission changes, price changes, refunds, payout updates.
- Separate webhook log channel to spot callback failures quickly.

### Availability & integrity
- Health checks for api/worker; circuit breakers around external APIs (MPesa, WhatsApp).
- Queue DLQ for failed webhooks/payments; alert on backlog.
- Idempotent jobs for reconciliation and sitemap generation.

### Deployment & supply chain
- Build-time `npm audit`/`yarn audit`; pin base images; use distroless/prod images in prod.
- IaC for infra; principle of least privilege for service roles (S3, queues).
- Rotate keys regularly; deny wildcard CORS; allow only store/frontends domains.
