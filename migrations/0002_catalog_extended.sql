-- Extend catalog structure for richer merchandising/SEO/logistics.

-- Categories: add descriptive/SEO fields.
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS icon text;

-- Products: richer merchandising, SEO, logistics, trust.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public', -- public, hidden, scheduled
  ADD COLUMN IF NOT EXISTS primary_category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS badges text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS schema_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS seo_keywords text[],
  ADD COLUMN IF NOT EXISTS warranty_text text,
  ADD COLUMN IF NOT EXISTS return_policy text,
  ADD COLUMN IF NOT EXISTS support_whatsapp text,
  ADD COLUMN IF NOT EXISTS lead_time_days int,
  ADD COLUMN IF NOT EXISTS area_restrictions jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_fee_overrides jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cod_allowed boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS mpesa_only_over_threshold boolean DEFAULT false;

-- Product images: focal point + primary flag.
ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS focal_point jsonb,
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false;

-- Many-to-many: products <-> categories (secondary categories).
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  position int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_categories_unique UNIQUE (tenant_id, product_id, category_id)
);

-- Collections: marketing groupings (manual/auto).
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  is_manual boolean NOT NULL DEFAULT true,
  rules_json jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  position int DEFAULT 0,
  hero_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collections_slug_unique UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS product_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  position int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_collections_unique UNIQUE (tenant_id, product_id, collection_id)
);

-- Product options (size/color/model) definitions and values.
CREATE TABLE IF NOT EXISTS product_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_option_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
  value text NOT NULL,
  position int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT option_values_unique UNIQUE (tenant_id, option_id, value)
);

-- Link variant to option values.
CREATE TABLE IF NOT EXISTS product_variant_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
  option_value_id uuid NOT NULL REFERENCES product_option_values(id) ON DELETE CASCADE,
  CONSTRAINT variant_option_unique UNIQUE (tenant_id, variant_id, option_id)
);

-- Indexes for new tables.
CREATE INDEX IF NOT EXISTS idx_product_categories_product ON product_categories (tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category ON product_categories (tenant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections (tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_product_collections_product ON product_collections (tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_product_collections_collection ON product_collections (tenant_id, collection_id);

-- Apply RLS to new tables if not already present.
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY['product_categories','collections','product_collections','product_options','product_option_values','product_variant_options'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    PERFORM app.enable_tenant_rls(tbl);
    EXECUTE format('CREATE TRIGGER set_tenant_%I BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION app.set_tenant_id();', tbl, tbl);
  END LOOP;
END;
$$;
