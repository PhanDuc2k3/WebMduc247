DROP INDEX IF EXISTS engagement.one_active_flash_sale_per_variant;
CREATE INDEX IF NOT EXISTS flash_sale_items_variant_lookup
  ON engagement.flash_sale_items(variant_id,campaign_id);
