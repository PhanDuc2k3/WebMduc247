CREATE TABLE IF NOT EXISTS order_service.return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_order_id uuid NOT NULL REFERENCES order_service.orders(id),
  buyer_id uuid NOT NULL,
  store_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 1000),
  reason_code text NOT NULL CHECK (reason_code IN ('DAMAGED','WRONG_ITEM','NOT_AS_DESCRIBED','OTHER')),
  resolution text NOT NULL CHECK (resolution IN ('REFUND','REPLACEMENT')),
  status text NOT NULL DEFAULT 'REQUESTED' CHECK (status IN
    ('REQUESTED','UNDER_REVIEW','APPROVED','REJECTED','RETURNING','RECEIVED','REFUND_PENDING','REFUNDED','CLOSED')),
  seller_response text,
  version integer NOT NULL DEFAULT 1,
  eligible_refund_minor bigint NOT NULL CHECK (eligible_refund_minor >= 0),
  shipping_refund_minor bigint NOT NULL DEFAULT 0 CHECK (shipping_refund_minor >= 0),
  refund_reference text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS return_requests_buyer ON order_service.return_requests(buyer_id,requested_at DESC);
CREATE INDEX IF NOT EXISTS return_requests_store ON order_service.return_requests(store_id,requested_at DESC);
CREATE TABLE IF NOT EXISTS order_service.return_items (
  request_id uuid NOT NULL REFERENCES order_service.return_requests(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES order_service.order_items(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  eligible_refund_minor bigint NOT NULL CHECK (eligible_refund_minor >= 0),
  PRIMARY KEY(request_id,order_item_id)
);
CREATE TABLE IF NOT EXISTS order_service.return_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES order_service.return_requests(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  object_key text NOT NULL UNIQUE,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  data bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_service.return_history (
  id bigserial PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES order_service.return_requests(id),
  from_status text,
  to_status text NOT NULL,
  actor_id uuid,
  actor_type text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
