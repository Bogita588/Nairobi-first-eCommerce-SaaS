-- Initial schema for Nairobi-first eCommerce SaaS (Postgres)
-- Multi-tenant via tenant_id on all business tables + RLS using app.current_tenant().

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

CREATE SCHEMA IF NOT EXISTS app;

-- Helper to read tenant from session setting; null if not set.
CREATE OR REPLACE FUNCTION app.current_tenant() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant', true), '')::uuid;
END;
$$ LANGUAGE plpgsql STABLE;

-- Utility to apply standard tenant RLS policies.
CREATE OR REPLACE FUNCTION app.enable_tenant_rls(target_table text) RETURNS void AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', target_table);
  EXECUTE format('CREATE POLICY tenant_select_%I ON %I FOR SELECT USING (tenant_id = app.current_tenant());', target_table, target_table);
  EXECUTE format('CREATE POLICY tenant_insert_%I ON %I FOR INSERT WITH CHECK (tenant_id = app.current_tenant());', target_table, target_table);
  EXECUTE format('CREATE POLICY tenant_update_%I ON %I FOR UPDATE USING (tenant_id = app.current_tenant()) WITH CHECK (tenant_id = app.current_tenant());', target_table, target_table);
  EXECUTE format('CREATE POLICY tenant_delete_%I ON %I FOR DELETE USING (tenant_id = app.current_tenant());', target_table, target_table);
END;
$$ LANGUAGE plpgsql;

-- Core tenancy
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan text NOT NULL DEFAULT 'starter',
  domain text,
  timezone text NOT NULL DEFAULT 'Africa/Nairobi',
  status text NOT NULL DEFAULT 'active',
  mpesa_paybill text,
  mpesa_short_code text,
  whatsapp_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text,
  phone text,
  password_hash text,
  role text NOT NULL DEFAULT 'staff', -- owner, staff, viewer
  status text NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  mfa_secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (tenant_id, email),
  CONSTRAINT users_phone_unique UNIQUE (tenant_id, phone)
);

CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  default_currency text NOT NULL DEFAULT 'KES',
  logo_url text,
  primary_contact_phone text,
  nairobi_area text,
  address text,
  seo_settings jsonb DEFAULT '{}'::jsonb,
  is_live boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stores_slug_unique UNIQUE (tenant_id, slug)
);

CREATE TABLE staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL,
  invite_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_invite_email UNIQUE (tenant_id, email)
);

-- Catalog
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  parent_id uuid,
  position int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_slug_unique UNIQUE (tenant_id, slug)
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft', -- draft, active, archived
  brand text,
  base_price_cents bigint NOT NULL DEFAULT 0,
  compare_at_price_cents bigint,
  cost_cents bigint,
  currency text NOT NULL DEFAULT 'KES',
  sku text,
  weight_kg numeric(10,2),
  seo jsonb DEFAULT '{}'::jsonb,
  search_tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,''))) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_slug_unique UNIQUE (tenant_id, slug),
  CONSTRAINT products_sku_unique UNIQUE (tenant_id, sku)
);

CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text,
  sku text,
  barcode text,
  price_cents bigint,
  cost_cents bigint,
  stock_quantity int NOT NULL DEFAULT 0,
  low_stock_threshold int DEFAULT 0,
  attributes jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_variants_sku UNIQUE (tenant_id, sku)
);

CREATE TABLE product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  url text NOT NULL,
  position int NOT NULL DEFAULT 0,
  alt_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  change int NOT NULL,
  reason text NOT NULL, -- sale, restock, adjustment, refund
  reference_type text,
  reference_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE price_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL, -- percentage_off, amount_off, bxgy
  scope text NOT NULL, -- product, category, storewide
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Customers / CRM
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone text,
  email text,
  first_name text,
  last_name text,
  whatsapp_opt_in boolean NOT NULL DEFAULT false,
  city_area text,
  location_notes text,
  lifetime_value_cents bigint NOT NULL DEFAULT 0,
  last_order_at timestamptz,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customers_phone_unique UNIQUE (tenant_id, phone),
  CONSTRAINT customers_email_unique UNIQUE (tenant_id, email)
);

CREATE TABLE customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label text,
  city_area text,
  street_address text,
  instructions text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

-- Cart / checkout
CREATE TABLE carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'web', -- web, whatsapp
  status text NOT NULL DEFAULT 'open', -- open, converted, abandoned
  cart_token text NOT NULL,
  currency text NOT NULL DEFAULT 'KES',
  subtotal_cents bigint NOT NULL DEFAULT 0,
  delivery_fee_cents bigint NOT NULL DEFAULT 0,
  discount_cents bigint NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT carts_token_unique UNIQUE (tenant_id, cart_token)
);

CREATE TABLE cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price_cents bigint NOT NULL,
  line_total_cents bigint NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE delivery_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  city_area text NOT NULL,
  fee_cents bigint NOT NULL,
  eta_minutes int,
  rule_applied text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE checkout_abandonment_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  reason text NOT NULL, -- delivery_cost, payment_failure, price_sensitivity, other
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  cart_id uuid REFERENCES carts(id) ON DELETE SET NULL,
  order_number bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  channel text NOT NULL DEFAULT 'web', -- web, whatsapp
  currency text NOT NULL DEFAULT 'KES',
  subtotal_cents bigint NOT NULL DEFAULT 0,
  delivery_fee_cents bigint NOT NULL DEFAULT 0,
  discount_cents bigint NOT NULL DEFAULT 0,
  total_cents bigint NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_method text,
  delivery_city_area text,
  shipping_address jsonb,
  notes text,
  placed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_order_number UNIQUE (tenant_id, order_number)
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  name_snapshot text NOT NULL,
  variant_snapshot text,
  quantity int NOT NULL DEFAULT 1,
  unit_price_cents bigint NOT NULL,
  line_total_cents bigint NOT NULL,
  tax_cents bigint DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  note text
);

CREATE TABLE refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_id uuid,
  amount_cents bigint NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending', -- pending, processed, failed
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Payments (MPesa-first)
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  method text NOT NULL, -- mpesa_till, mpesa_paybill, cod, card
  amount_cents bigint NOT NULL,
  currency text NOT NULL DEFAULT 'KES',
  status text NOT NULL DEFAULT 'initiated', -- initiated, pending, succeeded, failed
  provider_reference text,
  mpesa_receipt text,
  phone text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_provider_reference UNIQUE (tenant_id, provider_reference),
  CONSTRAINT payments_mpesa_receipt UNIQUE (tenant_id, mpesa_receipt)
);

CREATE TABLE payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cart_id uuid REFERENCES carts(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  idempotency_key text NOT NULL,
  amount_cents bigint NOT NULL,
  currency text NOT NULL DEFAULT 'KES',
  status text NOT NULL DEFAULT 'initiated',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_intents_idem UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE mpesa_callbacks_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  validated boolean NOT NULL DEFAULT false
);

CREATE TABLE payment_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Delivery / logistics
CREATE TABLE delivery_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  provider text NOT NULL, -- pickup_mtaani, manual, other
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE delivery_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES delivery_partners(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  tracking_code text,
  eta_minutes int,
  cost_cents bigint,
  notes text,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  city_area text NOT NULL,
  fee_cents bigint NOT NULL DEFAULT 0,
  min_order_cents bigint DEFAULT 0,
  eta_minutes int,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Messaging (WhatsApp)
CREATE TABLE whatsapp_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  cart_id uuid REFERENCES carts(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES whatsapp_threads(id) ON DELETE CASCADE,
  direction text NOT NULL, -- inbound, outbound
  template_name text,
  body text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Analytics & insights
CREATE TABLE events (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  user_id uuid,
  customer_id uuid,
  session_id text,
  product_id uuid,
  order_id uuid,
  cart_id uuid,
  channel text,
  device text,
  city_area text,
  amount_cents bigint,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE TABLE product_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  views bigint NOT NULL DEFAULT 0,
  add_to_carts bigint NOT NULL DEFAULT 0,
  orders bigint NOT NULL DEFAULT 0,
  conversion_rate numeric(6,3) DEFAULT 0,
  abandonments bigint NOT NULL DEFAULT 0,
  avg_scroll_depth numeric(6,3) DEFAULT 0,
  image_engagement_score numeric(6,3) DEFAULT 0,
  last_calculated_at timestamptz
);

CREATE TABLE insight_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category text NOT NULL, -- pricing, delivery, trust, payment
  title text NOT NULL,
  body text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  applies_to_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  applies_to_area text,
  metric_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- SEO
CREATE TABLE seo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug text NOT NULL,
  type text NOT NULL, -- area_landing, category_landing, blog
  title text NOT NULL,
  meta_description text,
  schema_json jsonb DEFAULT '{}'::jsonb,
  is_indexable boolean NOT NULL DEFAULT true,
  published_at timestamptz,
  updated_at timestamptz,
  CONSTRAINT seo_pages_slug UNIQUE (tenant_id, slug)
);

CREATE TABLE sitemaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  path text NOT NULL,
  last_generated_at timestamptz,
  item_count int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes (additional to uniques above)
CREATE INDEX idx_products_search ON products USING GIN (search_tsv);
CREATE INDEX idx_products_category ON products (tenant_id, category_id);
CREATE INDEX idx_product_variants_product ON product_variants (tenant_id, product_id);
CREATE INDEX idx_inventory_movements_product ON inventory_movements (tenant_id, product_id, created_at DESC);
CREATE INDEX idx_customers_last_order ON customers (tenant_id, last_order_at DESC);
CREATE INDEX idx_carts_status ON carts (tenant_id, status, updated_at DESC);
CREATE INDEX idx_orders_placed_at ON orders (tenant_id, placed_at DESC);
CREATE INDEX idx_payments_status ON payments (tenant_id, status, requested_at DESC);
CREATE INDEX idx_delivery_orders_status ON delivery_orders (tenant_id, status);
CREATE INDEX idx_events_type ON events (tenant_id, event_type, occurred_at DESC);
CREATE INDEX idx_events_props_gin ON events USING GIN (properties);

-- Rolling partitions for events (current + next two months)
CREATE OR REPLACE FUNCTION app.create_events_partition(p_month date) RETURNS void AS $$
DECLARE
  start_date date := date_trunc('month', p_month);
  end_date date := (start_date + interval '1 month')::date;
  tbl text := format('events_%s', to_char(start_date, 'YYYY_MM'));
BEGIN
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF events FOR VALUES FROM (%L) TO (%L);', tbl, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

SELECT app.create_events_partition(date_trunc('month', now())::date);
SELECT app.create_events_partition((date_trunc('month', now()) + interval '1 month')::date);
SELECT app.create_events_partition((date_trunc('month', now()) + interval '2 month')::date);

-- Apply RLS to all tenant tables
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'users','stores','staff_invites',
    'categories','products','product_variants','product_images','inventory_movements','price_rules',
    'customers','customer_addresses','customer_events',
    'carts','cart_items','delivery_quotes','checkout_abandonment_reasons',
    'orders','order_items','order_status_history','refunds',
    'payments','payment_intents','mpesa_callbacks_raw','payment_audit',
    'delivery_partners','delivery_orders','delivery_zones',
    'whatsapp_threads','whatsapp_messages',
    'events','product_insights','insight_cards',
    'seo_pages','sitemaps'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    PERFORM app.enable_tenant_rls(tbl);
  END LOOP;
END;
$$;

-- Helpers: ensure tenant_id defaults to current tenant for inserts when omitted (optional)
CREATE OR REPLACE FUNCTION app.set_tenant_id() RETURNS trigger AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := app.current_tenant();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to tables where tenant_id may be omitted in inserts
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'users','stores','staff_invites','categories','products','product_variants','product_images','inventory_movements','price_rules',
    'customers','customer_addresses','customer_events','carts','cart_items','delivery_quotes','checkout_abandonment_reasons',
    'orders','order_items','order_status_history','refunds','payments','payment_intents','mpesa_callbacks_raw','payment_audit',
    'delivery_partners','delivery_orders','delivery_zones','whatsapp_threads','whatsapp_messages',
    'events','product_insights','insight_cards','seo_pages','sitemaps'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('CREATE TRIGGER set_tenant_%I BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION app.set_tenant_id();', tbl, tbl);
  END LOOP;
END;
$$;
