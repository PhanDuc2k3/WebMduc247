import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

export const hmac = (secret,value) => createHmac('sha256',secret).update(value).digest('hex');
const fields = (object,names) => names.map(name=>`${name}=${String(object[name] ?? '')}`).join('&');
const safeEqual = (a,b) => {
  if (typeof a!=='string' || !/^[a-f0-9]{64}$/i.test(a)) return false;
  const left=Buffer.from(a.toLowerCase(),'hex'),right=Buffer.from(b.toLowerCase(),'hex');
  return left.length===right.length && timingSafeEqual(left,right);
};
const createFields = ['accessKey','amount','extraData','ipnUrl','orderId','orderInfo','partnerCode',
  'redirectUrl','requestId','requestType'];
const createResponseFields = ['accessKey','amount','message','orderId','partnerCode','payUrl',
  'requestId','responseTime','resultCode'];
const ipnFields = ['accessKey','amount','extraData','message','orderId','orderInfo','orderType',
  'partnerCode','payType','requestId','responseTime','resultCode','transId'];
const queryFields = ['accessKey','orderId','partnerCode','requestId'];
const refundFields = ['accessKey','amount','description','orderId','partnerCode','requestId','transId'];

export class MomoProvider {
  constructor(config) { this.config=config; }
  configured() { return ['partnerCode','accessKey','secretKey','ipnUrl','redirectUrl'].every(key=>Boolean(this.config[key])); }
  sign(object,names) { return hmac(this.config.secretKey,fields({ accessKey:this.config.accessKey,...object },names)); }
  verifyIpn(body) { return safeEqual(body?.signature,this.sign(body,ipnFields)); }
  verifyCreateResponse(body) { return safeEqual(body?.signature,this.sign(body,createResponseFields)); }
  async post(path,body) {
    let response;
    let payload=JSON.stringify(body);
    if (path==='/v2/gateway/api/refund') {
      if (!/^\d{1,30}$/.test(String(body.transId))) throw new Error('MOMO_INVALID_TRANS_ID');
      payload=payload.replace(/"transId":"(\d+)"/,'"transId":$1');
    }
    try { response=await fetch(new URL(path,this.config.baseUrl),{
      method:'POST',headers:{ 'Content-Type':'application/json' },body:payload,
      signal:AbortSignal.timeout(35_000) }); }
    catch (error) { throw new Error('MOMO_UNAVAILABLE'); }
    if (!response.ok) throw new Error('MOMO_HTTP_'+response.status);
    const raw=await response.text();
    return JSON.parse(raw.replace(/"(transId|refundTransId)"\s*:\s*(\d+)/g,'"$1":"$2"'));
  }
  async create(intent) {
    const body={
      partnerCode:this.config.partnerCode,requestId:intent.provider_request_id,
      amount:Number(intent.amount_minor),orderId:intent.provider_order_ref,
      orderInfo:`MDUC247 ${intent.order_group_id}`,redirectUrl:this.config.redirectUrl,
      ipnUrl:this.config.ipnUrl,requestType:'captureWallet',extraData:'',lang:'vi',
    };
    body.signature=this.sign(body,createFields);
    const result=await this.post('/v2/gateway/api/create',body);
    if (result.partnerCode!==body.partnerCode || result.orderId!==body.orderId ||
      result.requestId!==body.requestId || Number(result.amount)!==body.amount ||
      Number(result.resultCode)!==0 || !this.verifyCreateResponse(result) ||
      typeof result.payUrl!=='string' || !result.payUrl.startsWith('https://'))
      throw new Error('MOMO_CREATE_INVALID');
    return { checkoutUrl:result.payUrl,qrData:typeof result.qrCodeUrl==='string' ? result.qrCodeUrl : null };
  }
  async query(intent) {
    const body={ partnerCode:this.config.partnerCode,requestId:randomUUID(),
      orderId:intent.provider_order_ref,lang:'vi' };
    body.signature=this.sign(body,queryFields);
    const result=await this.post('/v2/gateway/api/query',body);
    if (result.partnerCode!==body.partnerCode || result.orderId!==body.orderId ||
      result.requestId!==body.requestId || Number(result.amount)!==Number(intent.amount_minor))
      throw new Error('MOMO_QUERY_MISMATCH');
    return result;
  }
  async refund(refund,transaction) {
    const body={ partnerCode:this.config.partnerCode,orderId:refund.provider_refund_ref,
      requestId:refund.provider_refund_ref,amount:Number(refund.amount_minor),
      transId:String(transaction.provider_txn_id),lang:'vi',description:refund.reason };
    body.signature=this.sign(body,refundFields);
    const result=await this.post('/v2/gateway/api/refund',body);
    if (result.partnerCode!==body.partnerCode || result.orderId!==body.orderId ||
      result.requestId!==body.requestId || Number(result.amount)!==body.amount)
      throw new Error('MOMO_REFUND_MISMATCH');
    return result;
  }
  async queryRefund(refund) {
    const body={ partnerCode:this.config.partnerCode,orderId:refund.provider_refund_ref,
      requestId:randomUUID(),lang:'vi' };
    body.signature=this.sign(body,queryFields);
    return this.post('/v2/gateway/api/refund/query',body);
  }
}
export const momoSignatures={ createFields,createResponseFields,ipnFields,queryFields,refundFields };
