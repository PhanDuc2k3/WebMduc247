import {randomUUID} from 'node:crypto';
import {adminId,adminMutation,checkAdminVersion,PlatformAdminError} from '../../../packages/contracts/platform-admin.js';
import {requireAdminScope,requireAdminPermission,adminScopeSql} from '../../../packages/contracts/admin-rbac.js';
import {adminCommand} from '../../../packages/contracts/admin-command.js';

const fail=(code,message,status=409)=>{throw new PlatformAdminError(status,code,message);};
export const PRODUCT_BULK_LIMIT=200, PRODUCT_JOB_CHUNK=20;
export const RULE_GROUPS=['MISLEADING','PROHIBITED','INAPPROPRIATE_IMAGE','COUNTERFEIT','SPAM','REMEDIATION'];
export function evidenceInput(value=[]) {
  if(!Array.isArray(value)||value.length>10||value.some(item=>typeof item!=='string'||item.length>2000||!/^https?:\/\//i.test(item)))
    fail('INVALID_EVIDENCE','Bằng chứng gồm tối đa 10 liên kết HTTP/HTTPS.',400);
  for(const item of value){try{const url=new URL(item);if(url.username||url.password||!url.hostname)throw Error();}catch{fail('INVALID_EVIDENCE','Liên kết bằng chứng không hợp lệ.',400);}}
  return value;
}
export function productCommand(input) {
  const extras={suspend:[],restore:[],request_changes:['remedyBy'],confirm_remedy:['decisionId'],review_appeal:['appealId','outcome'],review_publication:['outcome','remedyBy']};
  if(!input||!extras[input.action]||Object.keys(input).some(key=>!['action','reason','version','requestId','reasonCode','evidence','reportIds',...extras[input.action]].includes(key)))
    fail('INVALID_COMMAND','Thao tác kiểm duyệt không hợp lệ.',400);
  const command={...input,...adminMutation(input),evidence:evidenceInput(input.evidence)};
  if(typeof input.reasonCode!=='string'||!/^[A-Z][A-Z0-9_]{2,59}$/.test(input.reasonCode))fail('REASON_CODE_REQUIRED','Chọn mã lý do chuẩn.',400);
  if(!Array.isArray(input.reportIds??[])||(input.reportIds??[]).length>20)fail('INVALID_REPORT','Tối đa 20 mã báo cáo.',400);
  command.reportIds=(input.reportIds??[]).map(adminId);
  if(input.action==='request_changes'||input.action==='review_publication'&&input.outcome==='NEEDS_CHANGES'){
    const deadline=Date.parse(input.remedyBy);
    if(!Number.isFinite(deadline))fail('INVALID_DEADLINE','Hạn khắc phục không hợp lệ.',400);
    command.remedyBy=new Date(deadline).toISOString();
  }
  if(input.action==='confirm_remedy')adminId(input.decisionId);
  if(input.action==='review_appeal'){
    adminId(input.appealId);if(!['UPHELD','OVERTURNED'].includes(input.outcome))fail('INVALID_OUTCOME','Kết quả xét lại không hợp lệ.',400);
  }
  if(input.action==='review_publication'&&!['APPROVED','NEEDS_CHANGES'].includes(input.outcome))fail('INVALID_OUTCOME','Chọn duyệt hoặc yêu cầu sửa.',400);
  return command;
}
export function revisionDiff(before={},after={}) {
  return ['name','description','categoryId','brand','brandId','specifications','images','imageUrl','variants','attributes','priceMinor','status']
    .filter(key=>JSON.stringify(before[key])!==JSON.stringify(after[key]))
    .map(field=>({field,before:before[field]??null,after:after[field]??null}));
}
export class ProductModerationService {
  constructor(stores,catalog){this.stores=stores;this.pool=stores.pool;this.catalog=catalog;}
  async target(db,actor,id,permission='products.read',lock=false){
    requireAdminPermission(actor,permission);adminId(id);
    const row=(await db.query(`SELECT p.*,s.owner_user_id FROM catalog.products p JOIN catalog.stores s ON s.id=p.store_id
      WHERE p.id=$1${lock?' FOR UPDATE OF p FOR SHARE OF s':''}`,[id])).rows[0];
    if(!row)fail('NOT_FOUND','Không tìm thấy sản phẩm.',404);
    requireAdminScope(actor,permission,{storeId:row.store_id});return row;
  }
  async rules(actor){
    // Scoped staff can read the shared rule catalog; only global moderators can change it.
    requireAdminPermission(actor,'products.read');
    const policy=(await this.pool.query('SELECT * FROM catalog.product_review_policy WHERE id=true')).rows[0];
    return {items:(await this.pool.query('SELECT * FROM catalog.product_rules ORDER BY violation_group,code')).rows,
      policy:{prePublicationReview:policy.approval_required,version:Number(policy.version),
        reapprovalFields:['name','description','category','brand','images','variants','attributes','price'],bulkLimit:PRODUCT_BULK_LIMIT,jobChunk:PRODUCT_JOB_CHUNK,signalsAreDecisions:false}};
  }
  async savePolicy(actor,input){
    requireAdminScope(actor,'products.moderate',{});
    if(!input||Object.keys(input).some(k=>!['approvalRequired','version','reason','requestId'].includes(k))||typeof input.approvalRequired!=='boolean')fail('INVALID_POLICY','Chính sách không hợp lệ.',400);
    const cmd={...input,...adminMutation(input)};
    return this.stores.transaction(db=>adminCommand(db,'catalog',actor,'product-review-policy',cmd,async()=>{
      const previous=(await db.query('SELECT * FROM catalog.product_review_policy WHERE id=true FOR UPDATE')).rows[0];
      if(Number(previous.version)!==cmd.version)fail('VERSION_CONFLICT','Chính sách đã thay đổi. Hãy tải lại.');
      const next=(await db.query('UPDATE catalog.product_review_policy SET approval_required=$1,version=version+1 WHERE id=true RETURNING *',[cmd.approvalRequired])).rows[0];
      await db.query('INSERT INTO catalog.product_review_policy_audit(actor_id,reason,previous_policy,next_policy) VALUES($1,$2,$3,$4)',[actor.id,cmd.reason,previous,next]);
      return {approvalRequired:next.approval_required,version:Number(next.version)};
    }));
  }
  async saveRule(actor,input){
    requireAdminScope(actor,'products.moderate',{});
    if(!input||Object.keys(input).some(key=>!['code','group','label','description','enabled','reason','version','requestId'].includes(key))||
      !/^[A-Z][A-Z0-9_]{2,59}$/.test(input.code)||!RULE_GROUPS.includes(input.group)||typeof input.label!=='string'||input.label.trim().length<3||input.label.length>200||
      typeof input.description!=='string'||input.description.length>2000||typeof input.enabled!=='boolean')fail('INVALID_RULE','Quy tắc không hợp lệ.',400);
    const cmd={...input,...adminMutation(input)};
    return this.stores.transaction(db=>adminCommand(db,'catalog',actor,'product-rule',cmd,async()=>{
      await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`product-rule:${cmd.code}`]);
      const previous=(await db.query('SELECT * FROM catalog.product_rules WHERE code=$1 FOR UPDATE',[cmd.code])).rows[0];
      if(Number(previous?.version??0)!==cmd.version)fail('VERSION_CONFLICT','Quy tắc đã thay đổi. Hãy tải lại.');
      const rule=(await db.query(`INSERT INTO catalog.product_rules(code,violation_group,label,description,enabled,version) VALUES($1,$2,$3,$4,$5,1)
        ON CONFLICT(code) DO UPDATE SET violation_group=$2,label=$3,description=$4,enabled=$5,version=catalog.product_rules.version+1 RETURNING *`,
        [cmd.code,cmd.group,cmd.label.trim(),cmd.description,cmd.enabled])).rows[0];
      await db.query('INSERT INTO catalog.product_rule_audit(actor_id,reason,code,previous_rule,next_rule) VALUES($1,$2,$3,$4,$5)',[actor.id,cmd.reason,cmd.code,previous||null,rule]);
      return {rule:{...rule,version:Number(rule.version)}};
    }));
  }
  async data(db,id){
    const definitions={decisions:'SELECT * FROM catalog.product_decisions WHERE product_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100',
      reports:'SELECT id,product_id,reason_code,reason,evidence,decision_id,created_at FROM catalog.product_reports WHERE product_id=$1 ORDER BY created_at DESC LIMIT 100',
      revisions:'SELECT * FROM catalog.product_revisions WHERE product_id=$1 ORDER BY version DESC LIMIT 50',
      appeals:'SELECT * FROM catalog.product_appeals WHERE product_id=$1 ORDER BY created_at DESC LIMIT 100',
      remedies:'SELECT r.*,d.remedy_by FROM catalog.product_remedies r JOIN catalog.product_decisions d ON d.id=r.decision_id WHERE d.product_id=$1 ORDER BY d.created_at DESC LIMIT 100',
      notices:'SELECT n.* FROM catalog.product_seller_notices n JOIN catalog.stores s ON s.owner_user_id=n.recipient_id JOIN catalog.products p ON p.store_id=s.id AND p.id=n.product_id WHERE n.product_id=$1 ORDER BY n.id DESC LIMIT 100'};
    const result={};
    // A transaction owns one PostgreSQL connection; do not enqueue concurrent queries on it.
    for(const [key,sql] of Object.entries(definitions))result[key]=(await db.query(sql,[id])).rows;
    return result;
  }
  async read(actor,id){
    return this.stores.transaction(async db=>{
      const row=await this.target(db,actor,id,'products.read',true), data=await this.data(db,id);
      const snapshot=(await db.query('SELECT catalog.product_snapshot($1) AS snapshot',[id])).rows[0].snapshot;
      return {...data,record:await this.catalog.detail(row),version:Number(row.admin_version),snapshot,
        comparisonImages:await this.snapshotImages(data.decisions[0]?.snapshot),
        changesSinceDecision:data.decisions[0]?revisionDiff(data.decisions[0].snapshot,snapshot):[],
        supportPath:`/admin/cases?productId=${id}`,policy:{prePublicationReview:(await db.query('SELECT approval_required FROM catalog.product_review_policy WHERE id=true')).rows[0].approval_required}};
    });
  }
  async snapshotImages(snapshot){
    if(!snapshot)return [];
    const images=await Promise.all((snapshot.images||[]).map(async image=>({id:image.id,url:await this.catalog.imageUrl(image.object_key)})));
    return images.length?images:snapshot.imageUrl?[{id:'legacy',url:snapshot.imageUrl}]:[];
  }
  async revision(actor,id,version){
    await this.target(this.pool,actor,id);
    if(!/^\d{1,16}$/.test(String(version)))fail('INVALID_VERSION','Phiên bản không hợp lệ.',400);
    const row=(await this.pool.query('SELECT * FROM catalog.product_revisions WHERE product_id=$1 AND version=$2',[id,version])).rows[0];
    if(!row)fail('NOT_FOUND','Không tìm thấy phiên bản.',404);
    return {...row,images:await this.snapshotImages(row.snapshot)};
  }
  async notify(db,row,actor,cmd,snapshot,rule,action=cmd.action){
    const decision=(await db.query(`INSERT INTO catalog.product_decisions(product_id,product_version,actor_id,recipient_id,action,reason_code,rule_snapshot,reason,evidence,report_ids,snapshot,remedy_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,[row.id,row.admin_version,actor.id,row.owner_user_id,action,cmd.reasonCode,rule,
      cmd.reason,JSON.stringify(cmd.evidence),JSON.stringify(cmd.reportIds),snapshot,cmd.remedyBy||null])).rows[0];
    await db.query('INSERT INTO catalog.product_seller_notices(decision_id,recipient_id,product_id,title,body) VALUES($1,$2,$3,$4,$5)',
      [decision.id,row.owner_user_id,row.id,`Kiểm duyệt sản phẩm: ${rule.label}`,`${cmd.reason}${cmd.remedyBy?` Hạn khắc phục: ${cmd.remedyBy}.`:''} Xem quyết định và kháng nghị tại trang chỉnh sửa sản phẩm.`]);
    await db.query('INSERT INTO catalog.store_outbox(event_type,payload) VALUES($1,$2)',
      ['ProductModerationDecided.v1',{productId:row.id,storeId:row.store_id,recipientId:row.owner_user_id,decisionId:decision.id,action,reasonCode:cmd.reasonCode,reason:cmd.reason}]);
    return decision;
  }
  async command(actor,id,input,bearer){
    const cmd=productCommand(input);
    await this.target(this.pool,actor,id,'products.moderate');
    return this.stores.transaction(async db=>{
      const row=await this.target(db,actor,id,'products.moderate',true);
      return adminCommand(db,'catalog',actor,`product-moderation:${id}`,cmd,async()=>{
        checkAdminVersion(row,cmd);
        if(cmd.remedyBy&&(Date.parse(cmd.remedyBy)<=Date.now()||Date.parse(cmd.remedyBy)>Date.now()+90*86400000))
          fail('INVALID_DEADLINE','Hạn khắc phục phải trong 90 ngày tới.',400);
        if(cmd.reportIds.length){
          const reports=await db.query('SELECT id FROM catalog.product_reports WHERE product_id=$1 AND id=ANY($2::uuid[]) FOR UPDATE',[id,cmd.reportIds]);
          if(reports.rowCount!==new Set(cmd.reportIds).size)fail('INVALID_REPORT','Báo cáo không thuộc sản phẩm này.',400);
        }
        const rule=(await db.query('SELECT * FROM catalog.product_rules WHERE code=$1 AND enabled=true FOR SHARE',[cmd.reasonCode])).rows[0];
        if(!rule)fail('RULE_DISABLED','Mã lý do đã bị tắt hoặc không tồn tại.',400);
        if(['suspend','request_changes'].includes(cmd.action)&&rule.violation_group==='REMEDIATION')fail('INVALID_RULE','Chọn quy tắc vi phạm phù hợp.',400);
        if(cmd.action==='review_publication'&&row.review_status!=='PENDING')fail('NOT_PENDING_REVIEW','Sản phẩm không đang chờ duyệt.');
        const snapshot=(await db.query('SELECT catalog.product_snapshot($1) AS snapshot',[id])).rows[0].snapshot;
        let action=cmd.action,appeal=null;
        if(action==='review_appeal'){
          appeal=(await db.query(`SELECT a.*,d.actor_id AS decision_actor,d.action AS original_action FROM catalog.product_appeals a
            JOIN catalog.product_decisions d ON d.id=a.decision_id WHERE a.id=$1 AND a.product_id=$2 FOR UPDATE OF a`,[cmd.appealId,id])).rows[0];
          if(!appeal||appeal.status!=='PENDING')fail('INVALID_APPEAL','Kháng nghị không còn chờ xét.');
          if(appeal.decision_actor===actor.id)fail('INDEPENDENT_REVIEW_REQUIRED','Người xét kháng nghị phải khác người ra quyết định.');
          if(cmd.outcome==='OVERTURNED'&&appeal.original_action==='suspend'){
            if(row.current_product_decision_id!==appeal.decision_id)fail('SUPERSEDED_DECISION','Kháng nghị này không thể gỡ quyết định chặn mới hơn.');
            action='restore';
          }
          if(cmd.outcome==='OVERTURNED'&&appeal.original_action==='publication_changes_requested'&&row.current_publication_decision_id!==appeal.decision_id)
            fail('SUPERSEDED_DECISION','Kháng nghị này không thể thay thế lần duyệt đăng bán mới hơn.');
        }
        if(action==='suspend'&&row.platform_suspended||action==='restore'&&!row.platform_suspended)fail('INVALID_TRANSITION','Trạng thái không phù hợp với thao tác.');
        if(action==='restore'&&['active','published'].includes(row.seller_status)||cmd.action==='review_publication'&&cmd.outcome==='APPROVED'&&['active','published'].includes(row.seller_status)){
          if(!(await db.query("SELECT 1 FROM catalog.product_variants WHERE product_id=$1 AND status='active' LIMIT 1",[id])).rowCount)
            fail('VARIANT_REQUIRED','Cần ít nhất một biến thể hoạt động để khôi phục đăng bán.');
        }
        if(cmd.action==='confirm_remedy'){
          const result=await db.query(`UPDATE catalog.product_remedies r SET status='CONFIRMED',confirmed_at=now()
            FROM catalog.product_decisions d WHERE r.decision_id=d.id AND d.product_id=$1 AND r.decision_id=$2 AND r.status='SUBMITTED'`,[id,cmd.decisionId]);
          if(!result.rowCount)fail('REMEDY_NOT_SUBMITTED','Seller chưa gửi xác nhận khắc phục.');
        }
        const decisionAction=cmd.action==='review_publication'?(cmd.outcome==='APPROVED'?'publication_approved':'publication_changes_requested'):
          appeal?cmd.outcome==='OVERTURNED'?'appeal_overturned':'appeal_upheld':cmd.action;
        const decision=await this.notify(db,row,actor,cmd,snapshot,rule,decisionAction);
        if(cmd.reportIds.length)await db.query('UPDATE catalog.product_reports SET decision_id=$2 WHERE id=ANY($1::uuid[])',[cmd.reportIds,decision.id]);
        if(cmd.action==='request_changes'||cmd.action==='review_publication'&&cmd.outcome==='NEEDS_CHANGES')await db.query('INSERT INTO catalog.product_remedies(decision_id) VALUES($1)',[decision.id]);
        if(appeal)await db.query('UPDATE catalog.product_appeals SET status=$2,review_decision_id=$3 WHERE id=$1',[appeal.id,cmd.outcome,decision.id]);
        if(appeal&&cmd.outcome==='OVERTURNED')await db.query("UPDATE catalog.product_remedies SET status='OVERTURNED' WHERE decision_id=$1",[appeal.decision_id]);
        if(action==='suspend'||action==='restore'){
          const suspended=action==='suspend',status=suspended?'hidden':row.platform_previous_status||'hidden';
          const updated=(await db.query(`UPDATE catalog.products SET platform_suspended=$2,platform_suspension_reason=$3,status=$4,platform_previous_status=$5,
            current_product_decision_id=$6,updated_at=now() WHERE id=$1 RETURNING status`,[id,suspended,suspended?cmd.reason:null,status,suspended?row.seller_status:null,suspended?decision.id:null])).rows[0];
          await db.query(`INSERT INTO catalog.platform_admin_actions(actor_id,target_id,target_type,action,previous_status,next_status,reason,read_version,result_version,correlation_id)
            VALUES($1,$2,'product',$3,$4,$5,$6,$7,$8,$9)`,[actor.id,id,action,row.platform_suspended?'suspended':row.status,suspended?'suspended':updated.status,cmd.reason,cmd.version,cmd.version+1,cmd.requestId]);
        }else if(cmd.action==='review_publication')await db.query(`UPDATE catalog.products SET review_status=$2,current_publication_decision_id=$3,
          approved_content_version=CASE WHEN $2='APPROVED' THEN review_content_version ELSE approved_content_version END,updated_at=now() WHERE id=$1`,[id,cmd.outcome,decision.id]);
        else if(appeal&&appeal.original_action==='publication_changes_requested'&&cmd.outcome==='OVERTURNED')
          await db.query("UPDATE catalog.products SET review_status='PENDING',updated_at=now() WHERE id=$1",[id]);
        else await db.query('UPDATE catalog.products SET updated_at=now() WHERE id=$1',[id]);
        await db.query('INSERT INTO catalog.store_outbox(event_type,payload) VALUES($1,$2)',['ProductUpdated.v1',{productId:id,storeId:row.store_id}]);
        return {id,decisionId:decision.id,version:cmd.version+1};
      });
    });
  }
  async sellerRead(user,id){
    const store=await this.catalog.ownerStoreOfProduct(id,user.id);
    const data=await this.data(this.pool,id);
    // A new owner cannot read appeals or personal notices of the previous owner.
    const owner=(await this.pool.query('SELECT owner_user_id FROM catalog.stores WHERE id=$1',[store.store_id])).rows[0];
    return {...data,reports:[],appeals:data.appeals.filter(a=>a.seller_id===user.id),notices:data.notices.filter(n=>n.recipient_id===owner.owner_user_id)};
  }
  async report(user,id,input){
    adminId(id);
    if(!input||Object.keys(input).some(k=>!['reasonCode','reason','evidence','requestId'].includes(k)))fail('INVALID_REPORT','Báo cáo không hợp lệ.',400);
    const cmd={...input,...adminMutation({...input,version:0}),evidence:evidenceInput(input.evidence)};
    // Reports can only be opened for publicly visible products.
    return this.stores.transaction(db=>adminCommand(db,'catalog',user,`product-report:${id}`,cmd,async()=>{
      await this.catalog.publicProduct(id);
      const rule=(await db.query("SELECT code FROM catalog.product_rules WHERE code=$1 AND enabled=true AND violation_group<>'REMEDIATION'",[cmd.reasonCode])).rows[0];
      if(!rule)fail('INVALID_RULE','Mã vi phạm không hợp lệ.',400);
      const count=(await db.query("SELECT count(*)::int AS total FROM catalog.product_reports WHERE reporter_id=$1 AND created_at>now()-interval '1 hour'",[user.id])).rows[0].total;
      if(count>=10)fail('RATE_LIMIT','Bạn đã gửi quá nhiều báo cáo. Vui lòng thử lại sau.',429);
      return (await db.query('INSERT INTO catalog.product_reports(product_id,reporter_id,reason_code,reason,evidence,request_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
        [id,user.id,cmd.reasonCode,cmd.reason,JSON.stringify(cmd.evidence),cmd.requestId])).rows[0];
    }));
  }
  async sellerCommand(user,id,input){
    if(!input||!['appeal','submit_remedy'].includes(input.action)||Object.keys(input).some(k=>!['action','decisionId','version','reason','requestId','evidence'].includes(k)))fail('INVALID_COMMAND','Yêu cầu không hợp lệ.',400);
    const cmd={...input,...adminMutation(input),evidence:evidenceInput(input.evidence)};adminId(cmd.decisionId);
    return this.stores.transaction(async db=>{
      const store=await this.catalog.ownerStoreOfProduct(id,user.id,db);await db.query('SELECT id FROM catalog.products WHERE id=$1 FOR UPDATE',[id]);
      return adminCommand(db,'catalog',user,`seller-product:${id}`,cmd,async()=>{
        const row=(await db.query('SELECT * FROM catalog.products WHERE id=$1',[id])).rows[0];checkAdminVersion(row,cmd);
        const decision=(await db.query('SELECT * FROM catalog.product_decisions WHERE id=$1 AND product_id=$2',[cmd.decisionId,id])).rows[0];
        if(!decision)fail('NOT_FOUND','Không tìm thấy quyết định.',404);
        // Owner or delegated staff can submit remediation; appeals belong to the notified owner.
        if(cmd.action==='appeal'&&decision.recipient_id!==user.id)fail('FORBIDDEN','Chỉ người nhận quyết định được gửi kháng nghị.',403);
        if(cmd.action==='submit_remedy'){
          const changed=await db.query(`UPDATE catalog.product_remedies SET status='SUBMITTED',submitted_version=$2,seller_note=$3,submitted_at=now()
            WHERE decision_id=$1 AND status IN ('OPEN','SUBMITTED')`,[decision.id,row.admin_version,cmd.reason]);
          if(!changed.rowCount)fail('INVALID_REMEDY','Yêu cầu khắc phục đã đóng hoặc không tồn tại.');
          return {id:decision.id,storeId:store.store_id};
        }
        if(!['suspend','request_changes','publication_changes_requested'].includes(decision.action))fail('INVALID_APPEAL','Quyết định này không thuộc diện kháng nghị.');
        if((await db.query('SELECT 1 FROM catalog.product_appeals WHERE decision_id=$1 AND seller_id=$2',[decision.id,user.id])).rowCount)
          fail('DUPLICATE_APPEAL','Đã có kháng nghị cho quyết định này.');
        const snapshot=(await db.query('SELECT catalog.product_snapshot($1) AS snapshot',[id])).rows[0].snapshot;
        return (await db.query(`INSERT INTO catalog.product_appeals(product_id,decision_id,product_version,snapshot,seller_id,reason,evidence)
          VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[id,decision.id,row.admin_version,snapshot,user.id,cmd.reason,JSON.stringify(cmd.evidence)])).rows[0];
      });
    });
  }
  async preview(actor,input){
    requireAdminPermission(actor,'products.moderate');
    if(!input||Object.keys(input).some(k=>!['items','command'].includes(k))||!Array.isArray(input.items)||!input.items.length||input.items.length>PRODUCT_BULK_LIMIT||
      new Set(input.items.map(i=>i.id)).size!==input.items.length)fail('INVALID_SELECTION',`Chọn rõ từ 1 đến ${PRODUCT_BULK_LIMIT} sản phẩm, không trùng lặp.`,400);
    const command=productCommand({...input.command,version:0,requestId:randomUUID()});
    if(!['suspend','restore'].includes(command.action)||command.reportIds.length)fail('INVALID_BULK_ACTION','Hàng loạt chỉ hỗ trợ ẩn/khôi phục, không gắn chung báo cáo.',400);
    const items=[];
    for(const item of input.items){
      if(Object.keys(item).some(k=>!['id','version'].includes(k)))fail('INVALID_SELECTION','Danh sách chọn không hợp lệ.',400);
      adminId(item.id);if(!Number.isSafeInteger(item.version)||item.version<0)fail('INVALID_SELECTION','Thiếu phiên bản sản phẩm.',400);
      try{const row=await this.target(this.pool,actor,item.id,'products.moderate');checkAdminVersion(row,item);
        if(row.platform_suspended===(command.action==='suspend'))fail('INVALID_TRANSITION','Trạng thái không phù hợp.');
        items.push({id:item.id,version:item.version,name:row.name,eligible:true,requestId:randomUUID()});
      }catch(error){if(!(error instanceof PlatformAdminError))throw error;items.push({id:item.id,version:item.version,eligible:false,error:error.code,message:error.message});}
    }
    const preview=(await this.pool.query('INSERT INTO catalog.product_bulk_previews(actor_id,command,items) VALUES($1,$2,$3) RETURNING id',[actor.id,command,JSON.stringify(items)])).rows[0];
    return {...preview,items,command,expiresInSeconds:900};
  }
  async createJob(actor,input){
    requireAdminPermission(actor,'products.moderate');
    // Per-record scope is rechecked by the worker; creating a job exposes only its owner's preview.
    adminId(input?.previewId);
    return this.stores.transaction(async db=>{
      const p=(await db.query('SELECT * FROM catalog.product_bulk_previews WHERE id=$1 AND actor_id=$2 FOR UPDATE',[input.previewId,actor.id])).rows[0];
      if(!p)fail('NOT_FOUND','Không tìm thấy bản xem trước.',404);
      const existing=(await db.query('SELECT * FROM catalog.product_bulk_jobs WHERE preview_id=$1',[p.id])).rows[0];if(existing)return existing;
      if(Date.now()-new Date(p.created_at).getTime()>900000)fail('PREVIEW_EXPIRED','Bản xem trước đã hết hạn.');
      return (await db.query('INSERT INTO catalog.product_bulk_jobs(preview_id,actor_id,command,items) VALUES($1,$2,$3,$4) RETURNING *',
        [p.id,actor.id,p.command,JSON.stringify(p.items.map(i=>({...i,status:i.eligible?'PENDING':'FAILED'})))])).rows[0];
    });
  }
  async job(actor,id,run=false){
    requireAdminPermission(actor,run?'products.moderate':'products.read');adminId(id);
    return this.stores.transaction(async db=>{
      const job=(await db.query(`SELECT * FROM catalog.product_bulk_jobs WHERE id=$1 AND actor_id=$2${run?' FOR UPDATE':''}`,[id,actor.id])).rows[0];
      if(!job)fail('NOT_FOUND','Không tìm thấy job.',404);
      if(!run||job.status==='COMPLETED')return job;
      let count=0;
      for(const item of job.items){if(item.status!=='PENDING'||count++>=PRODUCT_JOB_CHUNK)continue;
        try{const result=await this.command(actor,item.id,{...job.command,version:item.version,requestId:item.requestId});item.status='SUCCEEDED';item.result=result;}
        catch(error){if(!(error instanceof PlatformAdminError))throw error;item.status='FAILED';item.error=error.code;item.message=error.message;}
      }
      job.status=job.items.some(i=>i.status==='PENDING')?'RUNNING':'COMPLETED';
      await db.query('UPDATE catalog.product_bulk_jobs SET items=$2,status=$3,updated_at=now() WHERE id=$1',[id,JSON.stringify(job.items),job.status]);return job;
    });
  }
  async signals(actor,id){
    const row=await this.target(this.pool,actor,id);
    const args=[id,row.name,row.store_id];
    // Candidate visibility obeys the same read scope as the product list.
    const scope=adminScopeSql(actor,'products.read',{storeIds:'p.store_id::text'},args);
    const duplicates=(await this.pool.query(`SELECT p.id,p.name,p.store_id FROM catalog.products p WHERE p.id<>$1
      AND lower(trim(p.name))=lower(trim($2)) AND p.store_id=$3 AND ${scope} ORDER BY p.id LIMIT 10`,args)).rows;
    const imageArgs=[id],imageScope=adminScopeSql(actor,'products.read',{storeIds:'p.store_id::text'},imageArgs);
    const reusedImages=(await this.pool.query(`SELECT DISTINCT p.id,p.name FROM catalog.product_images i
      JOIN catalog.product_images other ON other.content_hash=i.content_hash AND other.product_id<>i.product_id
      JOIN catalog.products p ON p.id=other.product_id WHERE i.product_id=$1 AND i.content_hash IS NOT NULL AND ${imageScope} ORDER BY p.id LIMIT 10`,imageArgs)).rows;
    const history=(await this.pool.query('SELECT snapshot FROM catalog.product_revisions WHERE product_id=$1 ORDER BY version DESC LIMIT 20',[id])).rows;
    const current=Number(row.price_minor),old=history.map(r=>Number(r.snapshot.priceMinor)).find(p=>p>0&&p!==current);
    return {advisoryOnly:true,duplicates,reusedImages,unusualPrice:old!=null&&Math.abs(current-old)/old>=0.5?{before:old,after:current}:null,
      missingImages:!(await this.pool.query('SELECT 1 FROM catalog.product_images WHERE product_id=$1 LIMIT 1',[id])).rowCount&&!row.image_url};
  }
}
