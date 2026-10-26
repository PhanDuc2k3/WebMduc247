export class VietqrProvider {
  constructor(config) { this.config=config; }
  configured() { return Boolean(this.config.clientId && this.config.apiKey && this.config.webhookToken); }
  async create(intent) {
    let response;
    try { response=await fetch(new URL('/v2/paymentRequests',this.config.baseUrl),{
      method:'POST',headers:{ 'Content-Type':'application/json',
        'x-client-id':this.config.clientId,'x-api-key':this.config.apiKey },
      body:JSON.stringify({ orderCode:Number(intent.provider_order_code),
        amount:Number(intent.amount_minor),description:`MDUC247 ${intent.provider_order_code}`,
        cancelUrl:this.config.returnUrl,successUrl:this.config.returnUrl }),
      signal:AbortSignal.timeout(15_000) }); }
    catch { throw new Error('VIETQR_UNAVAILABLE'); }
    if (!response.ok) throw new Error('VIETQR_HTTP_'+response.status);
    const result=await response.json();
    if (result.code!=='00' || Number(result.data?.orderCode)!==Number(intent.provider_order_code) ||
      Number(result.data?.amount)!==Number(intent.amount_minor) ||
      typeof result.data?.checkoutUrl!=='string' || !result.data.checkoutUrl.startsWith('https://'))
      throw new Error('VIETQR_CREATE_INVALID');
    return { checkoutUrl:result.data.checkoutUrl,qrData:null };
  }
}
