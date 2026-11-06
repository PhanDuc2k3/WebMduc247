ALTER TABLE catalog.categories ADD COLUMN description text NOT NULL DEFAULT '';
ALTER TABLE catalog.categories ADD COLUMN admin_version bigint NOT NULL DEFAULT 0;
CREATE TABLE catalog.taxonomy_state(id boolean PRIMARY KEY DEFAULT true CHECK(id),version bigint NOT NULL DEFAULT 0);
INSERT INTO catalog.taxonomy_state(id) VALUES(true);
CREATE TABLE catalog.category_slug_aliases(slug text PRIMARY KEY,category_id uuid NOT NULL REFERENCES catalog.categories(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE catalog.category_attribute_schemas(
 category_id uuid PRIMARY KEY REFERENCES catalog.categories(id),definitions jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(definitions)='array'),
 legacy_policy text NOT NULL DEFAULT 'ON_EDIT' CHECK(legacy_policy IN ('ON_EDIT','NEW_ONLY')),version bigint NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE catalog.brands(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,logo_url text,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE','MERGED')),merged_into uuid REFERENCES catalog.brands(id),
 admin_version bigint NOT NULL DEFAULT 0,CHECK((status='MERGED')=(merged_into IS NOT NULL)),CHECK(id IS DISTINCT FROM merged_into));
CREATE UNIQUE INDEX brands_name_unique ON catalog.brands(lower(trim(name)));
CREATE TABLE catalog.brand_names(name_key text PRIMARY KEY,display_name text NOT NULL,brand_id uuid NOT NULL REFERENCES catalog.brands(id));
ALTER TABLE catalog.products ADD COLUMN brand_id uuid REFERENCES catalog.brands(id);
ALTER TABLE catalog.products ADD COLUMN specifications_json jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(specifications_json)='object');
INSERT INTO catalog.brands(name) SELECT min(trim(brand)) FROM catalog.products WHERE brand IS NOT NULL AND length(trim(brand))>=2 GROUP BY lower(trim(brand));
INSERT INTO catalog.brand_names(name_key,display_name,brand_id) SELECT lower(trim(name)),name,id FROM catalog.brands;
UPDATE catalog.products p SET brand_id=b.id FROM catalog.brands b WHERE lower(trim(p.brand))=lower(trim(b.name));
CREATE TABLE catalog.taxonomy_seller_notices(id bigserial PRIMARY KEY,product_id uuid NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
 recipient_id uuid NOT NULL,body text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE catalog.taxonomy_audit(id bigserial PRIMARY KEY,actor_id uuid NOT NULL,action text NOT NULL,target_id uuid,
 reason text NOT NULL,before_data jsonb,after_data jsonb,impact jsonb,request_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE catalog.taxonomy_previews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL,command jsonb NOT NULL,
 state_version bigint NOT NULL,storefront_version bigint NOT NULL,impact jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE catalog.taxonomy_imports(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL,kind text NOT NULL CHECK(kind IN ('categories','attributes')),
 status text NOT NULL CHECK(status IN ('INVALID','PREVIEWED','APPLIED')),filename text NOT NULL,row_count integer NOT NULL,
 plan jsonb NOT NULL,errors jsonb NOT NULL,state_version bigint NOT NULL,storefront_version bigint NOT NULL,reason text NOT NULL,
 request_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),applied_at timestamptz);

CREATE FUNCTION catalog.taxonomy_lock() RETURNS void LANGUAGE sql AS $$ SELECT pg_advisory_xact_lock(hashtextextended('catalog-taxonomy',0)) $$;
CREATE FUNCTION catalog.taxonomy_read_lock() RETURNS void LANGUAGE sql AS $$ SELECT pg_advisory_xact_lock_shared(hashtextextended('catalog-taxonomy',0)) $$;
CREATE FUNCTION catalog.taxonomy_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN UPDATE catalog.taxonomy_state SET version=version+1 WHERE id=true; RETURN coalesce(NEW,OLD); END $$;
CREATE TRIGGER category_taxonomy_changed AFTER INSERT OR UPDATE OR DELETE ON catalog.categories FOR EACH STATEMENT EXECUTE FUNCTION catalog.taxonomy_changed();
CREATE TRIGGER attributes_taxonomy_changed AFTER INSERT OR UPDATE OR DELETE ON catalog.category_attribute_schemas FOR EACH STATEMENT EXECUTE FUNCTION catalog.taxonomy_changed();
CREATE TRIGGER brands_taxonomy_changed AFTER INSERT OR UPDATE OR DELETE ON catalog.brands FOR EACH STATEMENT EXECUTE FUNCTION catalog.taxonomy_changed();
CREATE TRIGGER brand_names_taxonomy_changed AFTER INSERT OR UPDATE OR DELETE ON catalog.brand_names FOR EACH STATEMENT EXECUTE FUNCTION catalog.taxonomy_changed();
CREATE FUNCTION catalog.product_category_reference_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'UPDATE' OR NEW.category_id IS DISTINCT FROM OLD.category_id THEN UPDATE catalog.taxonomy_state SET version=version+1 WHERE id=true; END IF;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER product_category_reference_changed AFTER INSERT OR UPDATE OF category_id OR DELETE ON catalog.products FOR EACH ROW EXECUTE FUNCTION catalog.product_category_reference_changed();

CREATE FUNCTION catalog.category_governance_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM catalog.taxonomy_lock();
 IF TG_OP='DELETE' THEN
   IF EXISTS(SELECT 1 FROM catalog.storefront_settings WHERE coalesce(draft::text,'') LIKE '%'||OLD.id::text||'%' OR coalesce(published::text,'') LIKE '%'||OLD.id::text||'%'
     OR coalesce(draft::text,'') LIKE '%/category/'||OLD.slug||'"%' OR coalesce(published::text,'') LIKE '%/category/'||OLD.slug||'"%')
   THEN RAISE EXCEPTION 'CATEGORY_REFERENCED' USING ERRCODE='23514'; END IF;
   RETURN OLD;
 END IF;
 IF EXISTS(SELECT 1 FROM catalog.category_slug_aliases WHERE slug=NEW.slug AND category_id<>NEW.id) THEN
   RAISE EXCEPTION 'CATEGORY_SLUG_RESERVED' USING ERRCODE='23505'; END IF;
 IF NEW.is_active AND NEW.parent_id IS NOT NULL AND EXISTS(WITH RECURSIVE path AS(SELECT id,parent_id,is_active FROM catalog.categories WHERE id=NEW.parent_id
   UNION ALL SELECT c.id,c.parent_id,c.is_active FROM catalog.categories c JOIN path p ON c.id=p.parent_id)
   SELECT 1 FROM path WHERE NOT is_active) THEN RAISE EXCEPTION 'CATEGORY_PARENT_UNAVAILABLE' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' THEN
   NEW.admin_version:=OLD.admin_version+1;
   IF OLD.is_active AND NOT NEW.is_active AND EXISTS(
     WITH RECURSIVE subtree AS(SELECT OLD.id AS id UNION ALL SELECT c.id FROM catalog.categories c JOIN subtree s ON c.parent_id=s.id)
     SELECT 1 FROM catalog.products WHERE category_id IN(SELECT id FROM subtree))
   THEN RAISE EXCEPTION 'CATEGORY_IN_USE' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_category_governance_guard BEFORE INSERT OR UPDATE OR DELETE ON catalog.categories FOR EACH ROW EXECUTE FUNCTION catalog.category_governance_guard();

CREATE FUNCTION catalog.rewrite_category_links(data jsonb,old_slug text,new_slug text) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE result jsonb; entry record; value jsonb; link text;
BEGIN
 IF data IS NULL THEN RETURN NULL; END IF;
 IF jsonb_typeof(data)='array' THEN
   SELECT coalesce(jsonb_agg(catalog.rewrite_category_links(a,old_slug,new_slug) ORDER BY position),'[]') INTO result FROM jsonb_array_elements(data) WITH ORDINALITY AS x(a,position); RETURN result;
 ELSIF jsonb_typeof(data)='object' THEN
   result:='{}';
   FOR entry IN SELECT * FROM jsonb_each(data) LOOP
     value:=catalog.rewrite_category_links(entry.value,old_slug,new_slug);
     IF entry.key='targetUrl' AND jsonb_typeof(entry.value)='string' THEN
       link:=entry.value#>>'{}';
       IF split_part(split_part(link,'?',1),'#',1)='/category/'||old_slug THEN value:=to_jsonb('/category/'||new_slug||substring(link FROM length('/category/'||old_slug)+1)); END IF;
     END IF;
     result:=result||jsonb_build_object(entry.key,value);
   END LOOP; RETURN result;
 END IF; RETURN data;
END $$;
CREATE FUNCTION catalog.category_slug_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.slug<>OLD.slug THEN
   DELETE FROM catalog.category_slug_aliases WHERE slug=NEW.slug AND category_id=NEW.id;
   INSERT INTO catalog.category_slug_aliases(slug,category_id) VALUES(OLD.slug,NEW.id) ON CONFLICT(slug) DO NOTHING;
   UPDATE catalog.storefront_settings SET draft=catalog.rewrite_category_links(draft,OLD.slug,NEW.slug),
     published=catalog.rewrite_category_links(published,OLD.slug,NEW.slug),version=version+1,updated_at=now()
   WHERE draft IS DISTINCT FROM catalog.rewrite_category_links(draft,OLD.slug,NEW.slug) OR published IS DISTINCT FROM catalog.rewrite_category_links(published,OLD.slug,NEW.slug);
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER category_slug_changed AFTER UPDATE OF slug ON catalog.categories FOR EACH ROW EXECUTE FUNCTION catalog.category_slug_changed();
CREATE FUNCTION catalog.product_taxonomy_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.specifications_json IS DISTINCT FROM OLD.specifications_json THEN NEW.review_content_version:=OLD.review_content_version+1; END IF;
 IF NEW.category_id IS NOT NULL AND (TG_OP='INSERT' OR NEW.category_id IS DISTINCT FROM OLD.category_id OR NEW.seller_status IN ('active','published') AND OLD.seller_status NOT IN ('active','published')) THEN
   IF NOT EXISTS(WITH RECURSIVE path AS(SELECT id,parent_id,is_active FROM catalog.categories WHERE id=NEW.category_id
     UNION ALL SELECT c.id,c.parent_id,c.is_active FROM catalog.categories c JOIN path p ON p.parent_id=c.id)
     SELECT 1 FROM path HAVING count(*)>0 AND bool_and(is_active)) THEN RAISE EXCEPTION 'CATEGORY_UNAVAILABLE' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_product_taxonomy_guard BEFORE INSERT OR UPDATE ON catalog.products FOR EACH ROW EXECUTE FUNCTION catalog.product_taxonomy_guard();
CREATE OR REPLACE FUNCTION catalog.product_snapshot(pid uuid) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('name',p.name,'description',p.description,'categoryId',p.category_id,'brand',p.brand,'brandId',p.brand_id,
  'status',p.seller_status,'imageUrl',p.image_url,'priceMinor',p.price_minor,'specifications',p.specifications_json,
  'images',coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.position,i.id) FROM catalog.product_images i WHERE i.product_id=p.id),'[]'::jsonb),
  'variants',coalesce((SELECT jsonb_agg(to_jsonb(v) ORDER BY v.id) FROM catalog.product_variants v WHERE v.product_id=p.id),'[]'::jsonb),
  'attributes',coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.attribute_name) FROM catalog.product_attributes a WHERE a.product_id=p.id),'[]'::jsonb))
 FROM catalog.products p WHERE p.id=pid
$$;
