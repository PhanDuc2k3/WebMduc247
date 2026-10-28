import mongoose from 'mongoose';
import { createHash, randomBytes } from 'node:crypto';

export const objectId=value=>typeof value==='string'&&/^[0-9a-f]{24}$/i.test(value)
  ? new mongoose.Types.ObjectId(value) : null;
export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const newToken=()=>randomBytes(32).toString('base64url');
export const hashToken=value=>createHash('sha256').update(value).digest('hex');
const asMessage=row=>({id:String(row._id),conversationId:String(row.conversationId),senderId:row.senderId,
  senderRole:row.senderRole,clientMessageId:row.clientMessageId,type:row.type,content:row.content,
  attachmentId:row.attachmentId?String(row.attachmentId):null,createdAt:row.createdAt});
const asConversation=row=>({id:String(row._id),buyerId:row.buyerId,storeId:row.storeId,
  storeName:row.storeName||'Cửa hàng',storeSlug:row.storeSlug||'',
  status:row.status,lastMessageAt:row.lastMessageAt,lastMessagePreview:row.lastMessagePreview,
  createdAt:row.createdAt});
export class ChatRepository {
  constructor(db,retentionDays=365){
    this.db=db;this.retentionDays=retentionDays;
    for(const name of ['conversations','messages','read_states','attachments','bot_sessions',
      'bot_messages','chat_outbox','abuse_reports'])this[name]=db.collection(name);
  }
  async indexes(){
    await Promise.all([
      this.conversations.createIndex({buyerId:1,storeId:1},{unique:true}),
      this.conversations.createIndex({storeId:1,lastMessageAt:-1,_id:-1}),
      this.conversations.createIndex({buyerId:1,lastMessageAt:-1,_id:-1}),
      this.messages.createIndex({conversationId:1,createdAt:-1,_id:-1}),
      this.messages.createIndex({conversationId:1,senderId:1,clientMessageId:1},{unique:true}),
      this.messages.createIndex({createdAt:1},{expireAfterSeconds:this.retentionDays*86400}),
      this.read_states.createIndex({conversationId:1,participantId:1},{unique:true}),
      this.attachments.createIndex({createdAt:1}),
      this.bot_sessions.createIndex({expiresAt:1},{expireAfterSeconds:0}),
      this.bot_messages.createIndex({sessionId:1,createdAt:1,_id:1}),
      this.bot_messages.createIndex({sessionId:1,clientMessageId:1,role:1},
        {unique:true,partialFilterExpression:{clientMessageId:{$exists:true}}}),
      this.bot_messages.createIndex({expiresAt:1},{expireAfterSeconds:0}),
      this.chat_outbox.createIndex({publishedAt:1,nextAttemptAt:1}),
      this.chat_outbox.createIndex({publishedAt:1},{expireAfterSeconds:30*86400}),
      this.chat_outbox.createIndex({messageId:1},{unique:true}),
      this.abuse_reports.createIndex({conversationId:1,createdAt:-1}),
    ]);
  }
  async getOrCreate(buyerId,storeId,storeName,storeSlug){
    let row=await this.conversations.findOne({buyerId,storeId});
    if(row)return asConversation(row);
    const now=new Date();
    try{const result=await this.conversations.insertOne({buyerId,storeId,storeName,storeSlug,status:'ACTIVE',
      lastMessageAt:null,lastMessagePreview:'',createdAt:now,updatedAt:now});
      row=await this.conversations.findOne({_id:result.insertedId});}
    catch(error){if(error.code!==11000)throw error;row=await this.conversations.findOne({buyerId,storeId});}
    return asConversation(row);
  }
  async get(id){const oid=objectId(id);return oid?this.conversations.findOne({_id:oid}):null;}
  async list(userId,storeIds,limit=50){
    const filter={$or:[{buyerId:userId},...(storeIds.length?[{storeId:{$in:storeIds}}]:[])]};
    const rows=await this.conversations.find(filter).sort({lastMessageAt:-1,_id:-1}).limit(limit).toArray();
    return Promise.all(rows.map(async row=>({...asConversation(row),
      unreadCount:await this.unread(row,userId)})));
  }
  async unread(conversation,userId){
    const state=await this.read_states.findOne({conversationId:conversation._id,participantId:userId});
    const filter={conversationId:conversation._id,senderId:{$ne:userId}};
    if(state?.lastReadAt)filter.$or=[{createdAt:{$gt:state.lastReadAt}},
      {createdAt:state.lastReadAt,_id:{$gt:state.lastReadMessageId}}];
    return this.messages.countDocuments(filter);
  }
  async otherReadAt(conversation,userId,role){
    const filter={conversationId:conversation._id,
      participantId:role==='seller'?conversation.buyerId:{$ne:userId}};
    const row=await this.read_states.find(filter).sort({lastReadAt:-1,_id:-1}).limit(1).toArray();
    return row[0]?.lastReadAt||null;
  }
  async page(conversationId,cursor=null,limit=30){
    const filter={conversationId:objectId(conversationId)};
    if(cursor)filter.$or=[{createdAt:{$lt:cursor.createdAt}},
      {createdAt:cursor.createdAt,_id:{$lt:cursor.id}}];
    const rows=await this.messages.find(filter).sort({createdAt:-1,_id:-1}).limit(limit+1).toArray();
    const hasMore=rows.length>limit;
    const page=rows.slice(0,limit);
    return {messages:page.reverse().map(asMessage),nextCursor:hasMore&&page.length
      ? encodeCursor(page[0].createdAt,page[0]._id):null};
  }
  async send(conversation,actor,input){
    const hash=digest({type:input.type,content:input.content,attachmentId:input.attachmentId||null});
    const key={conversationId:conversation._id,senderId:actor.id,clientMessageId:input.clientMessageId};
    const existing=await this.messages.findOne(key);
    if(existing){if(existing.payloadHash!==hash)throw Object.assign(new Error('Client message ID conflict'),
      {status:409,code:'IDEMPOTENCY_CONFLICT'});
      await this.ensureOutbox(conversation,actor,existing);
      return {message:asMessage(existing),duplicate:true};}
    if(input.attachmentId){
      const attached=await this.attachments.findOne({_id:objectId(input.attachmentId),uploaderId:actor.id,
        $or:[{conversationId:null},{conversationId:conversation._id,clientMessageId:input.clientMessageId}]});
      if(!attached)throw Object.assign(new Error('Attachment not owned by sender'),{status:403,code:'ATTACHMENT_DENIED'});
      if(input.type==='image'&&!attached.mimeType.startsWith('image/'))
        throw Object.assign(new Error('Attachment type mismatch'),{status:400,code:'ATTACHMENT_TYPE_MISMATCH'});
      await this.attachments.updateOne({_id:attached._id,conversationId:null},{$set:{
        conversationId:conversation._id,clientMessageId:input.clientMessageId,
        expiresAt:new Date(Date.now()+this.retentionDays*86400_000)}});
    }
    const now=new Date();let row;
    try{const result=await this.messages.insertOne({...key,senderRole:actor.id===conversation.buyerId?'buyer':'seller',
      type:input.type,content:input.content,attachmentId:input.attachmentId?objectId(input.attachmentId):null,
      payloadHash:hash,createdAt:now});row=await this.messages.findOne({_id:result.insertedId});}
    catch(error){if(error.code!==11000)throw error;row=await this.messages.findOne(key);
      if(!row||row.payloadHash!==hash)throw Object.assign(new Error('Client message ID conflict'),
        {status:409,code:'IDEMPOTENCY_CONFLICT'});
      await this.ensureOutbox(conversation,actor,row);
      return {message:asMessage(row),duplicate:true};}
    await this.conversations.updateOne({_id:conversation._id,
      $or:[{lastMessageAt:null},{lastMessageAt:{$lt:now}}]},{$set:{lastMessageAt:now,
      lastMessagePreview:input.type==='text'?input.content.slice(0,100):'Đã gửi tệp đính kèm',updatedAt:now}});
    await this.ensureOutbox(conversation,actor,row);
    return {message:asMessage(row),duplicate:false};
  }
  async ensureOutbox(conversation,actor,row){
    const now=new Date();
    await this.chat_outbox.updateOne({messageId:row._id},{$setOnInsert:{eventType:'ChatMessageSent.v1',
      messageId:row._id,conversationId:conversation._id,storeId:conversation.storeId,
      buyerId:conversation.buyerId,senderId:actor.id,createdAt:now,nextAttemptAt:now,
      publishedAt:null,attempts:0}},{upsert:true});
  }
  async markRead(conversation,userId,messageId){
    const message=await this.messages.findOne({_id:objectId(messageId),conversationId:conversation._id});
    if(!message)throw Object.assign(new Error('Message not found'),{status:404,code:'MESSAGE_NOT_FOUND'});
    const filter={conversationId:conversation._id,participantId:userId};
    const prior=await this.read_states.findOne(filter);
    const newer=!prior||!prior.lastReadAt||message.createdAt>prior.lastReadAt||
      (message.createdAt.getTime()===prior.lastReadAt.getTime()&&message._id.toString()>prior.lastReadMessageId.toString());
    if(newer){
      const data={...filter,lastReadMessageId:message._id,lastReadAt:message.createdAt,updatedAt:new Date()};
      if(!prior)try{await this.read_states.insertOne(data);}catch(error){if(error.code!==11000)throw error;}
      else await this.read_states.updateOne({...filter,$or:[{lastReadAt:{$lt:message.createdAt}},
        {lastReadAt:message.createdAt,lastReadMessageId:{$lt:message._id}}]},{$set:data});
    }
    return {lastReadMessageId:messageId,lastReadAt:message.createdAt,
      unreadCount:await this.unread(conversation,userId)};
  }
  async report(conversationId,actorId,reason,messageId){
    const row={conversationId:objectId(conversationId),actorId,reason,
      messageId:messageId?objectId(messageId):null,status:'OPEN',createdAt:new Date()};
    const result=await this.abuse_reports.insertOne(row);
    return {id:String(result.insertedId),status:'OPEN'};
  }
  async adminQueueFeed(after) {
    if(after&&!objectId(after))throw Object.assign(Error('Con trỏ không hợp lệ.'),{status:400,code:'INVALID_CURSOR'});
    const rows=await this.abuse_reports.aggregate([
      {$match:after?{_id:{$gt:objectId(after)}}:{}},{$sort:{_id:1}},{$limit:500},
      {$lookup:{from:'conversations',localField:'conversationId',foreignField:'_id',as:'conversation'}},
      {$project:{conversationId:1,messageId:1,reason:1,status:1,createdAt:1,storeId:{$arrayElemAt:['$conversation.storeId',0]}}},
    ]).toArray();
    return {items:rows.map(row=>({sourceId:String(row._id),conversationId:String(row.conversationId),messageId:row.messageId?String(row.messageId):null,
      storeId:row.storeId||null,reason:row.reason,status:row.status,active:row.status==='OPEN',createdAt:row.createdAt})),next:rows.length===500?String(rows.at(-1)._id):null};
  }
  async storeReportSummary(storeId){
    const rows=await this.conversations.aggregate([
      {$match:{storeId}},
      {$lookup:{from:'abuse_reports',let:{conversation:'$_id'},pipeline:[
        {$match:{$expr:{$eq:['$conversationId','$$conversation']}}},
        {$group:{_id:null,total:{$sum:1},open:{$sum:{$cond:[{$eq:['$status','OPEN']},1,0]}}}},
      ],as:'reports'}},
      {$unwind:'$reports'},{$group:{_id:null,total:{$sum:'$reports.total'},open:{$sum:'$reports.open'}}},
    ]).toArray();
    return {storeId,total_reports:rows[0]?.total||0,open_reports:rows[0]?.open||0,updatedAt:new Date().toISOString(),
      definition:'Số báo cáo hội thoại liên quan shop, OPEN là đang mở. Báo cáo chưa kết luận không đồng nghĩa vi phạm; nhiều báo cáo có thể cùng một sự việc. Không trả nội dung hội thoại.'};
  }
}
export function encodeCursor(date,id){return Buffer.from(JSON.stringify([date.toISOString(),String(id)])).toString('base64url');}
export function decodeCursor(raw){
  try{if(typeof raw!=='string'||raw.length>128)return null;
    const [date,id]=JSON.parse(Buffer.from(raw,'base64url').toString('utf8'));
    const time=new Date(date),oid=objectId(id);
    if(!oid||Number.isNaN(time.getTime()))return null;
    return {createdAt:time,id:oid};
  }catch{return null;}
}
export async function connectMongo(uri,retentionDays){
  const connection=mongoose.createConnection(uri,{serverSelectionTimeoutMS:5000});
  await connection.asPromise();
  const repo=new ChatRepository(connection.db,retentionDays);
  try {await repo.indexes();return {connection,repo};}
  catch(error){await connection.close();throw error;}
}
