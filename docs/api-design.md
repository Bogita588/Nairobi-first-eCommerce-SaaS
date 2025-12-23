## API Design (REST-first, Nest modules)

### Conventions
- Base URL: `/api`.
- Auth: `Authorization: Bearer <JWT>` for owner/staff; checkout/cart endpoints accept guest cart token. Tenant derived from host or `X-Tenant-ID` header and set to `app.current_tenant`.
- Idempotency: `Idempotency-Key` required on payment/checkout/whatsapp-send endpoints.
- Versioning: header `X-API-Version: 1` (future-proof).
- Errors: problem+json with `code`, `message`, `details`.

### Auth & users
- `POST /auth/login` — email/phone + password → access/refresh tokens.
- `POST /auth/refresh` — rotate refresh → new pair.
- `POST /auth/logout` — revoke refresh.
- `POST /auth/otp` — send OTP for owner login fallback.
- `GET /me` — current user + roles.
- `GET /users` — list staff (owner only).
- `POST /users` — invite/create staff (owner).
- `PATCH /users/:id` — update role/status.
- `DELETE /users/:id` — deactivate.

### Store setup
- `GET /stores/me` — store settings, theme, SEO settings.
- `PATCH /stores/me` — update store, MPesa config, delivery defaults.
- `POST /stores/domains/verify` — verify custom domain DNS.
- `POST /stores/onboarding/complete` — wizard completion flag.

### Catalog
- `GET /categories` — list tree.
- `POST /categories` — create/update category.
- `GET /products` — list/search (filters: category, q, price range).
- `POST /products` — create product + variants + images.
- `GET /products/:id` — details.
- `PATCH /products/:id` — update product.
- `PATCH /products/:id/publish` — set status active/archived.
- `POST /products/:id/variants` — add variant.
- `PATCH /product-variants/:id` — update variant/stock.
- `POST /inventory/adjust` — adjust stock with reason + reference.

### Media
- `POST /uploads/sign` — signed URL for image upload (S3).
- `POST /product-images/reorder` — reorder positions.

### Pricing & promos
- `GET /price-rules` — list active/inactive rules.
- `POST /price-rules` — create rule (percentage/amount/bxgy).
- `PATCH /price-rules/:id` — update/activate/deactivate.

### Customers & CRM
- `GET /customers` — search/filter (phone, area, tags, LTV).
- `POST /customers` — create/update.
- `GET /customers/:id` — profile, addresses, orders.
- `POST /customers/:id/addresses` — add address.
- `GET /customers/:id/events` — timeline (views, carts, orders).

### Cart & checkout (guest-friendly)
- `POST /cart` — create cart (returns cart token).
- `GET /cart` — fetch cart by token.
- `POST /cart/items` — add/update/remove line (upsert by variant).
- `POST /cart/delivery-quote` — compute fee by Nairobi area.
- `POST /cart/apply-promo` — apply coupon/price rule.
- `POST /checkout` — validate totals, lock inventory, generate order draft.
- `POST /checkout/abandon` — submit abandonment reason.

### Payments (MPesa-first)
- `POST /payments/mpesa/stk` — initiate STK for order/cart.
- `POST /payments/:id/cancel` — cancel pending intent (if supported).
- `POST /webhooks/mpesa` — callback endpoint (verifies signature + idempotent).
- `GET /payments/:id` — status.
- `POST /refunds` — refund order/payment.

### Orders
- `GET /orders` — filter by status/channel/date.
- `GET /orders/:id` — detail + timeline.
- `PATCH /orders/:id/status` — transition (packing, dispatched, delivered, cancelled).
- `POST /orders/:id/notes` — add note.
- `POST /orders/:id/receipt` — regenerate invoice.

### Delivery & logistics
- `GET /delivery/partners` — list/create partner configs.
- `POST /delivery/orders` — create dispatch with partner/manual.
- `PATCH /delivery/orders/:id` — update status/tracking.
- `GET /delivery/zones` — list zones/fees.
- `POST /delivery/zones` — create/update zone.

### Messaging (WhatsApp)
- `POST /whatsapp/send-template` — send order/cart template (idempotent).
- `GET /whatsapp/threads` — list open threads.
- `GET /whatsapp/threads/:id/messages` — thread messages.
- `POST /whatsapp/webhook` — inbound callback.

### Analytics & insights
- `POST /events` — lightweight collector from web (batched).
- `GET /analytics/overview` — revenue/orders/AOV by day/week/month.
- `GET /analytics/funnel` — views → cart → checkout → paid.
- `GET /analytics/products` — product intelligence (views vs orders, abandonment).
- `GET /analytics/customers` — new vs returning, repeat rate, payment preferences.
- `GET /analytics/seo` — search impressions/clicks if integrated.
- `GET /insights` — actionable cards feed with filters (category, severity).

### SEO
- `GET /seo/pages` — list area/category landing pages.
- `POST /seo/pages` — create/update page (title/meta/schema).
- `POST /seo/sitemaps/generate` — regenerate sitemap and ping search engines.

### Health & admin
- `GET /health` — liveness/readiness.
- `GET /metrics` — Prometheus metrics (auth protected for ops).
