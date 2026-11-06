CREATE FUNCTION catalog.category_legacy_banner_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM catalog.catalog_banners WHERE split_part(split_part(target_url,'?',1),'#',1)='/category/'||OLD.slug)
 THEN RAISE EXCEPTION 'CATEGORY_REFERENCED' USING ERRCODE='23514'; END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER b_category_legacy_banner_guard BEFORE DELETE ON catalog.categories FOR EACH ROW EXECUTE FUNCTION catalog.category_legacy_banner_guard();
CREATE FUNCTION catalog.category_legacy_banner_slug() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.slug<>OLD.slug THEN
   UPDATE catalog.catalog_banners SET target_url='/category/'||NEW.slug||substring(target_url FROM length('/category/'||OLD.slug)+1)
   WHERE split_part(split_part(target_url,'?',1),'#',1)='/category/'||OLD.slug;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER category_legacy_banner_slug AFTER UPDATE OF slug ON catalog.categories FOR EACH ROW EXECUTE FUNCTION catalog.category_legacy_banner_slug();
CREATE FUNCTION catalog.legacy_banner_category_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_slug text; active boolean;
BEGIN
 PERFORM catalog.taxonomy_read_lock();
 IF NEW.active_to IS NOT NULL AND NEW.active_to<=now() THEN RETURN NEW; END IF;
 IF split_part(split_part(NEW.target_url,'?',1),'#',1) LIKE '/category/%' THEN
   target_slug:=substring(split_part(split_part(NEW.target_url,'?',1),'#',1) FROM length('/category/')+1);
   SELECT bool_and(is_active) INTO active FROM(
     WITH RECURSIVE path AS(SELECT id,parent_id,is_active FROM catalog.categories WHERE slug=target_slug OR id=(SELECT category_id FROM catalog.category_slug_aliases WHERE slug=target_slug)
       UNION ALL SELECT c.id,c.parent_id,c.is_active FROM catalog.categories c JOIN path p ON c.id=p.parent_id)
     SELECT * FROM path
   ) x;
   IF active IS DISTINCT FROM true THEN RAISE EXCEPTION 'CATEGORY_UNAVAILABLE' USING ERRCODE='23514'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER legacy_banner_category_guard BEFORE INSERT OR UPDATE OF target_url ON catalog.catalog_banners FOR EACH ROW EXECUTE FUNCTION catalog.legacy_banner_category_guard();
CREATE TRIGGER legacy_banner_taxonomy_changed AFTER INSERT OR UPDATE OR DELETE ON catalog.catalog_banners FOR EACH STATEMENT EXECUTE FUNCTION catalog.taxonomy_changed();
