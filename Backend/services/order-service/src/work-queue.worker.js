export class WorkQueueWorker {
  constructor(order){this.order=order;this.pool=order.pool;this.running=false;}
  async local() {
    await this.pool.query(`INSERT INTO order_service.work_items(kind,source_id,shop_order_id,store_id,title,source_status,priority,created_at,response_due_at)
      SELECT 'ORDER',o.id::text,o.id,o.store_id,'Đơn quá hạn #'||left(o.id::text,8),o.status,'HIGH',o.created_at,now()+make_interval(mins=>p.response_minutes)
      FROM order_service.orders o CROSS JOIN order_service.work_sla_policies p
      WHERE p.kind='ORDER' AND o.status IN ('PLACED','CONFIRMED','PREPARING','READY_TO_SHIP')
        AND o.created_at+make_interval(mins=>p.resolution_minutes)<now()
      ON CONFLICT(kind,source_id) DO NOTHING`);
    await this.pool.query(`UPDATE order_service.work_items w SET source_status=o.status,
      source_active=o.status IN ('PLACED','CONFIRMED','PREPARING','READY_TO_SHIP')
      FROM order_service.orders o WHERE w.kind='ORDER' AND w.shop_order_id=o.id AND
        (w.source_status IS DISTINCT FROM o.status OR w.source_active IS DISTINCT FROM (o.status IN ('PLACED','CONFIRMED','PREPARING','READY_TO_SHIP')))`);
    // A refund can need attention before Payment has accepted/created a refund row (including COD).
    await this.pool.query(`INSERT INTO order_service.work_items(kind,source_id,shop_order_id,store_id,case_kind,title,source_status,priority,source_details,created_at)
      SELECT 'REFUND','return:'||r.id::text,r.shop_order_id,o.store_id,'RETURN','Hoàn tiền trả hàng #'||left(r.id::text,8),
        'AWAITING_VERIFICATION','HIGH',jsonb_build_object('returnId',r.id),r.updated_at
      FROM order_service.return_requests r JOIN order_service.orders o ON o.id=r.shop_order_id
      WHERE r.status='REFUND_PENDING' AND r.refund_reference IS NULL
      ON CONFLICT(kind,source_id) DO NOTHING`);
    await this.pool.query(`UPDATE order_service.work_items w SET source_active=(r.status='REFUND_PENDING' AND r.refund_reference IS NULL)
      FROM order_service.return_requests r WHERE w.kind='REFUND' AND w.source_id='return:'||r.id::text
        AND w.source_active IS DISTINCT FROM (r.status='REFUND_PENDING' AND r.refund_reference IS NULL)`);
    await this.pool.query("UPDATE order_service.work_source_health SET updated_at=now(),error_code=NULL WHERE source IN ('orders','cases')");
  }
  async source(source) {
    const token=process.env.ADMIN_AUTHORIZATION_TOKEN;
    if(!token)throw Object.assign(Error('Missing authorization'),{code:'NOT_CONFIGURED'});
    const base=source==='payment'?(process.env.ORDER_PAYMENT_URL||'http://127.0.0.1:5104'):(process.env.ORDER_CHAT_URL||'http://127.0.0.1:5106');
    let after='';
    do {
      const url=new URL('/api/v2/internal/admin-queue',base);if(after)url.searchParams.set('after',after);
      const data=await this.order.remote(url,{headers:{'X-Admin-Authorization-Token':token}});
      if(!Array.isArray(data.items)||data.next&&data.next===after)throw Error('Invalid queue feed');
      for(const item of data.items) {
        if(source==='payment') {
          await this.pool.query(`INSERT INTO order_service.work_items(kind,source_id,shop_order_id,store_id,title,source_status,source_active,priority,created_at,source_details,case_kind)
            SELECT 'REFUND',$1,o.id,o.store_id,'Hoàn tiền #'||left($1,8),$3,$4,'HIGH',$5::timestamptz,$6,CASE WHEN $7::uuid IS NULL THEN NULL ELSE 'RETURN' END
            FROM order_service.orders o WHERE o.id=$2
            ON CONFLICT(kind,source_id) DO UPDATE SET source_status=EXCLUDED.source_status,source_active=EXCLUDED.source_active
            WHERE work_items.source_status IS DISTINCT FROM EXCLUDED.source_status OR work_items.source_active IS DISTINCT FROM EXCLUDED.source_active`,
          [item.sourceId,item.shopOrderId,item.status,item.active,item.createdAt,{returnId:item.returnId||undefined},item.returnId||null]);
        } else {
          await this.pool.query(`INSERT INTO order_service.work_items(kind,source_id,store_id,title,source_status,source_active,source_details,created_at)
            VALUES('ABUSE_REPORT',$1,$2,'Báo cáo vi phạm #'||left($1,8),$3,$4,$5,$6)
            ON CONFLICT(kind,source_id) DO UPDATE SET source_status=EXCLUDED.source_status,source_active=EXCLUDED.source_active
            WHERE work_items.source_status IS DISTINCT FROM EXCLUDED.source_status OR work_items.source_active IS DISTINCT FROM EXCLUDED.source_active`,
          [item.sourceId,item.storeId,item.status,item.active,{reason:item.reason,conversationId:item.conversationId,messageId:item.messageId},item.createdAt]);
        }
      }
      after=data.next;
    } while(after);
    await this.pool.query('UPDATE order_service.work_source_health SET updated_at=now(),error_code=NULL WHERE source=$1',[source]);
  }
  async reminders() {
    // Each timestamp is a distinct SLA milestone. Concurrent workers cannot duplicate notifications.
    await this.order.transaction(async db=>{
      await db.query(`INSERT INTO order_service.work_notifications(work_id,recipient_id,milestone,due_at)
        SELECT w.id,recipient.id,m.phase||'_'||CASE WHEN m.due<now() THEN 'overdue' ELSE 'reminder' END,m.due
        FROM order_service.work_items w JOIN order_service.work_teams t ON t.id=w.team_id
        CROSS JOIN LATERAL (VALUES ('response',CASE WHEN w.first_response_at IS NULL THEN w.response_due_at END),
          ('resolution',CASE WHEN w.paused_at IS NULL THEN w.resolution_due_at END)) m(phase,due)
        CROSS JOIN LATERAL (SELECT w.assignee_id AS id UNION SELECT t.leader_id WHERE m.due<now()) recipient
        WHERE w.source_active AND w.state<>'RESOLVED' AND recipient.id IS NOT NULL AND m.due IS NOT NULL
          AND m.due<=now()+make_interval(mins=>w.reminder_minutes)
        ON CONFLICT(work_id,recipient_id,milestone,due_at) DO NOTHING`);
      const escalated=await db.query(`UPDATE order_service.work_items w SET escalation_level=1
        WHERE w.source_active AND w.state<>'RESOLVED' AND w.escalation_level=0 AND
          ((w.first_response_at IS NULL AND w.response_due_at<now()) OR (w.paused_at IS NULL AND w.resolution_due_at<now())) RETURNING w.id`);
      for(const row of escalated.rows)await db.query(`INSERT INTO order_service.work_events(work_id,action,reason)
        VALUES($1,'sla_escalated','Quá hạn SLA; chuyển cấp cho trưởng nhóm đã cấu hình.')`,[row.id]);
    });
  }
  async run(source) {
    if(this.running)return {running:true};this.running=true;
    try {
      const sources=source?[source]:['orders','payment','chat'];
      const results=await Promise.allSettled(sources.map(async name=>{
        try{if(['orders','cases'].includes(name))await this.local();else await this.source(name);}
        catch(error){await this.pool.query('UPDATE order_service.work_source_health SET error_code=$2 WHERE source=$1',[name,error.code==='NOT_CONFIGURED'?'NOT_CONFIGURED':'SOURCE_UNAVAILABLE']);throw error;}
      }));
      await this.reminders();
      return {sources:sources.map((name,index)=>({source:name,ok:results[index].status==='fulfilled'}))};
    }finally{this.running=false;}
  }
}
