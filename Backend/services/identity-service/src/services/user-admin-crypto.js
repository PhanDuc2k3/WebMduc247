import {createCipheriv,createDecipheriv,randomBytes,createHash} from 'node:crypto';
export const userHash=value=>createHash('sha256').update(value).digest('hex');
export function sealUserData(key,value,aad='') {
  const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce);cipher.setAAD(Buffer.from(aad));
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return {nonce:nonce.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:encrypted.toString('base64')};
}
export function openUserData(key,envelope,aad=''){
  const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.nonce,'base64'));decipher.setAAD(Buffer.from(aad));decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data,'base64')),decipher.final()]).toString('utf8'));
}
export async function userMail(db,key,email,purpose,value){
  const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce),ciphertext=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  await db.query('INSERT INTO identity_email_outbox(recipient,purpose,nonce,ciphertext,tag,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval \'10 minutes\')',[email,purpose,nonce,ciphertext,cipher.getAuthTag()]);
}
