import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir,readFile,unlink,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand,
  HeadBucketCommand,CreateBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { normalizeImage } from '../../../packages/contracts/image-validation.js';
import { scanWithClamAv } from '../../identity-service/src/services/clam-scanner.service.js';
import { objectId } from './repository.js';

const bad=(status,code,message)=>Object.assign(new Error(message),{status,code});
const keyPattern=/^chat\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:webp|pdf)$/i;
export class ChatStorage {
  constructor(env=process.env){
    this.bucket=env.CHAT_S3_BUCKET||env.S3_BUCKET||'';
    this.autoCreateBucket=env.S3_AUTO_CREATE_BUCKET==='true';
    this.secret=env.CHAT_ATTACHMENT_SECRET||'';
    this.publicUrl=env.CHAT_PUBLIC_URL||`http://127.0.0.1:${env.CHAT_PORT||5106}`;
    this.directory=fileURLToPath(new URL('../../../.local-chat-files/',import.meta.url));
    if(env.NODE_ENV==='production'&&!this.bucket)
      throw new Error('Chat production attachments require S3 object storage');
    if(this.bucket){
      const common={region:env.S3_REGION||'us-east-1',forcePathStyle:Boolean(env.S3_ENDPOINT),
        credentials:{accessKeyId:env.S3_ACCESS_KEY,secretAccessKey:env.S3_SECRET_KEY}};
      this.client=new S3Client({...common,endpoint:env.S3_ENDPOINT||undefined});
      this.publicClient=new S3Client({...common,endpoint:env.S3_PUBLIC_ENDPOINT||env.S3_ENDPOINT||undefined});
    }
    if(!this.bucket&&this.secret.length<32)
      throw new Error('CHAT_ATTACHMENT_SECRET must contain at least 32 characters for local files');
  }
  async ensureBucket(){
    if(!this.client||!this.autoCreateBucket)return;
    try{await this.client.send(new HeadBucketCommand({Bucket:this.bucket}));}
    catch{await this.client.send(new CreateBucketCommand({Bucket:this.bucket}));}
  }
  file(key){if(!keyPattern.test(key))throw bad(400,'INVALID_KEY','Tệp không hợp lệ.');
    return path.join(this.directory,...key.split('/'));}
  async put(key,data,mime){
    if(this.client)return this.client.send(new PutObjectCommand({Bucket:this.bucket,Key:key,
      Body:data,ContentType:mime,CacheControl:'private, no-store'}));
    const target=this.file(key);await mkdir(path.dirname(target),{recursive:true});
    await writeFile(target,data,{flag:'wx'});
  }
  async remove(key){
    if(this.client)return this.client.send(new DeleteObjectCommand({Bucket:this.bucket,Key:key}));
    await unlink(this.file(key)).catch(error=>{if(error.code!=='ENOENT')throw error;});
  }
  async signedUrl(row){
    if(this.client)return getSignedUrl(this.publicClient,new GetObjectCommand({Bucket:this.bucket,
      Key:row.objectKey,ResponseContentType:row.mimeType,
      ResponseContentDisposition:row.mimeType==='application/pdf'?'attachment':'inline'}),{expiresIn:300});
    const expires=Math.floor(Date.now()/1000)+300;
    const signature=createHmac('sha256',this.secret).update(`${row._id}.${expires}`).digest('hex');
    return `${this.publicUrl}/api/v2/attachments/${row._id}?expires=${expires}&signature=${signature}`;
  }
  validSignature(id,expires,signature){
    const value=Number(expires);
    if(!Number.isSafeInteger(value)||value<Math.floor(Date.now()/1000)||
      value>Math.floor(Date.now()/1000)+300||!/^[a-f0-9]{64}$/i.test(signature||''))return false;
    const expected=Buffer.from(createHmac('sha256',this.secret).update(`${id}.${value}`).digest('hex'),'hex');
    const actual=Buffer.from(signature,'hex');
    return expected.length===actual.length&&timingSafeEqual(expected,actual);
  }
  async read(key){return readFile(this.file(key));}
}
export class AttachmentService {
  constructor(repo,storage,scanner){this.repo=repo;this.storage=storage;this.scanner=scanner;}
  async upload(userId,buffer,mime){
    if(!Buffer.isBuffer(buffer)||!buffer.length||buffer.length>5*1024*1024)
      throw bad(413,'FILE_TOO_LARGE','Tệp phải nhỏ hơn 5 MB.');
    if(!this.scanner)throw bad(503,'SCANNER_UNAVAILABLE','Bộ quét tệp chưa sẵn sàng.');
    let processed,storedMime,extension;
    if(['image/jpeg','image/png','image/webp'].includes(mime)){
      processed=await normalizeImage(buffer,mime);
      if(!processed)throw bad(415,'INVALID_IMAGE','Ảnh không hợp lệ hoặc quá 2 MB.');
      storedMime='image/webp';extension='webp';
    }else if(mime==='application/pdf'&&buffer.subarray(0,5).toString('ascii')==='%PDF-'){
      processed=buffer;storedMime=mime;extension='pdf';
    }else throw bad(415,'INVALID_FILE','Chỉ hỗ trợ JPEG, PNG, WebP hoặc PDF.');
    await this.scanner(buffer);
    const key=`chat/${randomUUID()}/${randomUUID()}.${extension}`;
    await this.storage.put(key,processed,storedMime);
    try{const now=new Date();const inserted=await this.repo.attachments.insertOne({
      uploaderId:userId,objectKey:key,mimeType:storedMime,size:processed.length,
      conversationId:null,clientMessageId:null,createdAt:now,expiresAt:new Date(now.getTime()+86400_000)});
      return {attachment:{id:String(inserted.insertedId),mimeType:storedMime,size:processed.length}};
    }catch(error){await this.storage.remove(key).catch(()=>{});throw error;}
  }
  async url(userId,id,authorizeConversation){
    const row=await this.repo.attachments.findOne({_id:objectId(id)});
    if(!row||!row.conversationId)throw bad(404,'ATTACHMENT_NOT_FOUND','Không tìm thấy tệp.');
    const conversation=await this.repo.get(String(row.conversationId));
    await authorizeConversation(userId,conversation);
    return {url:await this.storage.signedUrl(row),expiresAt:new Date(Date.now()+300_000).toISOString()};
  }
  async direct(id,expires,signature){
    if(this.storage.client||!this.storage.validSignature(id,expires,signature))
      throw bad(403,'URL_EXPIRED','Liên kết tệp không hợp lệ hoặc đã hết hạn.');
    const row=await this.repo.attachments.findOne({_id:objectId(id)});
    if(!row||!row.conversationId)throw bad(404,'ATTACHMENT_NOT_FOUND','Không tìm thấy tệp.');
    return {data:await this.storage.read(row.objectKey),mimeType:row.mimeType};
  }
  async cleanup(){
    const rows=await this.repo.attachments.find({expiresAt:{$lt:new Date()}}).limit(50).toArray();
    for(const row of rows)try{await this.storage.remove(row.objectKey);
      await this.repo.attachments.deleteOne({_id:row._id});}catch{}
    return rows.length;
  }
}
export const scannerFromEnv=env=>env.CHAT_CLAMAV_HOST||env.CLAMAV_HOST
  ? buffer=>scanWithClamAv(buffer,{host:env.CHAT_CLAMAV_HOST||env.CLAMAV_HOST,
      port:Number(env.CHAT_CLAMAV_PORT||env.CLAMAV_PORT||3310)}) : null;
