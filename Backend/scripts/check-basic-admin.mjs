import pg from 'pg';
const results=[];
async function inspect(owner,variable,queries){
  const value=process.env[variable]||process.env.IDENTITY_DATABASE_URL;
  if(!value){results.push({owner,ok:false,code:'NOT_CONFIGURED'});return;}
  const url=new URL(value);if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('This helper only inspects local development databases');
  const db=new pg.Client({connectionString:value,connectionTimeoutMillis:3000});
  try{await db.connect();await db.query('BEGIN READ ONLY');for(const [name,sql] of queries){const {rows}=await db.query(sql);results.push({owner,name,rows});}}
  catch{results.push({owner,ok:false,code:'DATABASE_OR_SCHEMA_UNAVAILABLE'});}
  finally{await db.query('ROLLBACK').catch(()=>{});await db.end();}
}
await inspect('identity','IDENTITY_DATABASE_URL',[
  ['roles','SELECT role,count(*)::int AS members FROM admin_role_assignments GROUP BY role ORDER BY role'],
  ['note_teams','SELECT t.id,count(m.staff_id)::int AS members FROM user_admin_teams t LEFT JOIN user_admin_team_members m ON t.id=m.team_id GROUP BY t.id ORDER BY t.id'],
]);
await inspect('order','ORDER_DATABASE_URL',[
  ['sources','SELECT source,updated_at,error_code FROM order_service.work_source_health ORDER BY source'],
  ['leaders','SELECT id,leader_id IS NOT NULL AS configured FROM order_service.work_teams ORDER BY id'],
  ['migration',"SELECT EXISTS(SELECT 1 FROM order_service.schema_migrations WHERE name='026_case_deadline_version.sql') AS current"],
]);
await inspect('payment','PAYMENT_DATABASE_URL',[
  ['migration',"SELECT EXISTS(SELECT 1 FROM payment_service.schema_migrations WHERE name='007_admin_operations.sql') AS current"],
]);
console.log(JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));
if(results.some(r=>r.ok===false))process.exitCode=1;
