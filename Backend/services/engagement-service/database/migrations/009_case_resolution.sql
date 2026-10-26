INSERT INTO engagement.notification_templates(key,channel,locale,version,title_template,body_template) VALUES
 ('buyer.case_updated','IN_APP','vi-VN',1,'Cập nhật hồ sơ hậu mãi','Hồ sơ của đơn #{shortId} có thông báo, quyết định hoặc cập nhật kháng nghị. Mở đơn để xem chi tiết.'),
 ('seller.case_updated','IN_APP','vi-VN',1,'Cập nhật hồ sơ hậu mãi','Hồ sơ của đơn #{shortId} có thông báo, quyết định hoặc cập nhật kháng nghị. Mở đơn để xem chi tiết.') ON CONFLICT DO NOTHING;
INSERT INTO engagement.notification_templates(key,channel,locale,version,title_template,body_template)
 SELECT key,'EMAIL',locale,version,title_template,body_template FROM engagement.notification_templates
 WHERE channel='IN_APP' AND key IN ('buyer.case_updated','seller.case_updated') ON CONFLICT DO NOTHING;
