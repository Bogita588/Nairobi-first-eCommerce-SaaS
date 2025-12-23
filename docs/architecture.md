## Nairobi-first eCommerce SaaS – Architecture

### Goals
- Mobile-first, sub-2s TTI, 90+ PageSpeed for Nairobi traffic.
- Trust-by-default checkout with MPesa-first payments and WhatsApp fallback.
- Analytics-first owner dashboard (electronics/fashion/watch/home categories).
- Multi-tenant, containerized stack using Next.js, Node (Nest), Postgres, Redis.

### High-level topology
- **Edge/CDN**: Cloudflare (static assets, image optimization, WAF, caching ISR pages).
- **Web**: Next.js (SSR/ISR + API routes for edge-safe operations). Renders store fronts, landing pages, area SEO pages, and owner dashboard UI.
- **API**: Node/Nest service exposing REST/GraphQL. Modules: auth, catalog, cart/checkout, payments, orders, delivery, analytics, messaging.
- **Worker**: BullMQ workers (Redis) for MPesa callbacks reconciliation, WhatsApp sends, email/SMS, SEO jobs (sitemaps), insight generation, ETL/aggregation.
- **DB**: Postgres (shared schema, tenant_id per row). Timescale/partitioning on events and orders for retention + fast analytics. pgTrgm/tsvector for search.
- **Cache/Coordination**: Redis for sessions (if not JWT), rate limits, idempotency keys, queues, short-lived price/delivery quotes.
- **Object storage**: S3-compatible for product media; served via CDN.
- **3P Integrations**: MPesa Daraja (STK push + callbacks), WhatsApp Business, delivery partners (Pickup Mtaani et al.), maps/geocoding for Nairobi areas.

### Intuitive UI foundations
- One-page checkout with phone-first input, MPesa STK inline trigger, inline delivery fee preview by Nairobi area, WhatsApp fallback CTA.
- Clear trust markers: paybill/till shown, secure badge, delivery ETA, return policy.
- Owner dashboard: “insight cards” first, then charts. Defaults to day/week views with plain-language copy. Contextual nudges (e.g., “lower Westlands fee by 50 KES to lift conversion”).
- Catalog UX: fast filters, prominent “Add to cart”, image zoom/gallery, related items; variant chips (size/color/model).
- Progressive disclosure: advanced settings hidden until needed; wizard for store creation (<30 minutes).

### Key request flows
- **Browse → Product → Add to cart**: Next.js fetches catalog via API; cache warmed on ISR. Add-to-cart hits API; cart stored server-side (Redis) with signed cart token for guests.
- **Checkout**: API computes delivery fee (area pricing table + rules), applies coupons, and triggers MPesa STK. Checkout state persisted (idempotency key) to avoid double-charges.
- **MPesa callbacks**: Daraja → public webhook (API) → verify signature → enqueue reconciliation job → mark payment/ order paid → emit events → notify WhatsApp.
- **WhatsApp order continuation**: Cart shared via deep link; customer picks up flow; API merges cart by cart token + phone.
- **Analytics**: Frontend sends events to lightweight collector endpoint; events go to Postgres `events` (partitioned) + Redis stream; nightly jobs aggregate insights surfaced on dashboard.

### Backend modules (Nest examples)
- `auth`: JWT (per-tenant secrets), phone/email login, admin RBAC. Optional OTP for owners.
- `catalog`: products, variants, inventory movements, pricing rules, search (tsvector + trigram).
- `checkout`: cart service, delivery fee calculator (zone rules), promotions, taxes.
- `payments`: MPesa STK initiation, callbacks, idempotency, refunds/voids, audit log.
- `orders`: order lifecycle, order timeline, WhatsApp vs web attribution, invoices.
- `delivery`: partner integrations, manual dispatch, ETA estimation per Nairobi area.
- `analytics`: event collector, funnels, product intelligence, insight generator jobs.
- `messaging`: WhatsApp templates, SMS/email, notification preferences.
- `seo`: sitemap generator, structured data, area landing page pre-render tasks.

### Data + caching strategy
- Row-level tenancy: every table keyed by `tenant_id`; policies can enforce tenant isolation in Postgres.
- Caching: Redis for session/cart, hot product data (short TTL), and rate limits on sensitive endpoints (auth, payments).
- Search: Postgres full-text + trigram on `products` + `categories` with language tuned for English/Swahili mix; add “city/estate” terms for local SEO.
- Partitions: monthly partitions on `events` and potentially `orders` to keep analytics fast.

### Observability
- Structured JSON logs with correlation ids per request; log MPesa callbacks separately.
- Metrics: Prometheus + Grafana (requests, STK success rate, payment latency, queue depth).
- Tracing: OpenTelemetry across Next.js API routes and Nest.
- Alerts: MPesa success rate drops, queue backlog, PageSpeed regression.

### Security
- HTTPS everywhere; signed webhooks; MPesa IP allowlist if available.
- Idempotency keys on checkout/payments; replay protection on callbacks.
- RBAC for owner/staff; audit log on price changes, refunds, permission changes.
- Rate limiting on auth, payments, and webhook endpoints.

### Docker composition (dev/stage)
- `web`: Next.js app, port 3000.
- `api`: Nest/Node service, port 4000.
- `worker`: same image as API with worker command (BullMQ).
- `postgres`: Postgres 15+ with init scripts; volumes for data.
- `redis`: queue + cache.
- `nginx` (optional): reverse proxy, TLS termination; can be replaced by Cloudflare tunnel in prod.
- `adminer`/`pgweb` optional for local debugging (disabled in prod).

### Deployment notes
- Blue/green deploy via container tags; migrations run pre-deploy.
- CDN for images/static; ISR revalidation hook on product changes.
- Backups: pg_basebackup + WAL archiving; S3 versioning for assets.

### Future extensions
- Add ML-lite pricing suggestions using event aggregates.
- Edge caching of area landing pages keyed by Nairobi estate/ward.
- Push notifications via PWA for order updates and restock alerts.
