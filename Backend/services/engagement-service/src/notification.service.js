import { PromotionError } from './service.js';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const mongoId=/^[0-9a-f]{24}$/i;
const eventIdPattern=/^[a-zA-Z0-9_:-]{1,120}$/;
const bad=(status,code,message)=>new PromotionError(status,code,message);
const categoryOf=key=>key.includes('.chat_')?'CHAT':key.startsWith('seller.')?'SELLER':'TRANSACTIONAL';
const typeOf=key=>key.includes('chat_')?'chat':key.includes('payment')||key.includes('refund')?'payment':
  key.startsWith('seller.')?'seller':key.startsWith('identity.')?'system':'order';
const serialize=row=>({id:row.id,type:row.type,title:row.title,body:row.body,
  deepLink:row.deep_link,isRead:Boolean(row.read_at),createdAt:row.created_at});
export function encodeNotificationCursor(row){
  return Buffer.from(JSON.stringify([new Date(row.created_at).toISOString(),row.id])).toString('base64url');
}
export function decodeNotificationCursor(raw){
  try{if(typeof raw!=='string'||raw.length>160)return null;
    const [time,id]=JSON.parse(Buffer.from(raw,'base64url').toString('utf8'));
    const date=new Date(time);if(!uuid.test(String(id))||Number.isNaN(date.getTime()))return null;
    return {time:date,id};}catch{return null;}
}
export class NotificationService {
  constructor(pool,config={}){this.pool=pool;this.config=config;}
  async remote(url,options={}){
    let response;try{response=await fetch(url,{...options,signal:AbortSignal.timeout(5000)});}
    catch{throw bad(503,'DEPENDENCY_UNAVAILABLE','Dịch vụ liên quan chưa sẵn sàng.');}
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw bad(response.status>=500?503:response.status,
      data.code||'DEPENDENCY_ERROR',data.message||'Dịch vụ liên quan từ chối yêu cầu.');
    return data;
  }
  async orderShop(shopOrderId){
    if(!uuid.test(String(shopOrderId)))throw bad(400,'INVALID_EVENT','Mã đơn shop không hợp lệ.');
    return this.remote(new URL(`/api/v2/internal/notification/shop-orders/${shopOrderId}`,
      this.config.orderUrl),{headers:{'X-Notification-Order-Token':this.config.orderToken}});
  }
  async orderGroup(groupId){
    if(!uuid.test(String(groupId)))throw bad(400,'INVALID_EVENT','Mã nhóm đơn không hợp lệ.');
    return this.remote(new URL(`/api/v2/internal/notification/groups/${groupId}`,
      this.config.orderUrl),{headers:{'X-Notification-Order-Token':this.config.orderToken}});
  }
  async members(storeId){
    if(!uuid.test(String(storeId)))throw bad(400,'INVALID_EVENT','Mã shop không hợp lệ.');
    const data=await this.remote(new URL(`/api/v2/inventory/stores/${storeId}/notification-members`,
      this.config.catalogUrl),{headers:{'X-Inventory-Token':this.config.catalogToken}});
    return (data.members||[]).filter(member=>uuid.test(String(member.userId))).map(member=>member.userId);
  }
  async resolve(source,event){
    const payload=event.payload||event,type=event.type,targets=[];
    const add=(recipientId,key,link,shortId)=>{
      if(!uuid.test(String(recipientId)))throw bad(400,'INVALID_EVENT','Người nhận không hợp lệ.');
      if(!(link==='/profile'||/^\/(orders|mystore|messages)\//.test(link))||link.includes('//')||
        !/^[0-9a-f]{8}$/i.test(shortId))throw bad(400,'INVALID_EVENT','Deep link không hợp lệ.');
      if(!targets.some(row=>row.recipientId===recipientId&&row.key===key))
        targets.push({recipientId,key,link,shortId});
    };
    if(source==='identity'){
      if(!['UserRegistered.v1','UserEmailVerified.v1','RefreshReuseDetected.v1'].includes(type))return [];
      if(!uuid.test(String(payload.userId)))throw bad(400,'INVALID_EVENT','Người dùng không hợp lệ.');
      const key={ 'UserRegistered.v1':'identity.registered',
        'UserEmailVerified.v1':'identity.email_verified',
        'RefreshReuseDetected.v1':'identity.refresh_reuse' }[type];
      add(payload.userId,key,'/profile',payload.userId.slice(0,8));
    }else if(source==='order'){
      if(!['OrderCreated.v1','ShopOrderConfirmed.v1','OrderCancelled.v1',
        'ReturnRequested.v1','ReturnApproved.v1','RefundRequested.v1','CaseInformationRequested.v1','CasePublicMessage.v1','CaseDecisionPublished.v1','CaseAppealUpdated.v1'].includes(type))return [];
      const ctx=await this.orderShop(payload.shopOrderId||payload.orderId);
      if(payload.groupId&&payload.groupId!==ctx.groupId||payload.storeId&&payload.storeId!==ctx.storeId||
        payload.buyerId&&payload.buyerId!==ctx.buyerId)
        throw bad(409,'EVENT_CONTEXT_MISMATCH','Sự kiện không khớp đơn.');
      const buyerLink=`/orders/${ctx.groupId}`,sellerLink=`/mystore/orders/${ctx.shopOrderId}`;
      const shortId=ctx.shopOrderId.slice(0,8);
      if(type==='OrderCreated.v1'){
        add(ctx.buyerId,'buyer.order_created',buyerLink,shortId);
        for(const id of await this.members(ctx.storeId))add(id,'seller.new_order',sellerLink,shortId);
      }else if(type==='ShopOrderConfirmed.v1')add(ctx.buyerId,'buyer.order_confirmed',buyerLink,shortId);
      else if(type==='OrderCancelled.v1'){
        add(ctx.buyerId,'buyer.order_cancelled',buyerLink,shortId);
        for(const id of await this.members(ctx.storeId))add(id,'seller.order_cancelled',sellerLink,shortId);
      }else if(type==='ReturnRequested.v1'){
        for(const id of await this.members(ctx.storeId))add(id,'seller.return_requested',sellerLink,shortId);
      }else if(type==='ReturnApproved.v1')add(ctx.buyerId,'buyer.return_approved',buyerLink,shortId);
      else if(type==='RefundRequested.v1')add(ctx.buyerId,'buyer.refund_requested',buyerLink,shortId);
      else if(type==='CaseInformationRequested.v1'){
        if(!uuid.test(String(payload.caseId))||!uuid.test(String(payload.requestId))||!['BUYER','SELLER'].includes(payload.recipientKind))
          throw bad(400,'INVALID_EVENT','Yêu cầu bổ sung thông tin không hợp lệ.');
        if(payload.recipientKind==='BUYER')add(ctx.buyerId,'buyer.case_information_requested',buyerLink,shortId);
        else for(const id of await this.members(ctx.storeId))add(id,'seller.case_information_requested',sellerLink,shortId);
      }else if(['CasePublicMessage.v1','CaseDecisionPublished.v1','CaseAppealUpdated.v1'].includes(type)){
        if(!uuid.test(String(payload.caseId))||payload.recipientKind&&!['BUYER','SELLER','BOTH'].includes(payload.recipientKind))throw bad(400,'INVALID_EVENT','Thông báo hồ sơ không hợp lệ.');
        if(!payload.recipientKind||['BUYER','BOTH'].includes(payload.recipientKind))add(ctx.buyerId,'buyer.case_updated',buyerLink,shortId);
        if(!payload.recipientKind||['SELLER','BOTH'].includes(payload.recipientKind))for(const id of await this.members(ctx.storeId))add(id,'seller.case_updated',sellerLink,shortId);
      }
    }else if(source==='payment'){
      if(type==='PaymentSucceeded.v1'){
        const ctx=await this.orderGroup(payload.groupId);
        add(ctx.buyerId,'buyer.payment_succeeded',`/orders/${ctx.groupId}`,ctx.groupId.slice(0,8));
        for(const shop of ctx.orders)for(const id of await this.members(shop.storeId))
          add(id,'seller.payment_succeeded',`/mystore/orders/${shop.shopOrderId}`,
            shop.shopOrderId.slice(0,8));
      }else if(type==='RefundSucceeded.v1'){
        const ctx=await this.orderShop(payload.shopOrderId);
        if(payload.groupId!==ctx.groupId)throw bad(409,'EVENT_CONTEXT_MISMATCH','Sự kiện không khớp đơn.');
        add(ctx.buyerId,'buyer.refund_succeeded',`/orders/${ctx.groupId}`,ctx.shopOrderId.slice(0,8));
      }
    }else if(source==='chat'&&type==='ChatMessageSent.v1'){
      if(!mongoId.test(String(payload.conversationId))||!uuid.test(String(payload.buyerId))||
        !uuid.test(String(payload.storeId))||!uuid.test(String(payload.senderId)))
        throw bad(400,'INVALID_EVENT','Sự kiện chat không hợp lệ.');
      const link=`/messages/${payload.conversationId}`,shortId=payload.conversationId.slice(0,8);
      if(payload.senderId===payload.buyerId){
        for(const id of await this.members(payload.storeId))
          if(id!==payload.senderId)add(id,'seller.chat_message',link,shortId);
      }else add(payload.buyerId,'buyer.chat_message',link,shortId);
    }
    return targets;
  }
  async template(db,key,channel='IN_APP'){
    const row=(await db.query(`SELECT title_template,body_template FROM engagement.notification_templates
      WHERE key=$1 AND channel=$2 AND locale='vi-VN' ORDER BY version DESC LIMIT 1`,[key,channel])).rows[0];
    if(!row||/[<>]/.test(row.title_template+row.body_template))
      throw bad(500,'TEMPLATE_UNAVAILABLE','Mẫu thông báo không khả dụng.');
    return row;
  }
  async ingest(source,eventId,event){
    if(!['identity','order','payment','chat'].includes(source)||!eventIdPattern.test(String(eventId))||
      !event||typeof event.type!=='string'||event.type.length>80)
      throw bad(400,'INVALID_EVENT','Sự kiện không hợp lệ.');
    const prior=await this.pool.query(`SELECT 1 FROM engagement.notification_processed_events
      WHERE source=$1 AND event_id=$2`,[source,eventId]);
    if(prior.rowCount)return {duplicate:true,created:0};
    const targets=await this.resolve(source,event);
    const db=await this.pool.connect();const created=[];
    try{await db.query('BEGIN');
      const inserted=await db.query(`INSERT INTO engagement.notification_processed_events(source,event_id)
        VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING event_id`,[source,eventId]);
      if(!inserted.rowCount){await db.query('COMMIT');return {duplicate:true,created:0};}
      for(const target of targets){
        const category=categoryOf(target.key);
        if(category==='CHAT'){
          const pref=(await db.query(`SELECT enabled FROM engagement.notification_preferences
            WHERE user_id=$1 AND channel='IN_APP' AND category='CHAT'`,[target.recipientId])).rows[0];
          if(pref?.enabled===false)continue;
        }
        const template=await this.template(db,target.key);
        const title=template.title_template.replaceAll('{shortId}',target.shortId);
        const message=template.body_template.replaceAll('{shortId}',target.shortId);
        const row=(await db.query(`INSERT INTO engagement.notifications
          (recipient_user_id,source,event_id,template_key,type,title,body,deep_link)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT(source,event_id,recipient_user_id,template_key) DO NOTHING RETURNING *`,
          [target.recipientId,source,eventId,target.key,typeOf(target.key),title,message,target.link])).rows[0];
        if(!row)continue;
        created.push(row);
        const emailPref=category==='CHAT'||category==='SELLER'
          ?(await db.query(`SELECT enabled FROM engagement.notification_preferences
            WHERE user_id=$1 AND channel='EMAIL' AND category=$2`,[target.recipientId,category])).rows[0]?.enabled??category!=='CHAT'
          :true;
        const status=source==='identity'||emailPref===false?'SKIPPED':this.config.transport?'PENDING':'DISABLED';
        await db.query(`INSERT INTO engagement.notification_deliveries(notification_id,channel,status)
          VALUES ($1,'EMAIL',$2) ON CONFLICT DO NOTHING`,[row.id,status]);
      }
      await db.query('COMMIT');
    }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
    for(const row of created)try{
      void Promise.resolve(this.config.emit?.(row.recipient_user_id,serialize(row))).catch(()=>{});
    }catch{}
    return {duplicate:false,created:created.length};
  }
  async list(userId,query={}){
    const limit=query.limit==null?20:Number(query.limit);
    const type=query.type||null,unreadOnly=query.unreadOnly==='true';
    if(!Number.isInteger(limit)||limit<1||limit>50||
      type&&!['order','payment','chat','seller','system','marketing'].includes(type)||
      query.unreadOnly!=null&&!['true','false'].includes(query.unreadOnly))
      throw bad(400,'INVALID_FILTER','Bộ lọc thông báo không hợp lệ.');
    const cursor=query.cursor?decodeNotificationCursor(query.cursor):null;
    if(query.cursor&&!cursor)throw bad(400,'INVALID_CURSOR','Cursor không hợp lệ.');
    const rows=(await this.pool.query(`SELECT * FROM engagement.notifications
      WHERE recipient_user_id=$1 AND ($2::text IS NULL OR type=$2)
      AND ($3::boolean=false OR read_at IS NULL)
      AND ($4::timestamptz IS NULL OR created_at<$4 OR (created_at=$4 AND id<$5::uuid))
      AND expires_at>now()
      ORDER BY created_at DESC,id DESC LIMIT $6`,
      [userId,type,unreadOnly,cursor?.time||null,cursor?.id||null,limit+1])).rows;
    const page=rows.slice(0,limit);
    return {notifications:page.map(serialize),nextCursor:rows.length>limit&&page.length
      ?encodeNotificationCursor(page.at(-1)):null};
  }
  async unreadCount(userId){
    const row=(await this.pool.query(`SELECT count(*)::int AS count FROM engagement.notifications
      WHERE recipient_user_id=$1 AND read_at IS NULL AND expires_at>now()`,[userId])).rows[0];
    return {count:row.count};
  }
  async readOne(userId,id){
    if(!uuid.test(String(id)))throw bad(404,'NOTIFICATION_NOT_FOUND','Không tìm thấy thông báo.');
    const row=(await this.pool.query(`UPDATE engagement.notifications
      SET read_at=coalesce(read_at,now()) WHERE id=$1 AND recipient_user_id=$2 RETURNING *`,
      [id,userId])).rows[0];
    if(!row)throw bad(404,'NOTIFICATION_NOT_FOUND','Không tìm thấy thông báo.');
    return {notification:serialize(row)};
  }
  async readMany(userId,ids){
    if(!Array.isArray(ids)||ids.length<1||ids.length>100||ids.some(id=>!uuid.test(String(id))))
      throw bad(400,'INVALID_IDS','Danh sách thông báo không hợp lệ.');
    const result=await this.pool.query(`UPDATE engagement.notifications SET read_at=now()
      WHERE recipient_user_id=$1 AND id=ANY($2::uuid[]) AND read_at IS NULL`,[userId,ids]);
    return {updated:result.rowCount};
  }
  async readAll(userId){
    const result=await this.pool.query(`UPDATE engagement.notifications SET read_at=now()
      WHERE recipient_user_id=$1 AND read_at IS NULL`,[userId]);
    return {updated:result.rowCount};
  }
  async remove(userId,id){
    if(!uuid.test(String(id)))throw bad(404,'NOTIFICATION_NOT_FOUND','Không tìm thấy thông báo.');
    const result=await this.pool.query(`DELETE FROM engagement.notifications
      WHERE id=$1 AND recipient_user_id=$2`,[id,userId]);
    if(!result.rowCount)throw bad(404,'NOTIFICATION_NOT_FOUND','Không tìm thấy thông báo.');
    return {deleted:true};
  }
  async preferences(userId,bearer){
    const [profile,rows]=await Promise.all([
      this.remote(new URL('/api/v2/users/me',this.config.identityUrl),{headers:{Authorization:bearer}}),
      this.pool.query('SELECT channel,category,enabled FROM engagement.notification_preferences WHERE user_id=$1',[userId]),
    ]);
    const get=(channel,category,defaultValue)=>rows.rows.find(row=>row.channel===channel&&row.category===category)?.enabled??defaultValue;
    return {marketingOptIn:Boolean(profile.marketingOptIn),emailChat:get('EMAIL','CHAT',false),
      emailSeller:get('EMAIL','SELLER',true),webChat:get('IN_APP','CHAT',true),
      essentialEmail:true};
  }
  async setPreferences(userId,bearer,input){
    const keys=['marketingOptIn','emailChat','emailSeller','webChat'];
    if(!input||!Object.keys(input).length||Object.keys(input).some(key=>!keys.includes(key)||
      typeof input[key]!=='boolean'))throw bad(400,'INVALID_PREFERENCES','Cài đặt không hợp lệ.');
    if('marketingOptIn' in input)await this.remote(new URL('/api/v2/users/me/preferences',
      this.config.identityUrl),{method:'PATCH',headers:{Authorization:bearer,
        Origin:this.config.frontendOrigin,'Content-Type':'application/json'},
      body:JSON.stringify({marketingOptIn:input.marketingOptIn})});
    for(const [key,channel,category] of [
      ['emailChat','EMAIL','CHAT'],['emailSeller','EMAIL','SELLER'],['webChat','IN_APP','CHAT']]){
      if(!(key in input))continue;
      await this.pool.query(`INSERT INTO engagement.notification_preferences(user_id,channel,category,enabled)
        VALUES ($1,$2,$3,$4) ON CONFLICT(user_id,channel,category)
        DO UPDATE SET enabled=EXCLUDED.enabled,updated_at=now()`,[userId,channel,category,input[key]]);
    }
    return this.preferences(userId,bearer);
  }
  async identityRecipient(userId){
    return this.remote(new URL(`/api/v2/internal/notification/users/${userId}`,this.config.identityUrl),
      {headers:{'X-Notification-Identity-Token':this.config.identityToken}});
  }
  async deliverEmailOne(){
    if(!this.config.transport)return false;
    const db=await this.pool.connect();
    try{await db.query('BEGIN');
      const row=(await db.query(`SELECT d.*,n.recipient_user_id,n.template_key,n.deep_link
        FROM engagement.notification_deliveries d
        JOIN engagement.notifications n ON n.id=d.notification_id
        WHERE d.status='PENDING' AND d.next_attempt_at<=now()
        ORDER BY d.next_attempt_at,d.id LIMIT 1 FOR UPDATE OF d SKIP LOCKED`)).rows[0];
      if(!row){await db.query('COMMIT');return false;}
      try{
        const recipient=await this.identityRecipient(row.recipient_user_id);
        const category=categoryOf(row.template_key);
        const pref=category==='CHAT'||category==='SELLER'
          ?(await db.query(`SELECT enabled FROM engagement.notification_preferences
            WHERE user_id=$1 AND channel='EMAIL' AND category=$2`,[row.recipient_user_id,category])).rows[0]?.enabled??category!=='CHAT'
          :true;
        if(recipient.status!=='active'||!recipient.email||
          category==='MARKETING'&&!recipient.marketingOptIn||pref===false){
          await db.query(`UPDATE engagement.notification_deliveries SET status='SKIPPED',
            updated_at=now() WHERE id=$1`,[row.id]);
        }else{
          const template=await this.template(db,row.template_key,'EMAIL');
          const shortId=/[0-9a-f]{8}/i.exec(row.deep_link)?.[0]||'00000000';
          const subject=template.title_template.replaceAll('{shortId}',shortId);
          const body=template.body_template.replaceAll('{shortId}',shortId);
          const sent=await this.config.transport.sendMail({from:this.config.mailFrom,to:recipient.email,
            subject,text:`${body}\n\nXem trong tài khoản: ${this.config.frontendOrigin}${row.deep_link}`});
          await db.query(`UPDATE engagement.notification_deliveries SET status='SENT',
            attempts=attempts+1,provider_ref=$2,last_error=NULL,updated_at=now() WHERE id=$1`,
            [row.id,String(sent.messageId||'').slice(0,200)]);
        }
      }catch(error){
        const attempts=row.attempts+1,dead=attempts>=5;
        await db.query(`UPDATE engagement.notification_deliveries
          SET status=$2,attempts=$3,last_error=$4,
          next_attempt_at=now()+($5 * interval '1 second'),updated_at=now()
          WHERE id=$1`,[row.id,dead?'DEAD':'PENDING',attempts,
          String(error.code||error.name||'PROVIDER_ERROR').slice(0,80),
          Math.min(3600,2**attempts*30)]);
      }
      await db.query('COMMIT');return true;
    }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  }
  async metrics(){
    const rows=(await this.pool.query(`SELECT status,count(*)::int AS total FROM engagement.notification_deliveries
      GROUP BY status`)).rows;
    const oldest=(await this.pool.query(`SELECT min(created_at) AS oldest FROM engagement.notification_deliveries
      WHERE status='PENDING'`)).rows[0].oldest;
    const sources=await Promise.allSettled([
      this.config.orderToken?this.remote(new URL('/api/v2/internal/notification/metrics',
        this.config.orderUrl),{headers:{'X-Notification-Order-Token':this.config.orderToken}}):null,
      this.config.paymentToken?this.remote(new URL('/api/v2/internal/notification/metrics',
        this.config.paymentUrl),{headers:{'X-Payment-Notification-Token':this.config.paymentToken}}):null,
      this.config.chatToken?this.remote(new URL('/api/v2/internal/notification/metrics',
        this.config.chatUrl),{headers:{'X-Chat-Event-Token':this.config.chatToken}}):null,
    ]);
    return {deliveries:Object.fromEntries(rows.map(row=>[row.status,row.total])),oldestPendingAt:oldest,
      sources:Object.fromEntries(['order','payment','chat'].map((name,index)=>[name,
        sources[index].status==='fulfilled'?(sources[index].value||{status:'disabled'}):{status:'unavailable'}]))};
  }
  async cleanup(){
    const removed=await this.pool.query('DELETE FROM engagement.notifications WHERE expires_at<now()');
    await this.pool.query(`DELETE FROM engagement.notification_processed_events
      WHERE processed_at<now()-interval '365 days'`);
    return {removed:removed.rowCount};
  }
}
