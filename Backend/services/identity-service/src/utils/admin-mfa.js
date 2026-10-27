import {createHmac,createCipheriv,createDecipheriv,hkdfSync,randomBytes,timingSafeEqual} from 'node:crypto';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(bytes){let bits=0,value=0,output='';for(const byte of bytes){value=(value<<8)|byte;bits+=8;while(bits>=5){bits-=5;output+=alphabet[(value>>>bits)&31];}}if(bits)output+=alphabet[(value<<(5-bits))&31];return output;}
function unbase32(value){let bits=0,buffer=0;const out=[];for(const char of value){const index=alphabet.indexOf(char);if(index<0)throw Error('Invalid Base32');buffer=(buffer<<5)|index;bits+=5;if(bits>=8){bits-=8;out.push((buffer>>>bits)&255);}}return Buffer.from(out);}
export const newTotpSecret=()=>base32(randomBytes(20));
export function hotp(secret,counter,{digits=6,algorithm='sha1'}={}){
  const message=Buffer.alloc(8);message.writeBigUInt64BE(BigInt(counter));
  const digest=createHmac(algorithm,unbase32(secret)).update(message).digest(),offset=digest.at(-1)&15;
  return String((digest.readUInt32BE(offset)&0x7fffffff)%10**digits).padStart(digits,'0');
}
export function verifyTotp(secret,code,{now=Date.now(),lastCounter=-1}={}){
  if(typeof code!=='string'||!/^\d{6}$/.test(code))return null;
  const current=Math.floor(now/30000);
  for(const counter of [current,current-1,current+1])if(counter>Number(lastCounter)&&counter>=0&&timingSafeEqual(Buffer.from(hotp(secret,counter)),Buffer.from(code)))return counter;
  return null;
}
export function mfaKey(config){
  const key=config.adminMfaKey||Buffer.from(hkdfSync('sha256',config.mailKey,Buffer.alloc(0),'mduc247-admin-mfa-v1',32));
  if(!Buffer.isBuffer(key)||key.length!==32)throw Error('Invalid admin MFA key');return key;
}
export function sealSecret(value,key,userId){
  const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce);cipher.setAAD(Buffer.from('admin-mfa:'+userId));
  return {nonce:nonce.toString('base64url'),ciphertext:Buffer.concat([cipher.update(value,'utf8'),cipher.final()]).toString('base64url'),tag:cipher.getAuthTag().toString('base64url')};
}
export function openSecret(value,key,userId){
  const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(value.nonce,'base64url'));decipher.setAAD(Buffer.from('admin-mfa:'+userId));decipher.setAuthTag(Buffer.from(value.tag,'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(value.ciphertext,'base64url')),decipher.final()]).toString('utf8');
}
export const recoveryCode=()=>randomBytes(10).toString('hex').toUpperCase().match(/.{5}/g).join('-');
export function recoveryHash(key,userId,code){return createHmac('sha256',key).update('recovery:'+userId+':'+String(code||'').replaceAll('-','').toUpperCase()).digest('hex');}
export function deviceHash(key,value){return createHmac('sha256',key).update('device:'+value).digest('hex');}
