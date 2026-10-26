CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS catalog.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES catalog.categories(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  icon_key text,
  image_key text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  seed_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS categories_parent_order ON catalog.categories(parent_id,sort_order,name);

CREATE OR REPLACE FUNCTION catalog.prevent_category_cycle() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.parent_id = NEW.id THEN RAISE EXCEPTION 'CATEGORY_CYCLE' USING ERRCODE = '23514'; END IF;
  IF EXISTS (
    WITH RECURSIVE ancestors AS (
      SELECT id,parent_id FROM catalog.categories WHERE id=NEW.parent_id
      UNION ALL
      SELECT c.id,c.parent_id FROM catalog.categories c JOIN ancestors a ON c.id=a.parent_id
    )
    SELECT 1 FROM ancestors WHERE id=NEW.id
  ) THEN RAISE EXCEPTION 'CATEGORY_CYCLE' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS category_cycle_guard ON catalog.categories;
CREATE TRIGGER category_cycle_guard BEFORE INSERT OR UPDATE OF parent_id ON catalog.categories
FOR EACH ROW EXECUTE FUNCTION catalog.prevent_category_cycle();

ALTER TABLE catalog.stores ADD COLUMN IF NOT EXISTS seed_key text UNIQUE;
ALTER TABLE catalog.products ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES catalog.categories(id);
ALTER TABLE catalog.products ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE catalog.products ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE catalog.products ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE catalog.products ADD COLUMN IF NOT EXISTS price_minor bigint;
ALTER TABLE catalog.products ADD COLUMN IF NOT EXISTS sale_price_minor bigint;
ALTER TABLE catalog.products ADD COLUMN IF NOT EXISTS sale_starts_at timestamptz;
ALTER TABLE catalog.products ADD COLUMN IF NOT EXISTS sale_ends_at timestamptz;
ALTER TABLE catalog.products ADD COLUMN IF NOT EXISTS currency char(3) NOT NULL DEFAULT 'VND';
ALTER TABLE catalog.products ADD COLUMN IF NOT EXISTS seed_key text UNIQUE;
UPDATE catalog.products SET price_minor=round(price)::bigint WHERE price_minor IS NULL;
ALTER TABLE catalog.products ALTER COLUMN price_minor SET NOT NULL;
ALTER TABLE catalog.products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE catalog.products ADD CONSTRAINT products_status_check CHECK (status IN ('draft','active','published','hidden','discontinued'));
ALTER TABLE catalog.products ADD CONSTRAINT products_price_minor_check CHECK (price_minor >= 0 AND (sale_price_minor IS NULL OR (sale_price_minor >= 0 AND sale_price_minor <= price_minor)));
ALTER TABLE catalog.products ADD CONSTRAINT products_sale_time_check CHECK (sale_starts_at IS NULL OR sale_ends_at IS NULL OR sale_ends_at > sale_starts_at);
CREATE UNIQUE INDEX IF NOT EXISTS products_store_slug ON catalog.products(store_id,slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_public_filter ON catalog.products(status,category_id,store_id,created_at DESC);

CREATE TABLE IF NOT EXISTS catalog.product_attributes (
  product_id uuid NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
  attribute_name text NOT NULL,
  option_values jsonb NOT NULL CHECK (jsonb_typeof(option_values)='array'),
  PRIMARY KEY(product_id,attribute_name)
);
CREATE TABLE IF NOT EXISTS catalog.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES catalog.stores(id) ON DELETE CASCADE,
  sku text NOT NULL CHECK (length(sku) BETWEEN 2 AND 80),
  attributes_json jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes_json)='object'),
  price_minor bigint NOT NULL CHECK (price_minor >= 0),
  sale_price_minor bigint,
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id,sku),
  CONSTRAINT variant_sale_check CHECK (sale_price_minor IS NULL OR (sale_price_minor >= 0 AND sale_price_minor <= price_minor)),
  CONSTRAINT variant_sale_time_check CHECK (sale_starts_at IS NULL OR sale_ends_at IS NULL OR sale_ends_at > sale_starts_at)
);
CREATE INDEX IF NOT EXISTS variants_by_product ON catalog.product_variants(product_id,status);
INSERT INTO catalog.product_variants(product_id,store_id,sku,price_minor,stock)
SELECT p.id,p.store_id,'LEGACY-' || p.id::text,p.price_minor,p.stock FROM catalog.products p
WHERE NOT EXISTS (SELECT 1 FROM catalog.product_variants v WHERE v.product_id=p.id)
ON CONFLICT (store_id,sku) DO NOTHING;

CREATE TABLE IF NOT EXISTS catalog.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES catalog.product_variants(id) ON DELETE SET NULL,
  object_key text NOT NULL UNIQUE,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_images_order ON catalog.product_images(product_id,position,id);
CREATE UNIQUE INDEX IF NOT EXISTS product_one_primary ON catalog.product_images(product_id) WHERE is_primary;

CREATE TABLE IF NOT EXISTS catalog.catalog_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_key text NOT NULL,
  target_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active_from timestamptz,
  active_to timestamptz,
  seed_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT banner_time_check CHECK (active_from IS NULL OR active_to IS NULL OR active_to > active_from)
);
