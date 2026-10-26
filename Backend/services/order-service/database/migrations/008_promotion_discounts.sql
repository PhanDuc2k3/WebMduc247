CREATE TABLE IF NOT EXISTS order_service.order_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_order_id uuid NOT NULL REFERENCES order_service.orders(id),
  item_id uuid REFERENCES order_service.order_items(id),
  source_type text NOT NULL CHECK (source_type IN ('CATALOG_SALE','FLASH_SALE','VOUCHER')),
  source_id uuid,
  funding_source text NOT NULL CHECK (funding_source IN ('SELLER','PLATFORM')),
  discount_minor bigint NOT NULL CHECK (discount_minor>=0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_discounts_order ON order_service.order_discounts(shop_order_id,item_id);
