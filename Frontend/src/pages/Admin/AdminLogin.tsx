import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole, ShieldCheck, Store, Package, ChartNoAxesCombined } from 'lucide-react';
import { identityApi,type AdminLoginChallenge } from '../../api/identityApi';
import {adminSecurityApi} from '../../api/adminSecurityApi';
import AdminRecoveryCodes from './AdminRecoveryCodes';
import { adminDestination, isPlatformAdmin } from './adminPolicy';
import './platform-admin.css';
import './admin-security.css';

export default function AdminLogin() {
  const navigate = useNavigate(); const [params] = useSearchParams();
  const destination = adminDestination(params.get('next'));
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [challenge,setChallenge]=useState<AdminLoginChallenge|null>(null),[setup,setSetup]=useState<{secret:string;otpauthUri:string}|null>(null);
  const [code,setCode]=useState(''),[recovery,setRecovery]=useState(false),[codes,setCodes]=useState<string[]>([]),[notice,setNotice]=useState('');
  const [requestRecovery,setRequestRecovery]=useState(false),[evidenceReference,setEvidenceReference]=useState(''),[recoveryReason,setRecoveryReason]=useState('');
  useEffect(() => {
    let active = true;
    if(params.has('logout'))return;
    identityApi.me().then(user => { if (active && isPlatformAdmin(user)) navigate(destination, { replace: true }); }).catch(() => {});
    return () => { active = false; };
  }, [navigate, destination,params]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await identityApi.adminLogin(email.trim(), password);setPassword('');setChallenge(result);setCode('');
      if(result.enrollmentRequired)setSetup(await identityApi.adminEnrollStart(result.challengeToken));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa thể đăng nhập. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  async function verify(event:FormEvent){event.preventDefault();if(!challenge||busy)return;setBusy(true);setError('');try{
    if(challenge.enrollmentRequired){const result=await identityApi.adminEnrollConfirm(challenge.challengeToken,code.trim());setSetup(null);setCode('');setCodes(result.recoveryCodes||[]);}
    else{await identityApi.adminVerify(challenge.challengeToken,recovery?{recoveryCode:code.trim()}:{code:code.trim()});navigate(destination,{replace:true});}
  }catch(cause){setError(cause instanceof Error?cause.message:'Chưa xác minh được MFA.');}finally{setBusy(false);}}
  async function passkey(){if(!challenge||busy)return;setBusy(true);setError('');try{await adminSecurityApi.passkeyLogin(challenge.challengeToken);navigate(destination,{replace:true});}catch(cause){setError(cause instanceof Error?cause.message:'Chưa xác minh được passkey.');}finally{setBusy(false);}}
  async function recover(event:FormEvent){event.preventDefault();if(!challenge||busy)return;setBusy(true);setError('');try{const result=await identityApi.adminRecoveryRequest(challenge.challengeToken,evidenceReference.trim(),recoveryReason.trim());setNotice(result.message);setChallenge(null);setRequestRecovery(false);setCode('');}catch(cause){setError(cause instanceof Error?cause.message:'Chưa gửi được đề nghị.');}finally{setBusy(false);}}
  return <main className="pa-login">
    <section className="pa-login-story">
      <Link to="/" className="pa-brand"><span className="pa-brand-icon"><Store size={22} /></span><strong>MDUC247<span>PLATFORM CONSOLE</span></strong></Link>
      <div className="pa-login-story-copy"><span className="pa-eyebrow">DÀNH CHO ĐỘI NGŨ VẬN HÀNH</span>
        <h1>Một nơi để vận hành<br /><em>toàn bộ sàn.</em></h1>
        <p>Kết nối dữ liệu, theo dõi hoạt động và quản lý trải nghiệm mua sắm trên MDUC247.</p>
        <div className="pa-login-illustration" aria-hidden="true"><div className="pa-illustration-top"><span /><span /><span /></div>
          <div className="pa-illustration-body"><div className="pa-illustration-nav"><i /><i /><i /><i /></div><div className="pa-illustration-main">
            <div><span><Store size={20} />Cửa hàng</span><span><Package size={20} />Sản phẩm</span></div>
            <div className="pa-illustration-chart"><ChartNoAxesCombined size={85} strokeWidth={1} /><span>Toàn cảnh hoạt động sàn</span></div>
          </div></div><div className="pa-security-tag"><ShieldCheck size={17} />Phân quyền theo tài khoản</div></div>
      </div><p className="pa-login-footer">© {new Date().getFullYear()} MDUC247 · Không gian quản trị tập trung</p>
    </section>
    <section className="pa-login-form-side"><Link to="/" className="pa-back"><ArrowLeft size={16} /> Về trang mua sắm</Link>
      <div className="pa-login-card"><div className="pa-login-lock"><LockKeyhole size={25} /></div>
        <span className="pa-eyebrow">QUẢN TRỊ SÀN</span><h2>Chào mừng trở lại</h2><p>Đăng nhập để truy cập bảng điều hành MDUC247.</p>
        {notice&&<p role="status">{notice}</p>}
        {params.get('logout')==='unconfirmed'&&<p className="pa-error" role="alert">Đã xóa dữ liệu đăng nhập trên trình duyệt. Chưa kết nối được để xác nhận thu hồi phiên trên máy chủ.</p>}
        {codes.length>0?<AdminRecoveryCodes codes={codes} onDone={()=>{setCodes([]);setChallenge(null);identityApi.finishAdminLogin();navigate(destination,{replace:true});}}/>:challenge?<>
          <h3>{challenge.enrollmentRequired?'Đăng ký ứng dụng xác thực':'Xác thực bước hai'}</h3>
          {setup&&<div className="pa-mfa-setup"><p>Thêm tài khoản trong ứng dụng xác thực bằng khóa dưới đây (TOTP, 6 số, chu kỳ 30 giây).</p><code>{setup.secret}</code><a href={setup.otpauthUri}>Mở bằng ứng dụng xác thực</a><p>Nhập mã trong ứng dụng để hoàn tất đăng ký.</p></div>}
          {requestRecovery?<form onSubmit={recover}><p>Người phụ trách bảo mật sẽ kiểm tra bằng chứng danh tính và duyệt độc lập. Không gửi secret hoặc mã khôi phục vào hồ sơ.</p><label>Mã hồ sơ xác minh danh tính<input required minLength={8} maxLength={200} value={evidenceReference} onChange={event=>setEvidenceReference(event.target.value)}/></label><label>Lý do khôi phục<textarea required minLength={10} maxLength={500} value={recoveryReason} onChange={event=>setRecoveryReason(event.target.value)}/></label>{error&&<p role="alert" className="pa-error">{error}</p>}<button disabled={busy} className="pa-button">Gửi đề nghị khôi phục MFA</button></form>:<form onSubmit={verify}>
            <label>{recovery?'Mã khôi phục':'Mã từ ứng dụng xác thực'}<input required autoComplete="one-time-code" inputMode={recovery?'text':'numeric'} maxLength={recovery?24:6} value={code} onChange={event=>setCode(event.target.value)} disabled={busy}/></label>
            {error&&<p className="pa-error" role="alert">{error}</p>}<button disabled={busy||(challenge.enrollmentRequired&&!setup)} className="pa-button pa-login-submit">{busy?'Đang xác minh…':'Xác minh MFA'}</button>
            {!challenge.enrollmentRequired&&<><button type="button" className="pa-text-link" onClick={()=>{setRecovery(v=>!v);setCode('');}}>{recovery?'Dùng mã TOTP':'Dùng mã khôi phục một lần'}</button>{challenge.passkeysEnabled&&<button type="button" className="pa-button pa-button-light" disabled={busy} onClick={()=>void passkey()}>Dùng passkey đã đăng ký</button>}<button type="button" className="pa-text-link" onClick={()=>setRequestRecovery(true)}>Mất ứng dụng và mã khôi phục</button></>}
          </form>}
          {challenge.recoveryEnrollment&&!requestRecovery&&<button type="button" className="pa-text-link" onClick={()=>setRequestRecovery(true)}>Gửi lại đề nghị khôi phục khi phê duyệt cũ mất hiệu lực</button>}
          <button type="button" className="pa-text-link" disabled={busy} onClick={()=>{setChallenge(null);setSetup(null);setCode('');setRequestRecovery(false);setError('');}}>Đăng nhập lại từ đầu</button>
        </>:<form onSubmit={submit}>
          <label htmlFor="admin-email">Email quản trị<input id="admin-email" type="email" autoComplete="username" placeholder="Nhập email của bạn" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} disabled={busy} /></label>
          <label htmlFor="admin-password">Mật khẩu<span className="pa-password"><input id="admin-password" type={visible ? 'text' : 'password'} autoComplete="current-password" placeholder="Nhập mật khẩu" value={password} onChange={event => setPassword(event.target.value)} required maxLength={128} disabled={busy} />
            <button type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>
          <Link to="/forgot-password" className="pa-forgot">Quên mật khẩu?</Link>
          {error && <p className="pa-error" role="alert">{error}</p>}
          <button className="pa-button pa-login-submit" type="submit" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập quản trị'}{!busy && <ArrowRight size={18} />}</button>
        </form>}<div className="pa-login-note"><Check size={16} /><p>Chỉ phiên đã hoàn tất MFA và có quyền quản trị sàn mới có thể truy cập.</p></div>
      </div><div className="pa-login-help">Bạn là khách hàng hoặc người bán? <Link to="/login">Đăng nhập mua sắm</Link></div>
    </section>
  </main>;
}
