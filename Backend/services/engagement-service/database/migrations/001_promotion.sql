CREATE SCHEMA IF NOT EXISTS engagement;
CREATE TABLE IF NOT EXISTS engagement.promotion_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid,
  type text NOT NULL CHECK (type IN ('VOUCHER','FLASH_SALE')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','PAUSED','ENDED')),
  funding_source text NOT NULL CHECK (funding_source IN ('SELLER','PLATFORM')),
  title text NOT NULL CHECK (length(title) BETWEEN 3 AND 120),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at>starts_at),
  CHECK ((funding_source='SELLER' AND store_id IS NOT NULL) OR
         (funding_source='PLATFORM' AND store_id IS NULL))
);
CREATE INDEX IF NOT EXISTS promotion_campaign_active ON engagement.promotion_campaigns(type,status,starts_at,ends_at);
CREATE INDEX IF NOT EXISTS promotion_campaign_store ON engagement.promotion_campaigns(store_id,created_at DESC);
CREATE TABLE IF NOT EXISTS engagement.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL UNIQUE REFERENCES engagement.promotion_campaigns(id),
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9_-]{4,32}$'),
  discount_type text NOT NULL CHECK (discount_type IN ('FIXED','PERCENT')),
  discount_value integer NOT NULL CHECK (discount_value>0),
  max_discount_minor bigint,
  min_spend_minor bigint NOT NULL DEFAULT 0 CHECK (min_spend_minor>=0),
  total_limit integer NOT NULL CHECK (total_limit>0),
  per_user_limit integer NOT NULL DEFAULT 1 CHECK (per_user_limit>0),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count>=0),
  reserved_count integer NOT NULL DEFAULT 0 CHECK (reserved_count>=0),
  scope_type text NOT NULL CHECK (scope_type IN ('STORE','CATEGORY','SKU','PLATFORM')),
  scope_id uuid,
  segment text NOT NULL DEFAULT 'ALL' CHECK (segment IN ('ALL','FIRST_ORDER')),
  stackable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (discount_type='FIXED' OR discount_value<=10000),
  CHECK (max_discount_minor IS NULL OR max_discount_minor>=0),
  CHECK ((scope_type IN ('STORE','PLATFORM') AND scope_id IS NULL) OR
         (scope_type IN ('CATEGORY','SKU') AND scope_id IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS engagement.voucher_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid NOT NULL REFERENCES engagement.vouchers(id),
  user_id uuid NOT NULL,
  order_ref text NOT NULL,
  shop_order_id uuid,
  amount_minor bigint NOT NULL CHECK (amount_minor>=0),
  status text NOT NULL CHECK (status IN ('ACTIVE','COMMITTED','RELEASED','EXPIRED')),
  expires_at timestamptz NOT NULL,
  reserved_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(voucher_id,order_ref)
);
CREATE INDEX IF NOT EXISTS voucher_usage_user ON engagement.voucher_usage(voucher_id,user_id,status);
CREATE INDEX IF NOT EXISTS voucher_usage_expiry ON engagement.voucher_usage(status,expires_at);
CREATE TABLE IF NOT EXISTS engagement.flash_sale_items (
  campaign_id uuid NOT NULL REFERENCES engagement.promotion_campaigns(id),
  variant_id uuid NOT NULL,
  sale_price_minor bigint NOT NULL CHECK (sale_price_minor>0),
  quota integer NOT NULL CHECK (quota>0),
  reserved_count integer NOT NULL DEFAULT 0 CHECK (reserved_count>=0),
  sold_count integer NOT NULL DEFAULT 0 CHECK (sold_count>=0),
  PRIMARY KEY(campaign_id,variant_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_flash_sale_per_variant
  ON engagement.flash_sale_items(variant_id,campaign_id);
CREATE TABLE IF NOT EXISTS engagement.flash_sale_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  order_ref text NOT NULL,
  shop_order_id uuid,
  quantity integer NOT NULL CHECK (quantity>0),
  status text NOT NULL CHECK (status IN ('ACTIVE','COMMITTED','RELEASED','EXPIRED')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(campaign_id,variant_id)
    REFERENCES engagement.flash_sale_items(campaign_id,variant_id),
  UNIQUE(campaign_id,variant_id,order_ref)
);
CREATE INDEX IF NOT EXISTS flash_sale_reservation_expiry ON engagement.flash_sale_reservations(status,expires_at);
CREATE TABLE IF NOT EXISTS engagement.promotion_outbox (
  id bigserial PRIMARY KEY,
  event_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE TABLE IF NOT EXISTS engagement.promotion_audit_logs (
  id bigserial PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES engagement.promotion_campaigns(id),
  actor_id uuid,
  action text NOT NULL,
  changed_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
