CREATE TABLE catalog.product_review_policy (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), approval_required boolean NOT NULL DEFAULT false,
 version bigint NOT NULL DEFAULT 0
);
INSERT INTO catalog.product_review_policy(id) VALUES(true);
ALTER TABLE catalog.products ADD COLUMN seller_status text NOT NULL DEFAULT 'draft'
 CHECK(seller_status IN ('draft','active','published','hidden','discontinued'));
UPDATE catalog.products SET seller_status=CASE WHEN platform_suspended THEN coalesce(platform_previous_status,'hidden') ELSE status END;
ALTER TABLE catalog.products ADD COLUMN review_status text NOT NULL DEFAULT 'NOT_REQUIRED'
 CHECK(review_status IN ('NOT_REQUIRED','PENDING','APPROVED','NEEDS_CHANGES'));
ALTER TABLE catalog.products ADD COLUMN review_content_version bigint NOT NULL DEFAULT 0;
ALTER TABLE catalog.products ADD COLUMN approved_content_version bigint;
ALTER TABLE catalog.product_decisions DROP CONSTRAINT product_decisions_action_check;
ALTER TABLE catalog.product_decisions ADD CONSTRAINT product_decisions_action_check
 CHECK(action IN ('suspend','restore','request_changes','confirm_remedy','appeal_upheld','appeal_overturned','publication_approved','publication_changes_requested'));
CREATE INDEX products_review_queue ON catalog.products(review_status,created_at,id) WHERE review_status='PENDING';
CREATE TABLE catalog.product_review_policy_audit (
 id bigserial PRIMARY KEY, actor_id uuid NOT NULL, reason text NOT NULL,
 previous_policy jsonb NOT NULL,next_policy jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION catalog.product_review_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE dirty boolean; required boolean;
BEGIN
 SELECT approval_required INTO required FROM catalog.product_review_policy WHERE id=true;
 IF TG_OP='INSERT' THEN
   NEW.seller_status:=NEW.status;
   NEW.review_status:=CASE WHEN required THEN 'PENDING' ELSE 'NOT_REQUIRED' END;
 ELSE
   NEW.admin_version:=greatest(NEW.admin_version,OLD.admin_version+1);
   dirty := (NEW.name,NEW.description,NEW.category_id,NEW.brand,NEW.price_minor,NEW.image_url,NEW.review_content_version)
     IS DISTINCT FROM (OLD.name,OLD.description,OLD.category_id,OLD.brand,OLD.price_minor,OLD.image_url,OLD.review_content_version);
   IF dirty THEN
     NEW.review_content_version:=greatest(NEW.review_content_version,OLD.review_content_version+1);
     IF required THEN NEW.review_status:='PENDING'; END IF;
   END IF;
   -- Compatibility for existing writers; seller API also writes seller_status explicitly.
   IF NEW.seller_status=OLD.seller_status AND NEW.status<>OLD.status
     AND NEW.platform_suspended=OLD.platform_suspended AND NEW.review_status=OLD.review_status THEN
     NEW.seller_status:=NEW.status;
   END IF;
 END IF;
 NEW.status:=CASE WHEN NEW.platform_suspended OR (NEW.review_status IN ('PENDING','NEEDS_CHANGES') AND NEW.seller_status IN ('active','published'))
   THEN 'hidden' ELSE NEW.seller_status END;
 RETURN NEW;
END $$;
DROP TRIGGER product_review_version ON catalog.products;
CREATE TRIGGER product_review_version BEFORE INSERT OR UPDATE ON catalog.products
 FOR EACH ROW EXECUTE FUNCTION catalog.product_review_version();

CREATE OR REPLACE FUNCTION catalog.bump_review_product() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE dirty boolean;
BEGIN
 -- Inventory movements invalidate stale decisions, but do not require content reapproval.
 dirty := TG_OP<>'UPDATE' OR (to_jsonb(NEW)-'stock'-'created_at') IS DISTINCT FROM (to_jsonb(OLD)-'stock'-'created_at');
 UPDATE catalog.products SET updated_at=now(),review_content_version=review_content_version+CASE WHEN dirty THEN 1 ELSE 0 END
 WHERE id=coalesce(NEW.product_id,OLD.product_id);
 RETURN coalesce(NEW,OLD);
END $$;
CREATE OR REPLACE FUNCTION catalog.product_snapshot(pid uuid) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('name',p.name,'description',p.description,'categoryId',p.category_id,'brand',p.brand,
  'status',p.seller_status,'imageUrl',p.image_url,'priceMinor',p.price_minor,
  'images',coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.position,i.id) FROM catalog.product_images i WHERE i.product_id=p.id),'[]'::jsonb),
  'variants',coalesce((SELECT jsonb_agg(to_jsonb(v) ORDER BY v.id) FROM catalog.product_variants v WHERE v.product_id=p.id),'[]'::jsonb),
  'attributes',coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.attribute_name) FROM catalog.product_attributes a WHERE a.product_id=p.id),'[]'::jsonb))
 FROM catalog.products p WHERE p.id=pid
$$;
