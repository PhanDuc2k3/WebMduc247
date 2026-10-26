import pg from 'pg';
import {adminId} from '../../../packages/contracts/platform-admin.js';
import {caseInput,caseText} from '../src/case-contract.js';

// Deliberately no HTTP endpoint for granting exceptional powers.
let raw='';for await(const chunk of process.stdin){raw+=chunk;if(raw.length>4096)throw Error('Input too large');}
const input=caseInput(JSON.parse(raw),['userId','permission','action','operator','reason','expiresAt']);
adminId(input.userId);
if(!['exception.request','exception.approve','evidence.supervise','case.decision.approve','case.appeal.review','aftersales.intervene','orders.cancel_blocked'].includes(input.permission)||!['grant','revoke'].includes(input.action))
  throw Error('Unsupported permission/action');
const operator=caseText(input.operator,3,100),reason=caseText(input.reason,10,500);
if(input.expiresAt&&(!Number.isFinite(Date.parse(input.expiresAt))||Date.parse(input.expiresAt)<=Date.now()))throw Error('Invalid expiry');
const databaseUrl=process.env.ORDER_DATABASE_URL||process.env.IDENTITY_DATABASE_URL;
if(!databaseUrl)throw Error('ORDER_DATABASE_URL is required; no permission changes made.');
const pool=new pg.Pool({connectionString:databaseUrl});
const db=await pool.connect();
try{
  await db.query('BEGIN');
  if(input.action==='grant')await db.query(`INSERT INTO order_service.case_permissions(user_id,permission,granted_by,reason,expires_at)
    VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,permission) DO UPDATE SET granted_by=$3,reason=$4,expires_at=$5,revoked_at=NULL,granted_at=now()`,
    [input.userId,input.permission,operator,reason,input.expiresAt||null]);
  else await db.query('UPDATE order_service.case_permissions SET revoked_at=now() WHERE user_id=$1 AND permission=$2',[input.userId,input.permission]);
  await db.query('INSERT INTO order_service.case_permission_history(user_id,permission,action,actor,reason) VALUES($1,$2,$3,$4,$5)',
    [input.userId,input.permission,input.action,operator,reason]);
  await db.query('COMMIT');console.log('Case permission updated; account must still be an active platform administrator.');
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
