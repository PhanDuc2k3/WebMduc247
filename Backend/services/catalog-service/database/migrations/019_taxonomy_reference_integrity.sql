CREATE OR REPLACE FUNCTION catalog.product_category_reference_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'UPDATE' OR (NEW.category_id,NEW.brand_id,NEW.brand,NEW.specifications_json)
   IS DISTINCT FROM (OLD.category_id,OLD.brand_id,OLD.brand,OLD.specifications_json)
 THEN UPDATE catalog.taxonomy_state SET version=version+1 WHERE id=true; END IF;
 RETURN coalesce(NEW,OLD);
END $$;
DROP TRIGGER product_category_reference_changed ON catalog.products;
CREATE TRIGGER product_category_reference_changed AFTER INSERT OR UPDATE OF category_id,brand,brand_id,specifications_json OR DELETE ON catalog.products
 FOR EACH ROW EXECUTE FUNCTION catalog.product_category_reference_changed();
CREATE FUNCTION catalog.category_config_references(data jsonb,cid uuid,slug text) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE value jsonb;
BEGIN
 IF data IS NULL THEN RETURN false; END IF;
 IF jsonb_typeof(data)='object' THEN
   IF data->>'categoryId'=cid::text OR split_part(split_part(data->>'targetUrl','?',1),'#',1)='/category/'||slug THEN RETURN true; END IF;
   FOR value IN SELECT v FROM jsonb_each(data) AS x(k,v) LOOP IF catalog.category_config_references(value,cid,slug) THEN RETURN true; END IF; END LOOP;
 ELSIF jsonb_typeof(data)='array' THEN
   FOR value IN SELECT v FROM jsonb_array_elements(data) AS x(v) LOOP IF catalog.category_config_references(value,cid,slug) THEN RETURN true; END IF; END LOOP;
 END IF; RETURN false;
END $$;
CREATE OR REPLACE FUNCTION catalog.category_governance_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM catalog.taxonomy_lock();
 IF TG_OP='DELETE' THEN
   IF EXISTS(SELECT 1 FROM catalog.storefront_settings WHERE catalog.category_config_references(draft,OLD.id,OLD.slug) OR catalog.category_config_references(published,OLD.id,OLD.slug))
   THEN RAISE EXCEPTION 'CATEGORY_REFERENCED' USING ERRCODE='23514'; END IF;
   RETURN OLD;
 END IF;
 IF EXISTS(SELECT 1 FROM catalog.category_slug_aliases WHERE slug=NEW.slug AND category_id<>NEW.id) THEN RAISE EXCEPTION 'CATEGORY_SLUG_RESERVED' USING ERRCODE='23505'; END IF;
 IF NEW.is_active AND NEW.parent_id IS NOT NULL AND EXISTS(WITH RECURSIVE path AS(SELECT id,parent_id,is_active FROM catalog.categories WHERE id=NEW.parent_id
   UNION ALL SELECT c.id,c.parent_id,c.is_active FROM catalog.categories c JOIN path p ON c.id=p.parent_id)
   SELECT 1 FROM path WHERE NOT is_active) THEN RAISE EXCEPTION 'CATEGORY_PARENT_UNAVAILABLE' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' THEN
   NEW.admin_version:=OLD.admin_version+1;
   IF OLD.is_active AND NOT NEW.is_active AND EXISTS(WITH RECURSIVE subtree AS(SELECT OLD.id AS id UNION ALL SELECT c.id FROM catalog.categories c JOIN subtree s ON c.parent_id=s.id)
     SELECT 1 FROM catalog.products WHERE category_id IN(SELECT id FROM subtree)) THEN RAISE EXCEPTION 'CATEGORY_IN_USE' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
