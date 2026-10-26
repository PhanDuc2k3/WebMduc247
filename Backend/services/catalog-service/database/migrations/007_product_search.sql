-- Search data is denormalized only inside Catalog; triggers keep it in sync with product CRUD.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION catalog.normalize_search_text(value text) RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT trim(regexp_replace(replace(unaccent(lower(normalize(coalesce(value, ''), NFC))), 'đ', 'd'), '[[:space:]]+', ' ', 'g'))
$$;

ALTER TABLE catalog.products ADD COLUMN IF NOT EXISTS search_name text NOT NULL DEFAULT '';
ALTER TABLE catalog.products ADD COLUMN IF NOT EXISTS search_text text NOT NULL DEFAULT '';
ALTER TABLE catalog.products ADD COLUMN IF NOT EXISTS search_vector tsvector NOT NULL DEFAULT ''::tsvector;
ALTER TABLE catalog.stores ADD COLUMN IF NOT EXISTS search_name text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION catalog.refresh_product_search() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_name := catalog.normalize_search_text(NEW.name);
  NEW.search_text := concat_ws(' ', NEW.search_name, catalog.normalize_search_text(NEW.brand));
  NEW.search_vector :=
    setweight(to_tsvector('simple', NEW.search_name), 'A') ||
    setweight(to_tsvector('simple', catalog.normalize_search_text(NEW.brand)), 'B') ||
    setweight(to_tsvector('simple', catalog.normalize_search_text(NEW.description)), 'D');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS product_search_refresh ON catalog.products;
CREATE TRIGGER product_search_refresh BEFORE INSERT OR UPDATE OF name, brand, description
ON catalog.products FOR EACH ROW EXECUTE FUNCTION catalog.refresh_product_search();

CREATE OR REPLACE FUNCTION catalog.refresh_store_search() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_name := catalog.normalize_search_text(NEW.name);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS store_search_refresh ON catalog.stores;
CREATE TRIGGER store_search_refresh BEFORE INSERT OR UPDATE OF name
ON catalog.stores FOR EACH ROW EXECUTE FUNCTION catalog.refresh_store_search();

UPDATE catalog.products SET name = name;
UPDATE catalog.stores SET name = name;

CREATE INDEX IF NOT EXISTS product_search_text_trgm ON catalog.products USING gin(search_text gin_trgm_ops)
  WHERE status IN ('active', 'published');
CREATE INDEX IF NOT EXISTS product_search_vector_gin ON catalog.products USING gin(search_vector)
  WHERE status IN ('active', 'published');
CREATE INDEX IF NOT EXISTS store_search_name_trgm ON catalog.stores USING gin(search_name gin_trgm_ops)
  WHERE status = 'active';
