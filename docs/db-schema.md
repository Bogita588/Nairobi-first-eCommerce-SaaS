## Draft DB Schema (Postgres, multi-tenant)

Conventions
- `id` UUID PK, `created_at/updated_at` with `now()` defaults; `tenant_id` on every business table.
- Enforce tenant isolation via RLS policies (per-tenant owner/admin roles).
- Monetary values stored as integer `amount_cents` + `currency` (ISO 4217).
- Enumerations can be Postgres enums or check constraints; sample values listed per table.

### Core tenancy
- `tenants`: `id`, `name`, `plan`, `domain`, `timezone`, `status`, `mpesa_paybill`, `mpesa_short_code`, `whatsapp_number`, `created_at`.
- `users`: `id`, `tenant_id`, `email`, `phone`, `password_hash`, `role` (owner, staff, viewer), `status`, `last_login_at`, `mfa_secret`.
- `stores`: `id`, `tenant_id`, `name`, `slug`, `default_currency`, `logo_url`, `primary_contact_phone`, `nairobi_area`, `address`, `seo_settings jsonb`, `is_live`.
- `staff_invites`: `id`, `tenant_id`, `email`, `role`, `invite_token`, `expires_at`, `accepted_at`.

### Catalog
- `categories`: `id`, `tenant_id`, `name`, `slug`, `parent_id`, `position`, `is_active`.
- `products`: `id`, `tenant_id`, `store_id`, `name`, `slug`, `description`, `category_id`, `status` (draft, active, archived), `brand`, `base_price_cents`, `compare_at_price_cents`, `cost_cents`, `currency`, `sku`, `weight_kg`, `seo jsonb`, `search_tsv tsvector`.
- `product_variants`: `id`, `tenant_id`, `product_id`, `name`, `sku`, `barcode`, `price_cents`, `cost_cents`, `stock_quantity`, `low_stock_threshold`, `attributes jsonb` (size, color, model), `is_active`.
- `product_images`: `id`, `tenant_id`, `product_id`, `variant_id`, `url`, `position`, `alt_text`.
- `inventory_movements`: `id`, `tenant_id`, `product_id`, `variant_id`, `change` (int), `reason` (sale, restock, adjustment, refund), `reference_type` (order, refund), `reference_id`, `note`.
- `price_rules`: `id`, `tenant_id`, `name`, `type` (percentage_off, amount_off, bxgy), `scope` (product/category/storewide), `config jsonb`, `starts_at`, `ends_at`, `is_active`.

### Customer + CRM
- `customers`: `id`, `tenant_id`, `phone`, `email`, `first_name`, `last_name`, `whatsapp_opt_in`, `city_area`, `location_notes`, `lifetime_value_cents`, `last_order_at`, `tags text[]`.
- `customer_addresses`: `id`, `tenant_id`, `customer_id`, `label`, `city_area`, `street_address`, `instructions`, `is_default`.
- `customer_events`: `id`, `tenant_id`, `customer_id`, `event_type` (view, add_to_cart, order_created, order_paid), `metadata jsonb`, `occurred_at`.

### Cart + Checkout
- `carts`: `id`, `tenant_id`, `customer_id` (nullable), `channel` (web, whatsapp), `status` (open, converted, abandoned), `cart_token`, `currency`, `subtotal_cents`, `delivery_fee_cents`, `discount_cents`, `expires_at`.
- `cart_items`: `id`, `tenant_id`, `cart_id`, `product_id`, `variant_id`, `quantity`, `unit_price_cents`, `line_total_cents`, `metadata jsonb`.
- `delivery_quotes`: `id`, `tenant_id`, `cart_id`, `city_area`, `fee_cents`, `eta_minutes`, `rule_applied`, `expires_at`.
- `checkout_abandonment_reasons`: `id`, `tenant_id`, `cart_id`, `reason` (delivery_cost, payment_failure, price_sensitivity, other), `note`.

### Orders
- `orders`: `id`, `tenant_id`, `store_id`, `customer_id`, `cart_id`, `order_number` (tenant-sequenced), `status` (pending, awaiting_payment, paid, packing, dispatched, delivered, cancelled, refunded), `channel` (web, whatsapp), `currency`, `subtotal_cents`, `delivery_fee_cents`, `discount_cents`, `total_cents`, `payment_status` (unpaid, paid, partial, refunded), `payment_method` (mpesa, cod, card), `delivery_city_area`, `shipping_address jsonb`, `notes`, `placed_at`.
- `order_items`: `id`, `tenant_id`, `order_id`, `product_id`, `variant_id`, `name_snapshot`, `variant_snapshot`, `quantity`, `unit_price_cents`, `line_total_cents`, `tax_cents`.
- `order_status_history`: `id`, `tenant_id`, `order_id`, `from_status`, `to_status`, `changed_by`, `changed_at`, `note`.
- `refunds`: `id`, `tenant_id`, `order_id`, `payment_id`, `amount_cents`, `reason`, `status` (pending, processed, failed), `processed_at`.

### Payments (MPesa-first)
- `payments`: `id`, `tenant_id`, `order_id`, `method` (mpesa_till, mpesa_paybill, cod, card), `amount_cents`, `currency`, `status` (initiated, pending, succeeded, failed), `provider_reference`, `mpesa_receipt`, `phone`, `requested_at`, `completed_at`, `failure_reason`.
- `payment_intents`: `id`, `tenant_id`, `cart_id`, `order_id`, `idempotency_key`, `amount_cents`, `currency`, `status`, `expires_at`.
- `mpesa_callbacks_raw`: `id`, `tenant_id`, `payment_id`, `payload jsonb`, `received_at`, `validated` (bool).
- `payment_audit`: `id`, `tenant_id`, `payment_id`, `event_type` (initiated, callback_received, reconciled, refunded), `metadata jsonb`, `created_at`.

### Delivery & logistics
- `delivery_partners`: `id`, `tenant_id`, `name`, `provider` (pickup_mtaani, manual, other), `config jsonb`, `is_active`.
- `delivery_orders`: `id`, `tenant_id`, `order_id`, `partner_id`, `status` (pending, accepted, in_transit, delivered, failed), `tracking_code`, `eta_minutes`, `cost_cents`, `notes`, `dispatched_at`, `delivered_at`.
- `delivery_zones`: `id`, `tenant_id`, `name`, `city_area`, `fee_cents`, `min_order_cents`, `eta_minutes`, `is_default`.

### Messaging (WhatsApp)
- `whatsapp_threads`: `id`, `tenant_id`, `customer_id`, `cart_id` (nullable), `last_message_at`, `status` (open, closed).
- `whatsapp_messages`: `id`, `tenant_id`, `thread_id`, `direction` (inbound, outbound), `template_name`, `body`, `metadata jsonb`, `sent_at`, `delivered_at`, `failed_at`.

### Analytics & insights
- `events`: `id`, `tenant_id`, `event_type` (page_view, product_view, add_to_cart, checkout_start, payment_started, payment_failed, payment_succeeded, order_completed, search, whatsapp_click), `user_id` (nullable), `customer_id` (nullable), `session_id`, `product_id`, `order_id`, `cart_id`, `channel`, `device`, `city_area`, `amount_cents`, `properties jsonb`, `occurred_at`. Partition monthly.
- `funnels`: materialized view refreshed by jobs, derived from `events` to compute conversion per step.
- `product_insights`: aggregated table per product with `views`, `add_to_carts`, `orders`, `conversion_rate`, `abandonments`, `avg_scroll_depth`, `image_engagement_score`, `last_calculated_at`.
- `insight_cards`: `id`, `tenant_id`, `category` (pricing, delivery, trust, payment), `title`, `body`, `severity` (info, warn, action), `applies_to_product_id`, `applies_to_area`, `metric_snapshot jsonb`, `created_at`.

### SEO & content
- `seo_pages`: `id`, `tenant_id`, `slug`, `type` (area_landing, category_landing, blog), `title`, `meta_description`, `schema_json jsonb`, `is_indexable`, `published_at`, `updated_at`.
- `sitemaps`: `id`, `tenant_id`, `path`, `last_generated_at`, `item_count`.

### Indexing and performance notes
- Add composite indexes with `tenant_id` leading: e.g., `products(tenant_id, slug) unique`, `products USING GIN (search_tsv)`, `product_variants(tenant_id, sku) unique`.
- Orders: `orders(tenant_id, order_number) unique`, `orders(tenant_id, placed_at desc)`, partial index `orders` where `status IN ('paid','delivered')` for revenue queries.
- Events: monthly partitions; index `(tenant_id, event_type, occurred_at)` and GIN on `properties`.
- Payments: `payments(tenant_id, provider_reference)` and `mpesa_receipt` unique partial indexes.
- Delivery: `delivery_orders(tenant_id, status)` for dispatch queues.
- Consider table-level RLS policies and row-level locks on `inventory_movements` during checkout.

### Retention and housekeeping
- Events retention policy (e.g., keep 12-18 months, archive older to cheap storage).
- Soft-delete via `status` flags where needed (products, categories) to avoid key reuse.
- Nightly jobs: recompute `product_insights`, refresh `funnels`, expire `carts`, prune `mpesa_callbacks_raw`.
