import {randomBytes,generateKeyPairSync,createHash,sign} from 'node:crypto';
import {encodeCBOR} from '@levischuck/tiny-cbor';
const hash=value=>createHash('sha256').update(value).digest();
export function authenticator(){
  const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),id=randomBytes(32),jwk=pair.publicKey.export({format:'jwk'});
  const publicKey=Buffer.from(encodeCBOR(new Map([[1,2],[3,-7],[-1,1],[-2,new Uint8Array(Buffer.from(jwk.x,'base64url'))],[-3,new Uint8Array(Buffer.from(jwk.y,'base64url'))]])));
  return {
    registration(options,{origin='http://localhost:5173'}={}){
      const clientDataJSON=Buffer.from(JSON.stringify({type:'webauthn.create',challenge:options.challenge,origin,crossOrigin:false}));
      const length=Buffer.alloc(2);length.writeUInt16BE(id.length);
      const authData=Buffer.concat([hash(options.rp.id),Buffer.from([0x45]),Buffer.alloc(4),Buffer.alloc(16),length,id,publicKey]);
      const attestationObject=Buffer.from(encodeCBOR(new Map([['fmt','none'],['attStmt',new Map()],['authData',new Uint8Array(authData)]])));
      return {id:id.toString('base64url'),rawId:id.toString('base64url'),type:'public-key',clientExtensionResults:{},authenticatorAttachment:'platform',response:{clientDataJSON:clientDataJSON.toString('base64url'),attestationObject:attestationObject.toString('base64url'),transports:['internal']}};
    },
    assertion(options,{origin='http://localhost:5173',verified=true,counter=1,rpID=options.rpId}={}){
      const clientDataJSON=Buffer.from(JSON.stringify({type:'webauthn.get',challenge:options.challenge,origin,crossOrigin:false})),count=Buffer.alloc(4);count.writeUInt32BE(counter);
      const authenticatorData=Buffer.concat([hash(rpID),Buffer.from([verified?0x05:0x01]),count]);
      const signature=sign('sha256',Buffer.concat([authenticatorData,hash(clientDataJSON)]),pair.privateKey);
      return {id:id.toString('base64url'),rawId:id.toString('base64url'),type:'public-key',clientExtensionResults:{},authenticatorAttachment:'platform',response:{clientDataJSON:clientDataJSON.toString('base64url'),authenticatorData:authenticatorData.toString('base64url'),signature:signature.toString('base64url')}};
    },
  };
}
