CREATE TABLE IF NOT EXISTS engagement.notification_templates (
  key text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('IN_APP','EMAIL')),
  locale text NOT NULL DEFAULT 'vi-VN',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  title_template text NOT NULL,
  body_template text NOT NULL,
  PRIMARY KEY(key,channel,locale,version)
);

CREATE TABLE IF NOT EXISTS engagement.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('order','payment','chat')),
  event_id text NOT NULL,
  template_key text NOT NULL,
  type text NOT NULL CHECK (type IN ('order','payment','chat','seller','system','marketing')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  deep_link text NOT NULL CHECK (char_length(deep_link) BETWEEN 1 AND 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '180 days',
  UNIQUE(source,event_id,recipient_user_id,template_key)
);
CREATE INDEX IF NOT EXISTS notification_inbox_user_cursor
  ON engagement.notifications(recipient_user_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS notification_unread_user
  ON engagement.notifications(recipient_user_id,created_at DESC,id DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS notification_expiry ON engagement.notifications(expires_at);

CREATE TABLE IF NOT EXISTS engagement.notification_preferences (
  user_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('IN_APP','EMAIL')),
  category text NOT NULL CHECK (category IN ('MARKETING','CHAT','SELLER')),
  enabled boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,channel,category)
);

CREATE TABLE IF NOT EXISTS engagement.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES engagement.notifications(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel='EMAIL'),
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','SENT','DEAD','SKIPPED','DISABLED')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  provider_ref text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(notification_id,channel)
);
CREATE INDEX IF NOT EXISTS notification_delivery_pending
  ON engagement.notification_deliveries(next_attempt_at,id) WHERE status='PENDING';

CREATE TABLE IF NOT EXISTS engagement.notification_processed_events (
  source text NOT NULL CHECK (source IN ('order','payment','chat')),
  event_id text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(source,event_id)
);

INSERT INTO engagement.notification_templates(key,channel,locale,version,title_template,body_template) VALUES
 ('buyer.order_created','IN_APP','vi-VN',1,'Đã đặt hàng','Đơn #{shortId} đã được tạo.'),
 ('seller.new_order','IN_APP','vi-VN',1,'Đơn mới','Shop có đơn hàng mới #{shortId}.'),
 ('buyer.order_confirmed','IN_APP','vi-VN',1,'Đơn đã xác nhận','Shop đã xác nhận đơn #{shortId}.'),
 ('buyer.order_cancelled','IN_APP','vi-VN',1,'Đơn đã hủy','Đơn #{shortId} đã được hủy.'),
 ('seller.order_cancelled','IN_APP','vi-VN',1,'Đơn đã hủy','Đơn #{shortId} của shop đã được hủy.'),
 ('buyer.payment_succeeded','IN_APP','vi-VN',1,'Thanh toán thành công','Thanh toán cho nhóm đơn #{shortId} đã được xác nhận.'),
 ('seller.payment_succeeded','IN_APP','vi-VN',1,'Đơn đã thanh toán','Đơn #{shortId} của shop đã được thanh toán.'),
 ('buyer.refund_succeeded','IN_APP','vi-VN',1,'Đã hoàn tiền','Khoản hoàn cho đơn #{shortId} đã được xác nhận.'),
 ('seller.return_requested','IN_APP','vi-VN',1,'Yêu cầu trả hàng','Shop có yêu cầu trả hàng mới cho đơn #{shortId}.'),
 ('buyer.return_approved','IN_APP','vi-VN',1,'Yêu cầu trả hàng được chấp nhận','Shop đã chấp nhận yêu cầu trả hàng của đơn #{shortId}.'),
 ('buyer.refund_requested','IN_APP','vi-VN',1,'Đang xử lý hoàn tiền','Yêu cầu hoàn tiền của đơn #{shortId} đang được xử lý.'),
 ('seller.chat_message','IN_APP','vi-VN',1,'Tin nhắn mới','Khách hàng vừa gửi tin nhắn cho shop.'),
 ('buyer.chat_message','IN_APP','vi-VN',1,'Tin nhắn mới từ shop','Shop vừa gửi tin nhắn cho bạn.')
ON CONFLICT DO NOTHING;

INSERT INTO engagement.notification_templates(key,channel,locale,version,title_template,body_template)
SELECT key,'EMAIL',locale,version,title_template,body_template
FROM engagement.notification_templates WHERE channel='IN_APP' AND locale='vi-VN'
ON CONFLICT DO NOTHING;
