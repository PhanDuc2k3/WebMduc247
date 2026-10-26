CREATE TABLE IF NOT EXISTS catalog.product_rating_summary (
  product_id uuid PRIMARY KEY REFERENCES catalog.products(id),
  average_rating numeric(3,2) NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
