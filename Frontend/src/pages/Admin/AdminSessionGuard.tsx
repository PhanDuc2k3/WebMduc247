import {useEffect,useState,type FormEvent} from 'react';
import {useNavigate} from 'react-router-dom';
import {identityApi,type AdminSessionInfo} from '../../api/identityApi';
import {adminSecurityApi} from '../../api/adminSecurityApi';
import {useAdminSession} from './AdminSession';
import {AdminDialog} from './AdminUi';
import './admin-security.css';
export default function AdminSessionGuard(){
  const user=useAdminSession(),navigate=useNavigate();
  const [session,setSession]=useState<AdminSessionInfo|null>(identityApi.getAdminSession()||user.adminSession||null),[remaining,setRemaining]=useState(Infinity);
  const [reauth,setReauth]=useState(false),[password,setPassword]=useState(''),[code,setCode]=useState(''),[recovery,setRecovery]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[passkey,setPasskey]=useState(false);
  useEffect(()=>{
    let alive=true,expiring=false,lastAction=0,lastPing=0;
    const changed=()=>setSession(identityApi.getAdminSession());
    const cleared=()=>navigate('/admin/login?expired=1',{replace:true});
    const prompt=()=>{setReauth(true);setPassword('');setCode('');setError('');};
    const activity=()=>{lastAction=Date.now();};
    const tick=setInterval(()=>{
      const current=identityApi.getAdminSession();if(!current)return;
      const seconds=Math.ceil((Math.min(Date.parse(current.expiresAt),Date.parse(current.idleExpiresAt))-Date.now())/1000);setRemaining(seconds);
      if(seconds<=0&&!expiring){expiring=true;void identityApi.logout().catch(()=>{}).finally(()=>{if(alive)cleared();});}
      if(!expiring&&lastAction>lastPing&&Date.now()-lastPing>45000){lastPing=Date.now();void adminSecurityApi.activity().catch(()=>{});}
    },1000);
    window.addEventListener('adminSessionUpdated',changed);window.addEventListener('adminSessionCleared',cleared);window.addEventListener('adminReauthRequired',prompt);
    for(const event of ['pointerdown','keydown','scroll','focus'])window.addEventListener(event,activity,{passive:true});
    return()=>{alive=false;clearInterval(tick);window.removeEventListener('adminSessionUpdated',changed);window.removeEventListener('adminSessionCleared',cleared);window.removeEventListener('adminReauthRequired',prompt);for(const event of ['pointerdown','keydown','scroll','focus'])window.removeEventListener(event,activity);};
  },[navigate]);
  useEffect(()=>{let active=true;if(reauth)adminSecurityApi.security().then(value=>{if(active)setPasskey(value.passkeysEnabled&&value.passkeys.length>0);}).catch(()=>{});return()=>{active=false;};},[reauth]);
  async function confirm(event:FormEvent,withPasskey=false){event.preventDefault();if(busy)return;setBusy(true);setError('');try{if(withPasskey)await adminSecurityApi.passkeyReauth(password);else await adminSecurityApi.reauth(password,code.trim(),recovery);setPassword('');setCode('');setReauth(false);}catch(cause){setError(cause instanceof Error?cause.message:'Chưa xác thực lại được.');}finally{setBusy(false);}}
  return <>{session&&remaining>0&&remaining<=60&&<div role="alert" className="pa-session-warning">Phiên quản trị sẽ hết hạn sau {remaining} giây. <button className="pa-text-link" onClick={()=>void adminSecurityApi.activity().catch(()=>{})}>Tiếp tục phiên</button><span> Giới hạn tối đa: {new Date(session.expiresAt).toLocaleTimeString('vi-VN',{timeZone:'Asia/Bangkok'})}.</span></div>}
    {reauth&&<AdminDialog title="Xác thực lại" close={()=>{if(!busy){setReauth(false);setPassword('');setCode('');}}} busy={busy}><form className="pa-detail pa-case-form" onSubmit={confirm}><p className="pa-case-wide">Nhập mật khẩu và yếu tố thứ hai để tiếp tục. Sau khi xác minh, hãy kiểm tra dữ liệu rồi tự gửi lại thao tác; hệ thống không gửi thay bạn.</p><label className="pa-case-wide">Mật khẩu<input required type="password" autoComplete="current-password" maxLength={128} value={password} onChange={event=>setPassword(event.target.value)}/></label><label className="pa-case-wide">{recovery?'Mã khôi phục dùng một lần':'Mã từ ứng dụng xác thực'}<input required autoComplete="one-time-code" maxLength={recovery?24:6} value={code} onChange={event=>setCode(event.target.value)}/></label><label className="pa-case-wide"><input type="checkbox" checked={recovery} onChange={event=>{setRecovery(event.target.checked);setCode('');}}/> Dùng mã khôi phục</label>{error&&<p role="alert" className="pa-error pa-case-wide">{error}</p>}<button className="pa-button" disabled={busy}>Xác minh</button>{passkey&&<button className="pa-button pa-button-light" type="button" disabled={busy||!password} onClick={event=>void confirm(event,true)}>Dùng passkey</button>}</form></AdminDialog>}
  </>;
}
