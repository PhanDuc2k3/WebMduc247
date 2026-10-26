import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

test('NOTI-07 optional preferences sync marketing to Identity and protect essential email',
  {skip:!process.env.NOTIFICATION_TEST_DATABASE_URL||!process.env.IDENTITY_TEST_API_URL||
    !process.env.NOTIFICATION_TEST_API_URL},async()=>{
    const pool=new pg.Pool({connectionString:process.env.NOTIFICATION_TEST_DATABASE_URL});
    const identity=process.env.IDENTITY_TEST_API_URL,notification=process.env.NOTIFICATION_TEST_API_URL;
    const email='notification-pref-'+randomUUID()+'@example.test',password='test-password-123';
    let userId;
    try{
      await pool.query("UPDATE auth_rate_limits SET window_start=now()-interval '1 hour'");
      const registered=await fetch(identity+'/api/v2/auth/register',{method:'POST',
        headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},
        body:JSON.stringify({email,fullName:'Notification User',password,confirmPassword:password})});
      assert.equal(registered.status,201,await registered.text());
      userId=(await pool.query('SELECT id FROM users WHERE email=$1',[email])).rows[0].id;
      const logged=await fetch(identity+'/api/v2/auth/login',{method:'POST',
        headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},
        body:JSON.stringify({email,password})});
      assert.equal(logged.status,200);
      const token=(await logged.json()).accessToken;
      const before=await fetch(notification+'/api/v2/notifications/preferences',
        {headers:{Authorization:'Bearer '+token}});
      assert.equal(before.status,200);
      assert.equal((await before.json()).essentialEmail,true);
      const updated=await fetch(notification+'/api/v2/notifications/preferences',{method:'PATCH',
        headers:{Origin:'http://localhost:5173',Authorization:'Bearer '+token,
          'Content-Type':'application/json'},
        body:JSON.stringify({marketingOptIn:true,emailChat:true,webChat:false})});
      assert.equal(updated.status,200,await updated.text());
      const result=await (await fetch(notification+'/api/v2/notifications/preferences',
        {headers:{Authorization:'Bearer '+token}})).json();
      assert.equal(result.marketingOptIn,true);
      assert.equal(result.emailChat,true);
      assert.equal(result.webChat,false);
      const profile=await (await fetch(identity+'/api/v2/users/me',
        {headers:{Authorization:'Bearer '+token}})).json();
      assert.equal(profile.marketingOptIn,true);
      const forbidden=await fetch(notification+'/api/v2/notifications/preferences',{method:'PATCH',
        headers:{Origin:'http://localhost:5173',Authorization:'Bearer '+token,
          'Content-Type':'application/json'},body:JSON.stringify({essentialEmail:false})});
      assert.equal(forbidden.status,400);
    }finally{
      if(userId){
        await pool.query('DELETE FROM engagement.notification_preferences WHERE user_id=$1',[userId]);
        await pool.query('DELETE FROM users WHERE id=$1',[userId]);
      }
      await pool.end();
    }
  });
