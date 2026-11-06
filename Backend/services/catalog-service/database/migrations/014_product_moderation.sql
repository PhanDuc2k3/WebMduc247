CREATE TABLE catalog.product_rules (
  code text PRIMARY KEY CHECK(code ~ '^[A-Z][A-Z0-9_]{2,59}$'),
  violation_group text NOT NULL CHECK(violation_group IN ('MISLEADING','PROHIBITED','INAPPROPRIATE_IMAGE','COUNTERFEIT','SPAM','REMEDIATION')),
  label text NOT NULL, description text NOT NULL DEFAULT '', enabled boolean NOT NULL DEFAULT true,
  version bigint NOT NULL DEFAULT 0
);
INSERT INTO catalog.product_rules(code,violation_group,label) VALUES
 ('MISLEADING_CONTENT','MISLEADING','Nội dung sai lệch'),
 ('PROHIBITED_GOODS','PROHIBITED','Hàng bị cấm theo chính sách'),
 ('INAPPROPRIATE_IMAGE','INAPPROPRIATE_IMAGE','Hình ảnh không phù hợp'),
 ('COUNTERFEIT_BRAND','COUNTERFEIT','Giả mạo thương hiệu'),
 ('PRODUCT_SPAM','SPAM','Sản phẩm spam'),
 ('REMEDIATED','REMEDIATION','Đã khắc phục / xét lại quyết định');

CREATE TABLE catalog.product_revisions (
 product_id uuid NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
 version bigint NOT NULL, snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(product_id,version)
);
CREATE FUNCTION catalog.product_snapshot(pid uuid) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('name',p.name,'description',p.description,'categoryId',p.category_id,'brand',p.brand,
  'status',CASE WHEN p.platform_suspended THEN p.platform_previous_status ELSE p.status END,
  'imageUrl',p.image_url,'priceMinor',p.price_minor,
  'images',coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.position,i.id) FROM catalog.product_images i WHERE i.product_id=p.id),'[]'::jsonb),
  'variants',coalesce((SELECT jsonb_agg(to_jsonb(v) ORDER BY v.id) FROM catalog.product_variants v WHERE v.product_id=p.id),'[]'::jsonb),
  'attributes',coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.attribute_name) FROM catalog.product_attributes a WHERE a.product_id=p.id),'[]'::jsonb))
 FROM catalog.products p WHERE p.id=pid
$$;
INSERT INTO catalog.product_revisions(product_id,version,snapshot)
 SELECT id,admin_version,catalog.product_snapshot(id) FROM catalog.products;

CREATE TABLE catalog.product_decisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES catalog.products(id),
 product_version bigint NOT NULL, actor_id uuid NOT NULL, recipient_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('suspend','restore','request_changes','confirm_remedy','appeal_upheld','appeal_overturned')),
 reason_code text NOT NULL REFERENCES catalog.product_rules(code), rule_snapshot jsonb NOT NULL,
 reason text NOT NULL, evidence jsonb NOT NULL DEFAULT '[]', report_ids jsonb NOT NULL DEFAULT '[]',
 snapshot jsonb NOT NULL, remedy_by timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX product_decisions_target ON catalog.product_decisions(product_id,created_at DESC);
CREATE TABLE catalog.product_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES catalog.products(id),
 reporter_id uuid NOT NULL, reason_code text NOT NULL REFERENCES catalog.product_rules(code),
 reason text NOT NULL, evidence jsonb NOT NULL DEFAULT '[]', decision_id uuid REFERENCES catalog.product_decisions(id),
 request_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(reporter_id,request_id)
);
CREATE INDEX product_reports_target ON catalog.product_reports(product_id,created_at DESC);
ALTER TABLE catalog.products ADD COLUMN current_product_decision_id uuid REFERENCES catalog.product_decisions(id);
CREATE TABLE catalog.product_remedies (
 decision_id uuid PRIMARY KEY REFERENCES catalog.product_decisions(id),
 status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','SUBMITTED','CONFIRMED')),
 submitted_version bigint, seller_note text, submitted_at timestamptz, confirmed_at timestamptz
);
CREATE TABLE catalog.product_appeals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES catalog.products(id),
 decision_id uuid NOT NULL REFERENCES catalog.product_decisions(id), product_version bigint NOT NULL,
 snapshot jsonb NOT NULL, seller_id uuid NOT NULL, reason text NOT NULL, evidence jsonb NOT NULL DEFAULT '[]',
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','UPHELD','OVERTURNED')),
 review_decision_id uuid REFERENCES catalog.product_decisions(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(decision_id,seller_id)
);
CREATE TABLE catalog.product_seller_notices (
 id bigserial PRIMARY KEY, decision_id uuid NOT NULL UNIQUE REFERENCES catalog.product_decisions(id),
 recipient_id uuid NOT NULL, product_id uuid NOT NULL REFERENCES catalog.products(id),
 title text NOT NULL, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE catalog.product_bulk_previews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL, command jsonb NOT NULL,
 items jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE catalog.product_bulk_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), preview_id uuid NOT NULL UNIQUE REFERENCES catalog.product_bulk_previews(id),
 actor_id uuid NOT NULL, command jsonb NOT NULL, items jsonb NOT NULL,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','RUNNING','COMPLETED')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE catalog.product_rule_audit (
 id bigserial PRIMARY KEY, actor_id uuid NOT NULL, reason text NOT NULL, code text NOT NULL,
 previous_rule jsonb, next_rule jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

-- All content writers share the product lock and invalidate an in-flight review.
CREATE FUNCTION catalog.product_review_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.admin_version := greatest(NEW.admin_version,OLD.admin_version+1);
 IF NEW.platform_suspended THEN NEW.status := 'hidden'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER product_review_version BEFORE UPDATE ON catalog.products
 FOR EACH ROW EXECUTE FUNCTION catalog.product_review_version();
CREATE FUNCTION catalog.record_product_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO catalog.product_revisions(product_id,version,snapshot)
 VALUES(NEW.id,NEW.admin_version,catalog.product_snapshot(NEW.id)) ON CONFLICT DO NOTHING;
 RETURN NEW;
END $$;
CREATE TRIGGER product_revision AFTER INSERT OR UPDATE ON catalog.products
 FOR EACH ROW EXECUTE FUNCTION catalog.record_product_revision();
CREATE FUNCTION catalog.lock_review_product() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM catalog.products WHERE id=coalesce(NEW.product_id,OLD.product_id) FOR UPDATE;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE FUNCTION catalog.bump_review_product() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE catalog.products SET updated_at=now() WHERE id=coalesce(NEW.product_id,OLD.product_id);
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER variant_review_lock BEFORE INSERT OR UPDATE OR DELETE ON catalog.product_variants FOR EACH ROW EXECUTE FUNCTION catalog.lock_review_product();
CREATE TRIGGER variant_review_version AFTER INSERT OR UPDATE OR DELETE ON catalog.product_variants FOR EACH ROW EXECUTE FUNCTION catalog.bump_review_product();
CREATE TRIGGER image_review_lock BEFORE INSERT OR UPDATE OR DELETE ON catalog.product_images FOR EACH ROW EXECUTE FUNCTION catalog.lock_review_product();
CREATE TRIGGER image_review_version AFTER INSERT OR UPDATE OR DELETE ON catalog.product_images FOR EACH ROW EXECUTE FUNCTION catalog.bump_review_product();
CREATE TRIGGER attribute_review_lock BEFORE INSERT OR UPDATE OR DELETE ON catalog.product_attributes FOR EACH ROW EXECUTE FUNCTION catalog.lock_review_product();
CREATE TRIGGER attribute_review_version AFTER INSERT OR UPDATE OR DELETE ON catalog.product_attributes FOR EACH ROW EXECUTE FUNCTION catalog.bump_review_product();
CREATE FUNCTION catalog.immutable_product_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Product moderation history is immutable' USING ERRCODE='23514'; END $$;
CREATE TRIGGER immutable_product_revision BEFORE UPDATE ON catalog.product_revisions FOR EACH ROW EXECUTE FUNCTION catalog.immutable_product_history();
CREATE TRIGGER immutable_product_decision BEFORE UPDATE ON catalog.product_decisions FOR EACH ROW EXECUTE FUNCTION catalog.immutable_product_history();
