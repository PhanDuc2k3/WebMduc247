ALTER TABLE engagement.notifications DROP CONSTRAINT IF EXISTS notifications_source_check;
ALTER TABLE engagement.notifications ADD CONSTRAINT notifications_source_check
  CHECK (source IN ('identity','order','payment','chat'));
ALTER TABLE engagement.notification_processed_events
  DROP CONSTRAINT IF EXISTS notification_processed_events_source_check;
ALTER TABLE engagement.notification_processed_events
  ADD CONSTRAINT notification_processed_events_source_check
  CHECK (source IN ('identity','order','payment','chat'));

INSERT INTO engagement.notification_templates
  (key,channel,locale,version,title_template,body_template) VALUES
  ('identity.registered','IN_APP','vi-VN',1,'Tài khoản đã được tạo','Chào mừng bạn đến với MDUC247.'),
  ('identity.email_verified','IN_APP','vi-VN',1,'Email đã xác minh','Email của bạn đã được xác minh thành công.'),
  ('identity.refresh_reuse','IN_APP','vi-VN',1,'Phiên đăng nhập cần kiểm tra',
   'Hệ thống phát hiện phiên đăng nhập có dấu hiệu bất thường. Vui lòng đăng nhập lại.')
ON CONFLICT DO NOTHING;
