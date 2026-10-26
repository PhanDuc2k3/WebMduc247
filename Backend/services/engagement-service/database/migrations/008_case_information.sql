INSERT INTO engagement.notification_templates(key,channel,locale,version,title_template,body_template) VALUES
 ('buyer.case_information_requested','IN_APP','vi-VN',1,'Cần bổ sung thông tin','Sàn cần bạn bổ sung thông tin cho hồ sơ của đơn #{shortId}. Mở đơn để xem nội dung và hạn phản hồi.'),
 ('seller.case_information_requested','IN_APP','vi-VN',1,'Cần shop bổ sung thông tin','Sàn cần shop bổ sung thông tin cho hồ sơ của đơn #{shortId}. Mở đơn để xem nội dung và hạn phản hồi.')
ON CONFLICT DO NOTHING;
INSERT INTO engagement.notification_templates(key,channel,locale,version,title_template,body_template)
  SELECT key,'EMAIL',locale,version,title_template,body_template FROM engagement.notification_templates
  WHERE channel='IN_APP' AND key IN ('buyer.case_information_requested','seller.case_information_requested') ON CONFLICT DO NOTHING;
