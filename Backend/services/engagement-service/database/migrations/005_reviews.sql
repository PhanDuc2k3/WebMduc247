CREATE TABLE IF NOT EXISTS engagement.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  product_id uuid NOT NULL,
  order_item_id uuid NOT NULL UNIQUE,
  store_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  content text NOT NULL CHECK (char_length(content) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED','HIDDEN')),
  version integer NOT NULL DEFAULT 1,
  helpful_count integer NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_product_public ON engagement.reviews(product_id,created_at DESC,id DESC) WHERE status='PUBLISHED';
CREATE TABLE IF NOT EXISTS engagement.review_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES engagement.reviews(id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  data bytea NOT NULL,
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 2),
  UNIQUE(review_id,position)
);
CREATE TABLE IF NOT EXISTS engagement.review_replies (
  review_id uuid PRIMARY KEY REFERENCES engagement.reviews(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 3 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS engagement.review_helpful_votes (
  review_id uuid NOT NULL REFERENCES engagement.reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(review_id,user_id)
);
CREATE TABLE IF NOT EXISTS engagement.product_rating_summary (
  product_id uuid PRIMARY KEY,
  average_rating numeric(3,2) NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS engagement.review_outbox (
  id bigserial PRIMARY KEY,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
