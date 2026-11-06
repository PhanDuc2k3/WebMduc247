import {objectId} from './repository.js';
import {adminPage,PlatformAdminError} from '../../../packages/contracts/platform-admin.js';
import {requireAdminPermission,requireAdminScope,permissionGrants} from '../../../packages/contracts/admin-rbac.js';
import {operationsQuery,operationsCommand} from '../../../packages/contracts/admin-operations.js';

const fail=(status,code,message)=>new PlatformAdminError(status,code,message);
const dto=row=>({id:String(row._id),conversationId:String(row.conversationId),messageId:row.messageId?String(row.messageId):null,
  storeId:row.storeId,reason:row.reason,status:row.status,version:row.version||1,createdAt:row.createdAt,decision:row.decision||null});
export class AdminChatReports {
  constructor(repo){this.repo=repo;this.reports=repo.abuse_reports;}
  async record(actor,id,permission){
    requireAdminPermission(actor,permission);const oid=objectId(id);if(!oid)throw fail(400,'INVALID_REPORT_ID','Mã báo cáo không hợp lệ.');
    const row=await this.reports.findOne({_id:oid});if(!row)throw fail(404,'REPORT_NOT_FOUND','Không tìm thấy báo cáo.');
    const conversation=await this.repo.get(String(row.conversationId));if(!conversation)throw fail(404,'REPORT_NOT_FOUND','Hội thoại không còn trong thời hạn lưu.');
    requireAdminScope(actor,permission,{storeId:conversation.storeId});return {...row,storeId:conversation.storeId};
  }
  async list(actor,query={}){
    requireAdminPermission(actor,'moderation.read');const f=operationsQuery(query,['OPEN','CONFIRMED','DISMISSED','CLOSED']);
    const scopes=permissionGrants(actor,'moderation.read').map(g=>Object.keys(g.scope||{}).some(key=>key!=='storeIds')?null:g.scope?.storeIds?{storeId:{$in:g.scope.storeIds}}:{}).filter(Boolean);
    const match={...(f.status?{status:f.status}:{}),...(f.from||f.to?{createdAt:{...(f.from?{$gte:new Date(f.from)}:{}),...(f.to?{$lt:new Date(f.to)}:{})}}:{})};
    if(f.q){if(!objectId(f.q))throw fail(400,'INVALID_REPORT_SEARCH','Tìm bằng mã báo cáo hoặc hội thoại gồm 24 ký tự.');match.$or=[{_id:objectId(f.q)},{conversationId:objectId(f.q)}];}
    const rows=await this.reports.aggregate([{$match:match},{$lookup:{from:'conversations',localField:'conversationId',foreignField:'_id',as:'conversation'}},
      {$set:{storeId:{$arrayElemAt:['$conversation.storeId',0]}}},{$match:{$and:[scopes.length?{$or:scopes}:{_id:null},...(query.storeId?[{storeId:query.storeId}]:[])]}},
      {$project:{conversation:0,events:0}},{$facet:{items:[{$sort:{createdAt:-1,_id:-1}},{$skip:f.offset},{$limit:f.limit}],total:[{$count:'n'}]}}]).toArray();
    return adminPage((rows[0]?.items||[]).map(dto),rows[0]?.total[0]?.n||0,f);
  }
  async detail(actor,id,input){
    const row=await this.record(actor,id,'moderation.view_sensitive');
    if(!input||Object.keys(input).some(k=>k!=='reason')||typeof input.reason!=='string'||input.reason.trim().length<8||input.reason.length>500||/[\u0000-\u001f]/.test(input.reason))throw fail(400,'REASON_REQUIRED','Nhập lý do xem nội dung từ 8 đến 500 ký tự.');
    await this.repo.db.collection('admin_report_access').insertOne({reportId:row._id,actorId:actor.id,reason:input.reason.trim(),createdAt:new Date()});
    const messages=await this.repo.messages.find({conversationId:row.conversationId,...(row.messageId?{_id:row.messageId}:{})}).sort({createdAt:-1,_id:-1}).limit(row.messageId?1:10).toArray();
    return {record:dto(row),messages:messages.reverse().map(m=>({id:String(m._id),role:m.senderRole,type:m.type,content:m.content,hasAttachment:Boolean(m.attachmentId),createdAt:m.createdAt})),
      events:(row.events||[]).map(e=>({action:e.action,actorId:e.actorId,reason:e.reason,createdAt:e.createdAt})),
      guidance:'Chỉ hiển thị tin được báo cáo hoặc tối đa 10 tin gần nhất nếu báo cáo toàn hội thoại. Tệp đính kèm không mở công khai. Kết luận báo cáo không tự khóa tài khoản/shop.'};
  }
  async decide(actor,id,input){
    const row=await this.record(actor,id,'moderation.update');
    if(!['confirm','dismiss'].includes(input?.action))throw fail(400,'INVALID_DECISION','Quyết định không hợp lệ.');
    const cmd=operationsCommand(Object.fromEntries(Object.entries(input).filter(([k])=>k!=='action')));
    const previous=(row.events||[]).find(e=>e.requestId===cmd.requestId&&e.actorId===actor.id);
    if(previous){if(previous.action!==input.action||previous.reason!==cmd.reason||previous.version!==cmd.version)throw fail(409,'IDEMPOTENCY_CONFLICT','Mã yêu cầu đã dùng cho nội dung khác.');return {id,status:previous.status,version:previous.version+1};}
    if(row.status!=='OPEN'||(row.version||1)!==cmd.version)throw fail(409,'REPORT_CHANGED','Báo cáo đã được xử lý hoặc thay đổi. Hãy tải lại.');
    const status=input.action==='confirm'?'CONFIRMED':'DISMISSED',now=new Date();
    const result=await this.reports.updateOne({_id:row._id,status:'OPEN',...(row.version?{version:cmd.version}:{version:{$exists:false}})},
      {$set:{status,version:cmd.version+1,decision:{actorId:actor.id,reason:cmd.reason,at:now}},$push:{events:{action:input.action,status,actorId:actor.id,reason:cmd.reason,requestId:cmd.requestId,version:cmd.version,createdAt:now}}});
    if(!result.modifiedCount)throw fail(409,'REPORT_CHANGED','Báo cáo vừa được người khác xử lý.');return {id,status,version:cmd.version+1};
  }
}
