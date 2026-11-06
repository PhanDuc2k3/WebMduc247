ALTER TABLE catalog.product_images ADD COLUMN content_hash text CHECK(content_hash ~ '^[0-9a-f]{64}$');
CREATE INDEX product_images_content_hash ON catalog.product_images(content_hash) WHERE content_hash IS NOT NULL;
