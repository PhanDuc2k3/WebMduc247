import {testAdmin,syncTestAdmin} from './admin-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import sharp from 'sharp';
import http from 'node:http';
import {ReturnService} from '../src/return.service.js';
import {CaseService} from '../src/case.service.js';
import {ReturnAdminService} from '../src/return-admin.service.js';
import {CaseResolutionService,decisionBasis} from '../src/case-resolution.service.js';
import {OrderLifecycle} from '../src/lifecycle.service.js';

test('decision basis validates policy, responsibility and typed evidence references',()=>{
  for(const input of [{},{responsibleParty:'any',policyVersion:'CASE_RESOLUTION_V1',basisSummary:'A valid summary',evidenceRefs:[]},
    {responsibleParty:'SELLER',policyVersion:'CASE_RESOLUTION_V1',basisSummary:'short',evidenceRefs:[]}])assert.throws(()=>decisionBasis(input),{status:400});
});
test('case resolution mutations deny buyers before database access',async()=>{
  const service=new CaseResolutionService({pool:{query(){throw Error('Unexpected SQL');}}}),user={id:randomUUID(),roles:['buyer']},id=randomUUID();
  for(const run of [()=>service.detail(user,id),()=>service.message(user,id,{}),()=>service.escalate(user,id,{}),()=>service.propose(user,id,{}),
    ()=>service.review(user,id,id,{}),()=>service.intervene(user,id,{}),()=>service.reviewAppeal(user,id,id,{}),()=>service.fulfill(user,id,{}),()=>service.report(user,{})])await assert.rejects(run(),{status:403});
});
test('ADM-CASE-009..018 PostgreSQL and HTTP',{skip:!process.env.ADMIN_RETURNS_TEST_DATABASE_URL},async t=>{
  const url=new URL(process.env.ADMIN_RETURNS_TEST_DATABASE_URL);if(!url.pathname.endsWith('_test'))throw Error('Dedicated *_test database required');
  const pool=new pg.Pool({connectionString:url.href}),fixtures=[],storeStates=new Map(),inboxIds=[];
  const actors=[0,1,2].map(()=>testAdmin()),[admin,reviewer,appealReviewer]=actors,seller=randomUUID();
  const order={pool,adminActor:async id=>{const actor=await syncTestAdmin(pool,actors.find(a=>a.id===id)||testAdmin(id));return {...actor,status:id===seller&&[...storeStates.values()].some(s=>s.accountBlocked)?'suspended':'active'};},transaction:async fn=>{const db=await pool.connect();try{await db.query('BEGIN');const result=await fn(db);await db.query('COMMIT');return result;}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}},
    inventory:async path=>{const storeId=path.split('/')[2],state=storeStates.get(storeId);if(!state)throw Object.assign(Error('Unknown store'),{status:404});
      if(path.endsWith('/aftersales-status'))return state;
      if(path.endsWith(seller)&&!state.platformSuspended&&!state.accountBlocked)return {role:'owner'};
      throw Object.assign(Error('Not a member'),{status:403});},
    identity:async path=>({items:actors.map(a=>({id:a.id,name:'Test staff'})),record:{id:path.split('/').at(-1),status:path.endsWith(seller)&&[...storeStates.values()].some(s=>s.accountBlocked)?'suspended':'active',roles:['platform_admin']}})};
  const returns=new ReturnService(order,{scanner:async()=>{}}),cases=new CaseService(returns),service=new CaseResolutionService(cases),adminReturns=new ReturnAdminService(returns),lifecycle=new OrderLifecycle(order);
  const basis={responsibleParty:'SELLER',policyVersion:'CASE_RESOLUTION_V1',basisSummary:'Review original snapshot, inspection and supplied party statements.',evidenceRefs:[]};
  const cv=async id=>(await cases.detail(admin,id)).record.caseVersion;
  const rv=async id=>(await pool.query('SELECT version FROM order_service.return_requests WHERE id=$1',[id])).rows[0].version;
  const future=()=>new Date(Date.now()+86400000).toISOString();
  async function grant(user,permission){await pool.query(`INSERT INTO order_service.case_permissions(user_id,permission,granted_by,reason)
    VALUES($1,$2,'resolution-test','Dedicated resolution integration test') ON CONFLICT(user_id,permission) DO UPDATE SET revoked_at=NULL`,[user.id,permission]);await syncTestAdmin(pool,user);}
  async function fixture({online=false,storeId=randomUUID(),categoryId=randomUUID(),quantity=2}={}){
    const [orderId,buyerId,groupId,quoteId,itemId]=Array.from({length:5},()=>randomUUID()),f={orderId,buyerId,groupId,quoteId,itemId,storeId,categoryId};fixtures.push(f);
    storeStates.set(storeId,{ownerId:seller,memberIds:[seller],platformSuspended:false,accountBlocked:false});
    await pool.query(`INSERT INTO order_service.checkout_quotes(id,user_id,cart_version,quote_json) VALUES($1,$2,0,'{}')`,[quoteId,buyerId]);
    await pool.query(`INSERT INTO order_service.order_groups(id,buyer_id,grand_total_minor,current_total_minor,status,payment_method,payment_status)
      VALUES($1,$2,120000,120000,'DELIVERED',$3,$4)`,[groupId,buyerId,online?'MOMO':'COD',online?'PAID':'UNPAID']);
    await pool.query(`INSERT INTO order_service.orders(id,user_id,store_id,quote_id,group_id,status,payment_method,payment_status,subtotal_minor,shipping_estimate_minor,payable_total_minor,shipping_address_json,store_snapshot_json)
      VALUES($1,$2,$3,$4,$5,'DELIVERED',$6,$7,100000,20000,120000,'{}',$8)`,[orderId,buyerId,storeId,quoteId,groupId,online?'MOMO':'COD',online?'PAID':'UNPAID',{name:`Resolution QA ${storeId}`}]);
    await pool.query(`INSERT INTO order_service.order_items(id,order_id,variant_id,product_id,sku,product_name,quantity,unit_price_minor,line_total_minor,reservation_id,product_snapshot_json)
      VALUES($1,$2,$3,$4,'RESOLUTION-QA','Resolution item',$5,50000,100000,$6,$7)`,[itemId,orderId,randomUUID(),randomUUID(),quantity,randomUUID(),{categoryId}]);
    await pool.query("INSERT INTO order_service.order_status_history(shop_order_id,to_status,actor_type,occurred_at) VALUES($1,'DELIVERED','system',now()-interval '1 day')",[orderId]);return f;
  }
  async function newReturn(f,quantity=2){const result=await returns.create(f.buyerId,f.orderId,{reason:'Products were damaged when delivered',reasonCode:'DAMAGED',resolution:'REFUND',items:[{orderItemId:f.itemId,quantity}]});return result.returnRequest.id;}
  async function take(id,user=admin){await cases.assign(user,id,{assigneeId:user.id,dueAt:future(),version:await cv(id),reason:'Assign case to authorized aftersales staff'});}
  async function decide(id,action='approve'){
    if((await pool.query('SELECT status FROM order_service.return_requests WHERE id=$1',[id])).rows[0].status==='REQUESTED')await adminReturns.decide(admin,id,{action:'review',version:await rv(id),reason:'Review return conditions and original snapshot'});
    await adminReturns.decide(admin,id,{action,version:await rv(id),reason:action==='approve'?'Return meets original policy conditions':'The submitted facts do not support this return',...basis});
    return (await service.detail(admin,id)).decisions[0];
  }
  async function dispute(f,returnId){const result=await cases.create(admin,{kind:'DISPUTE',shopOrderId:f.orderId,subject:'Resolution QA dispute',description:'Both parties request an evidence-based resolution',reasonCode:'DAMAGED',clientRequestId:randomUUID(),...(returnId?{relatedCaseId:returnId}:{})});
    await cases.status(admin,result.id,{status:'INVESTIGATING',version:await cv(result.id),reason:'Start independent fact investigation'});return result.id;}
  async function propose(id,outcome='NO_COMPENSATION',returnId){return service.propose(admin,id,{version:await cv(id),reason:'Proposed evidence-based dispute outcome',...basis,outcome,...(returnId?{returnId}:{})});}
  async function appealOverturn(f,id,decision){const appeal=await service.appeal(f.buyerId,id,{decisionId:decision.id,reason:'Additional facts warrant an independent reconsideration'});
    await service.reviewAppeal(appealReviewer,id,appeal.id,{action:'claim',version:1,reason:'Accept independent appeal investigation'});
    await service.reviewAppeal(appealReviewer,id,appeal.id,{action:'overturn',version:2,reason:'The appeal provides grounds for a fresh assessment',evidenceRefs:[]});return appeal;}
  try{
    await grant(reviewer,'case.decision.approve');await grant(appealReviewer,'case.appeal.review');await grant(admin,'aftersales.intervene');
    await t.test('009 internal/public separation, duplicate-safe messages and escalation',async()=>{
      const f=await fixture(),id=await newReturn(f);await take(id);const key=randomUUID();
      await service.message(admin,id,{visibility:'INTERNAL',body:'PRIVATE_INTERNAL_NOTE_ONLY',clientRequestId:randomUUID(),version:await cv(id)});
      const input={visibility:'PUBLIC',recipientKind:'BUYER',body:'Public message addressed only to the buyer',clientRequestId:key,version:await cv(id)};
      const first=await service.message(admin,id,input),again=await service.message(admin,id,input);assert.equal(first.id,again.id);
      assert.doesNotMatch(JSON.stringify(await service.publicDetail(f.buyerId,id)),/PRIVATE_INTERNAL_NOTE_ONLY/);
      assert.equal((await service.publicDetail(f.buyerId,id)).messages.length,1);assert.equal((await service.publicDetail(seller,id)).messages.length,0);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM order_service.order_outbox WHERE aggregate_id=$1 AND event_type='CasePublicMessage.v1'",[f.orderId])).rows[0].n,1);
      await assert.rejects(service.message(admin,id,{...input,body:'Different text with a previously used key'}),{code:'CASE_KEY_REUSED'});
      await service.escalate(admin,id,{assigneeId:reviewer.id,dueAt:future(),reason:'Escalate case to another qualified operator',version:await cv(id)},'test');
      assert.equal((await cases.detail(admin,id)).record.assigneeId,reviewer.id);
      await assert.rejects(service.message(admin,id,{...input,clientRequestId:randomUUID(),version:await cv(id)}),{code:'CASE_NOT_ASSIGNED'});
    });
    await t.test('010 decisions retain responsibility, policy, basis and money snapshots without a refund command',async()=>{
      const f=await fixture(),id=await newReturn(f);await decide(id);const detail=await service.detail(admin,id),d=detail.decisions[0];
      assert.equal(d.responsible_party,'SELLER');assert.equal(d.policy_version,'CASE_RESOLUTION_V1');assert.ok(Array.isArray(d.evidence_refs));
      assert.equal(d.snapshot.amountMinor,120000);assert.equal(detail.returnProgress.mode,'FULL');assert.equal(detail.returnProgress.shippingMinor,20000);
      assert.equal(detail.record.workflowStatus,'WAITING_FULFILLMENT');assert.equal(detail.obligations[0].status,'PENDING');
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM order_service.order_outbox WHERE aggregate_id=$1 AND event_type='RefundRequested.v1'",[f.orderId])).rows[0].n,0);
      await assert.rejects(service.fulfill(admin,id,{version:await cv(id),obligationId:detail.obligations[0].id,note:'A decision alone cannot prove that money was transferred'}),{code:'PAYMENT_VERIFICATION_REQUIRED'});
    });
    await t.test('011/012/014 verified Payment result alone completes monetary obligations; duplicate events do not double count',async()=>{
      const f=await fixture({online:true}),id=await newReturn(f);await decide(id);await returns.transition(f.buyerId,id,'ship',{expectedVersion:await rv(id)});
      await returns.transition(seller,id,'receive',{expectedVersion:await rv(id),inspectionCondition:'ACCEPTED',inspectionNote:'All returned items inspected and accepted'});
      const refundId=randomUUID();await pool.query('UPDATE order_service.return_requests SET refund_reference=$2 WHERE id=$1',[id,refundId]);
      const linked=await dispute(f,id),p=await propose(linked,'REFUND_EXISTING_RETURN',id);
      await service.review(reviewer,linked,p.id,{action:'publish',version:await cv(linked),reason:'Independent reviewer confirms the fixed return amount'});
      assert.equal((await service.detail(admin,linked)).record.workflowStatus,'WAITING_FULFILLMENT');
      const event={eventId:'resolution-'+randomUUID(),groupId:f.groupId,shopOrderId:f.orderId,type:'RefundSucceeded.v1',provider:'MOMO',amountMinor:120000,currency:'VND',refundId};inboxIds.push(event.eventId);
      await lifecycle.receivePayment(event);await lifecycle.receivePayment(event);
      const after=await service.detail(admin,linked);assert.equal(after.obligations[0].status,'FULFILLED');assert.equal(after.record.workflowStatus,'RESOLVED');
      assert.equal((await pool.query('SELECT refunded_minor FROM order_service.orders WHERE id=$1',[f.orderId])).rows[0].refunded_minor,'120000');
      await assert.rejects(service.close(admin,linked,{version:await cv(linked),reason:'Do not close before the appeal intake window ends'}),{code:'CASE_CANNOT_CLOSE'});
      await pool.query("UPDATE order_service.case_decisions SET appeal_until=now()-interval '1 second' WHERE case_id=$1",[linked]);
      await service.close(admin,linked,{version:await cv(linked),reason:'All obligations complete and appeal window has ended'});
      assert.equal((await cases.detail(admin,linked)).record.workflowStatus,'CLOSED');
      const partial=await fixture(),partialId=await newReturn(partial,1);await decide(partialId);
      const money=(await service.detail(admin,partialId)).returnProgress;assert.equal(money.mode,'PARTIAL');assert.equal(money.itemsMinor,50000);assert.equal(money.shippingMinor,0);
    });
    await t.test('013/015 overdue or blocked seller intervention records actual inspection without reactivating the shop',async()=>{
      const f=await fixture(),id=await newReturn(f);await decide(id);await returns.transition(f.buyerId,id,'ship',{expectedVersion:await rv(id)});
      const statement=await service.statement(f.buyerId,id,{requestedResolution:'REFUND',content:'Courier evidence confirms physical delivery of returned items',clientRequestId:randomUUID()});const refs=[{kind:'STATEMENT',id:statement.id}];
      await assert.rejects(service.intervene(admin,id,{action:'inspect',version:await cv(id),returnVersion:await rv(id),reason:'No bypass while seller is still within its deadline',condition:'ACCEPTED',evidenceRefs:refs},'test'),{code:'RECEIPT_NOT_DUE'});
      storeStates.get(f.storeId).platformSuspended=true;
      await assert.rejects(returns.transition(seller,id,'receive',{expectedVersion:await rv(id)}),{status:403});
      await service.intervene(admin,id,{action:'inspect',version:await cv(id),returnVersion:await rv(id),reason:'Actual receipt verified with an issue requiring assessment',condition:'ISSUE_FOUND',evidenceRefs:refs},'test');
      assert.equal((await service.detail(admin,id)).returnProgress.status,'RECEIVED');
      await assert.rejects(service.intervene(admin,id,{action:'open_refund',version:await cv(id),returnVersion:await rv(id),reason:'An unresolved inspection issue cannot open a refund',evidenceRefs:[]},'test'),{code:'REFUND_NOT_READY'});
      await service.intervene(admin,id,{action:'inspect',version:await cv(id),returnVersion:await rv(id),reason:'Follow-up inspection verifies the returned goods are accepted',condition:'ACCEPTED',evidenceRefs:refs},'test');
      const version=await cv(id),returnVersion=await rv(id),results=await Promise.allSettled([1,2].map(()=>service.intervene(admin,id,{action:'open_refund',version,returnVersion,reason:'Open verified refund only after accepted receipt',evidenceRefs:[]},'test')));
      assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(storeStates.get(f.storeId).platformSuspended,true);
      assert.equal((await service.detail(admin,id)).returnProgress.status,'REFUND_PENDING');
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM order_service.order_outbox WHERE aggregate_id=$1 AND event_type='RefundRequested.v1'",[f.orderId])).rows[0].n,1);
      const account=await fixture(),accountReturn=await newReturn(account);await decide(accountReturn);await returns.transition(account.buyerId,accountReturn,'ship',{expectedVersion:await rv(accountReturn)});
      storeStates.get(account.storeId).accountBlocked=true;
      const accountProof=await service.statement(account.buyerId,accountReturn,{requestedResolution:'REFUND',content:'Verified courier receipt for a case whose seller account is suspended',clientRequestId:randomUUID()});
      await assert.rejects(service.intervene(reviewer,accountReturn,{action:'inspect',version:await cv(accountReturn),returnVersion:await rv(accountReturn),reason:'No intervention without the specifically granted permission',condition:'ACCEPTED',evidenceRefs:[{kind:'STATEMENT',id:accountProof.id}]},'test'),{code:'ADMIN_PERMISSION_REQUIRED'});
      await service.intervene(admin,accountReturn,{action:'inspect',version:await cv(accountReturn),returnVersion:await rv(accountReturn),reason:'Continue verified aftersales while the seller account stays suspended',condition:'ACCEPTED',evidenceRefs:[{kind:'STATEMENT',id:accountProof.id}]},'test');
      assert.equal(storeStates.get(account.storeId).accountBlocked,true);assert.equal(storeStates.get(account.storeId).platformSuspended,false);
      storeStates.get(account.storeId).accountBlocked=false;
    });
    await t.test('013 unresponsive seller paths require deadline and receipt evidence; timeout is not physical receipt',async()=>{
      const f=await fixture(),id=await newReturn(f);await take(id);await pool.query("UPDATE order_service.admin_cases SET due_at=now()-interval '1 hour' WHERE id=$1",[id]);
      await service.intervene(admin,id,{action:'take_review',version:await cv(id),returnVersion:await rv(id),reason:'Seller response deadline passed with no response',evidenceRefs:[]},'test');
      await adminReturns.decide(admin,id,{action:'approve',version:await rv(id),reason:'Return eligible after independent policy assessment',...basis});
      await returns.transition(f.buyerId,id,'ship',{expectedVersion:await rv(id)});await pool.query("UPDATE order_service.return_requests SET seller_receive_by=now()-interval '1 hour' WHERE id=$1",[id]);
      await assert.rejects(service.intervene(admin,id,{action:'inspect',version:await cv(id),returnVersion:await rv(id),reason:'A timeout alone must never acknowledge physical receipt',condition:'ACCEPTED',evidenceRefs:[]},'test'),{code:'RECEIPT_EVIDENCE_REQUIRED'});
    });
    await t.test('014 proposed decisions freeze facts, require independent review and retain withdrawn history',async()=>{
      const f=await fixture(),id=await dispute(f),statement=await service.statement(f.buyerId,id,{requestedResolution:'REFUND',content:'Buyer requests examination of damage at delivery',clientRequestId:randomUUID()});
      const p=await service.propose(admin,id,{version:await cv(id),reason:'Assess both parties before deciding responsibility',...basis,evidenceRefs:[{kind:'STATEMENT',id:statement.id}],outcome:'NO_COMPENSATION'});
      await grant(admin,'case.decision.approve');await assert.rejects(service.review(admin,id,p.id,{action:'publish',version:await cv(id),reason:'A proposer must never approve their own dispute'}),{code:'INDEPENDENT_REVIEW_REQUIRED'});
      await grant({id:seller},'case.decision.approve');await assert.rejects(service.review(await syncTestAdmin(pool,testAdmin(seller)),id,p.id,{action:'publish',version:await cv(id),reason:'A shop member is not an independent reviewer'}),{code:'PARTY_REVIEW_FORBIDDEN'});
      await service.statement(seller,id,{requestedResolution:'REJECT_CLAIM',content:'Seller provides additional information about packing',clientRequestId:randomUUID()});
      await assert.rejects(service.review(reviewer,id,p.id,{action:'publish',version:await cv(id),reason:'New information must invalidate the previous proposal'}),{code:'DECISION_SNAPSHOT_STALE'});
      await service.review(admin,id,p.id,{action:'withdraw',version:await cv(id),reason:'Withdraw stale proposal without overwriting old facts'});
      const next=await propose(id);await service.review(reviewer,id,next.id,{action:'publish',version:await cv(id),reason:'Independent review of the refreshed evidence set'});
      const detail=await service.detail(admin,id);assert.equal(detail.decisions.length,2);assert.equal(detail.decisions.find(d=>d.id===p.id).status,'WITHDRAWN');
      assert.equal((await pool.query('SELECT refunded_minor FROM order_service.orders WHERE id=$1',[f.orderId])).rows[0].refunded_minor,'0');
    });
    await t.test('016/017 appeal is time-limited, independent, immutable; reopening requires re-reservation and no stale receipt',async()=>{
      const f=await fixture(),id=await newReturn(f),original=await decide(id,'reject');
      await assert.rejects(returns.transition(seller,id,'receive',{expectedVersion:await rv(id)}),{code:'RETURN_STATE_CHANGED'});
      await returns.markRefunded(id);assert.equal((await pool.query('SELECT status FROM order_service.return_requests WHERE id=$1',[id])).rows[0].status,'REJECTED');
      const appeal=await service.appeal(f.buyerId,id,{decisionId:original.id,reason:'Buyer presents grounds to re-evaluate the rejection'});
      await grant(admin,'case.appeal.review');await assert.rejects(service.reviewAppeal(admin,id,appeal.id,{action:'claim',version:1,reason:'Original decision maker cannot review this appeal'}),{code:'INDEPENDENT_APPEAL_REVIEW_REQUIRED'});
      await service.reviewAppeal(appealReviewer,id,appeal.id,{action:'claim',version:1,reason:'An independent officer accepts the appeal for review'});
      await service.reviewAppeal(appealReviewer,id,appeal.id,{action:'overturn',version:2,reason:'The appeal merits a fresh review, without editing the old decision',evidenceRefs:[]});
      assert.equal((await pool.query('SELECT reason FROM order_service.case_decisions WHERE id=$1',[original.id])).rows[0].reason,original.reason);
      await service.intervene(admin,id,{action:'reopen',version:await cv(id),returnVersion:await rv(id),reason:'Reopen only after independently accepted appeal and reserve check',evidenceRefs:[]},'test');
      await adminReturns.decide(admin,id,{action:'approve',version:await rv(id),reason:'Approve after the reopened case is reassessed',...basis});
      assert.equal((await service.detail(admin,id)).decisions.length,2);
      const late=await fixture(),lateId=await newReturn(late),lateDecision=await decide(lateId,'reject');await pool.query("UPDATE order_service.case_decisions SET appeal_until=now()-interval '1 second' WHERE id=$1",[lateDecision.id]);
      await assert.rejects(service.appeal(late.buyerId,lateId,{decisionId:lateDecision.id,reason:'An appeal arriving after intake expiry must be rejected'}),{code:'APPEAL_WINDOW_CLOSED'});
    });
    await t.test('016 reopening cannot exceed quantity or money already reserved by a different case',async()=>{
      const f=await fixture(),id=await newReturn(f),decision=await decide(id,'reject');await appealOverturn(f,id,decision);await newReturn(f);
      await assert.rejects(service.intervene(admin,id,{action:'reopen',version:await cv(id),returnVersion:await rv(id),reason:'Reserved quantity cannot be duplicated by reopening an older case',evidenceRefs:[]},'test'),{code:'RETURN_QUANTITY_RESERVED'});
    });
    await t.test('018 report groups snapshot categories and uses completed appeals as denominator',async()=>{
      const storeId=randomUUID(),categoryId=randomUUID(),one=await fixture({storeId,categoryId}),id=await newReturn(one),d=await decide(id,'reject');
      const a=await service.appeal(one.buyerId,id,{decisionId:d.id,reason:'Request independent confirmation of the published decision'});
      await service.reviewAppeal(appealReviewer,id,a.id,{action:'claim',version:1,reason:'Accept independent assessment of the submitted appeal'});
      await service.reviewAppeal(appealReviewer,id,a.id,{action:'uphold',version:2,reason:'The original decision is supported by the reviewed facts',evidenceRefs:[]});
      await service.fulfill(admin,id,{version:await cv(id),note:'No compensation obligation remains after the decision is upheld'});
      const two=await fixture({storeId,categoryId}),otherId=await newReturn(two),otherDecision=await decide(otherId,'reject');await appealOverturn(two,otherId,otherDecision);
      const three=await fixture({storeId,categoryId:null}),thirdId=await newReturn(three),thirdDecision=await decide(thirdId,'reject');
      await service.appeal(three.buyerId,thirdId,{decisionId:thirdDecision.id,reason:'This pending appeal must not inflate the completed denominator'});
      const report=await service.report(admin,{storeId,groupBy:'reason'}),row=report.items[0];assert.equal(row.cases,3);assert.equal(row.decidedAppeals,2);assert.equal(row.acceptedAppeals,1);assert.equal(row.appealAcceptanceRate,0.5);assert.equal(row.resolved,1);
      const categories=await service.report(admin,{storeId,groupBy:'category'});assert.ok(categories.items.some(item=>item.label==='UNKNOWN'));assert.equal(categories.items.find(item=>item.label===categoryId).cases,2);
    });
    await t.test('case evidence is scanned/private and decision writes roll back when audit fails',async()=>{
      const f=await fixture(),id=await dispute(f),image=await sharp({create:{width:2,height:2,channels:3,background:'#6688ff'}}).png().toBuffer();
      const uploaded=await service.upload(f.buyerId,id,image,'image/png');assert.equal((await service.publicDetail(f.buyerId,id)).evidence.length,1);
      await assert.rejects(service.publicEvidence(randomUUID(),id,uploaded.id),{status:403});
      const access=await service.imageGrant(admin,id,uploaded.id,'Inspect scanned evidence before proposing a decision'),token=new URL(access.url,'http://test').searchParams.get('grant');
      assert.equal((await service.image(admin,id,uploaded.id,token)).mimeType,'image/webp');await assert.rejects(service.image(admin,id,uploaded.id,token),{code:'EVIDENCE_GRANT_EXPIRED'});
      const brokenCases=new CaseService({pool:{query:(...args)=>pool.query(...args),connect:async()=>{const db=await pool.connect();return {release:()=>db.release(),query:(sql,args)=>{if(sql.includes('INSERT INTO order_service.case_events'))throw Error('Audit unavailable');return db.query(sql,args);}};}}});
      await assert.rejects(new CaseResolutionService(brokenCases).propose(admin,id,{version:await cv(id),reason:'This proposal must roll back if the audit is unavailable',...basis,evidenceRefs:[{kind:'CASE_EVIDENCE',id:uploaded.id}],outcome:'NO_COMPENSATION'}),/Audit unavailable/);
      assert.equal((await service.detail(admin,id)).decisions.length,0);
    });
    await t.test('HTTP protects new admin commands and exposes only public participant facts',async()=>{
      const f=await fixture(),id=await newReturn(f);await take(id);const {createHandler}=await import('../src/server.js');
      const fake={...order,identity:async(path,bearer)=>path==='/auth/me'?{user:bearer==='Bearer resolution-admin'?admin:{id:f.buyerId,roles:['buyer']}}:order.identity(path,bearer)};
      const server=http.createServer(createHandler(fake,lifecycle,returns));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}/api/v2`;
      const headers={Authorization:'Bearer resolution-admin','Content-Type':'application/json',Origin:process.env.FRONTEND_ORIGIN||'http://localhost:5173'};
      try{assert.equal((await fetch(`${base}/admin/cases/${id}/resolution`)).status,401);
        assert.equal((await fetch(`${base}/admin/case-reports`,{headers:{Authorization:'Bearer buyer'}})).status,403);
        assert.equal((await fetch(`${base}/admin/cases/${id}/messages`,{method:'POST',headers,body:JSON.stringify({visibility:'INTERNAL',body:'HTTP_PRIVATE_NOTE',clientRequestId:randomUUID(),version:await cv(id)})})).status,200);
        const response=await fetch(`${base}/cases/${id}/resolution`,{headers:{Authorization:'Bearer buyer'}});assert.equal(response.status,200);assert.doesNotMatch(JSON.stringify(await response.json()),/HTTP_PRIVATE_NOTE/);
      }finally{await new Promise(resolve=>server.close(resolve));}
    });
  }finally{
    const orders=fixtures.map(f=>f.orderId),groups=fixtures.map(f=>f.groupId);
    try{const ids=(await pool.query('SELECT id FROM order_service.return_requests WHERE shop_order_id=ANY($1::uuid[])',[orders])).rows.map(row=>row.id);
      await pool.query('DELETE FROM order_service.admin_cases WHERE shop_order_id=ANY($1::uuid[])',[orders]);
      for(const table of ['admin_return_actions','return_history','return_inspections','return_evidence','return_items'])await pool.query(`DELETE FROM order_service.${table} WHERE ${table==='return_inspections'?'request_id':'request_id'}=ANY($1::uuid[])`,[ids]);
      await pool.query('DELETE FROM order_service.return_requests WHERE id=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM order_service.order_outbox WHERE aggregate_id=ANY($1::uuid[])',[orders]);
      await pool.query('DELETE FROM order_service.order_status_history WHERE shop_order_id=ANY($1::uuid[])',[orders]);await pool.query('DELETE FROM order_service.order_items WHERE order_id=ANY($1::uuid[])',[orders]);
      await pool.query('DELETE FROM order_service.orders WHERE id=ANY($1::uuid[])',[orders]);await pool.query('DELETE FROM order_service.order_groups WHERE id=ANY($1::uuid[])',[groups]);
      await pool.query('DELETE FROM order_service.checkout_quotes WHERE id=ANY($1::uuid[])',[fixtures.map(f=>f.quoteId)]);
      await pool.query('DELETE FROM order_service.case_permissions WHERE user_id=ANY($1::uuid[])',[[...actors.map(a=>a.id),seller]]);await pool.query('DELETE FROM order_service.payment_inbox WHERE event_id=ANY($1::text[])',[inboxIds]);
    }finally{await pool.end();}
  }
});
