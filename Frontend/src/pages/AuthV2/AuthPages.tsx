import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { identityApi } from "../../api/identityApi";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 flex items-center justify-center p-4">
    <section className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-7 space-y-6">
      <div className="text-center"><Link to="/" className="font-extrabold text-2xl text-slate-700">MDUC247</Link><h1 className="text-xl font-bold mt-4">{title}</h1></div>
      {children}
    </section>
  </main>;
}

function Field({ label, value, onChange, type = "text", minLength }: { label: string; value: string; onChange: (value: string) => void; type?: string; minLength?: number }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500" type={type} value={value} onChange={event => onChange(event.target.value)} minLength={minLength} required /></label>;
}

function Submit({ busy, children }: { busy: boolean; children: ReactNode }) {
  return <button type="submit" disabled={busy} className="w-full rounded-lg bg-slate-700 py-2.5 font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{busy ? "Đang xử lý..." : children}</button>;
}

function useRequest() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(""); setMessage("");
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xử lý yêu cầu."); }
    finally { setBusy(false); }
  }
  return { busy, error, message, setMessage, run };
}

function Feedback({ error, message }: { error: string; message: string }) {
  return <>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{message && <p role="status" className="text-sm text-green-700">{message}</p>}</>;
}

export function LoginV2() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const { busy, error, message, run } = useRequest();
  function submit(event: FormEvent) { event.preventDefault(); void run(async () => { await identityApi.login(email, password); navigate("/"); }); }
  return <Card title="Đăng nhập"><form onSubmit={submit} className="space-y-4">
    <Field label="Email" type="email" value={email} onChange={setEmail} />
    <Field label="Mật khẩu" type="password" value={password} onChange={setPassword} />
    {new URLSearchParams(window.location.search).has("registered") && <p role="status" className="text-sm text-green-700">Tài khoản đã được tạo. Bạn có thể đăng nhập.</p>}
    <Feedback error={error} message={message} /><Submit busy={busy}>Đăng nhập</Submit>
  </form><div className="flex justify-between text-sm text-slate-700"><Link to="/forgot-password" className="underline">Quên mật khẩu?</Link><Link to="/register" className="underline">Tạo tài khoản</Link></div><Link to={`/verify-email?email=${encodeURIComponent(email.trim())}`} className="block text-center text-sm text-slate-700 underline">Chưa xác minh email? Gửi lại liên kết</Link><Link to="/account-help" className="block text-center text-sm text-slate-700 underline">Kháng nghị khóa tài khoản / yêu cầu dữ liệu cá nhân</Link><Link to="/admin/login" className="block border-t pt-4 text-center text-xs text-slate-500">Đăng nhập quản trị sàn →</Link></Card>;
}

export function RegisterV2() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(""); const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState("");
  const { busy, error, message, run } = useRequest();
  function submit(event: FormEvent) { event.preventDefault(); void run(async () => {
    const registration = await identityApi.register({ fullName, email, password, confirmPassword });
    if (registration.requiresEmailVerification) {
      navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`);
      return;
    }
    try {
      await identityApi.login(email, password);
      navigate("/");
    } catch {
      navigate("/login?registered=1");
    }
  }); }
  return <Card title="Tạo tài khoản"><form onSubmit={submit} className="space-y-4">
    <Field label="Họ tên" value={fullName} onChange={setFullName} />
    <Field label="Email" type="email" value={email} onChange={setEmail} />
    <Field label="Mật khẩu (ít nhất 8 ký tự, có chữ thường và ký tự đặc biệt)" type="password" minLength={8} value={password} onChange={setPassword} />
    <Field label="Xác nhận mật khẩu" type="password" minLength={8} value={confirmPassword} onChange={setConfirmPassword} />
    <Feedback error={error} message={message} /><Submit busy={busy}>Đăng ký</Submit>
  </form><p className="text-center text-sm">Đã có tài khoản? <Link to="/login" className="underline">Đăng nhập</Link></p></Card>;
}

function useEmailLink() {
  const [email] = useState(() => new URLSearchParams(window.location.search).get("email") || "");
  const [linkToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
  useEffect(() => { if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search); }, []);
  return { email, linkToken };
}

export function VerifyEmailV2() {
  const { email, linkToken } = useEmailLink();
  const { busy, error, message, setMessage, run } = useRequest();
  function verify(event: FormEvent) { event.preventDefault(); void run(async () => { await identityApi.verifyEmail(email, linkToken); setMessage("Email đã được xác minh. Bạn có thể đăng nhập."); }); }
  function resend() { void run(async () => { const result = await identityApi.resendVerification(email); setMessage(result.message); }); }
  return <Card title="Xác minh email"><p className="text-sm text-slate-600">Chúng tôi đã gửi liên kết xác minh đến <strong>{email}</strong>. Liên kết có hiệu lực 15 phút.</p>
    {linkToken && <form onSubmit={verify}><Submit busy={busy}>Xác minh email</Submit></form>}
    <Feedback error={error} message={message} />
    <button type="button" onClick={resend} disabled={busy || !email} className="w-full rounded-lg border border-slate-500 py-2 text-slate-700 disabled:opacity-50">Gửi lại liên kết</button>
    <Link to="/login" className="block text-center text-sm underline">Đến trang đăng nhập</Link></Card>;
}

export function ForgotPasswordV2() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const { busy, error, message, run } = useRequest();
  function submit(event: FormEvent) { event.preventDefault(); void run(async () => {
    await identityApi.forgotPassword(email);
    navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`);
  }); }
  return <Card title="Quên mật khẩu"><form onSubmit={submit} className="space-y-4"><Field label="Email" type="email" value={email} onChange={setEmail} />
    <Feedback error={error} message={message} /><Submit busy={busy}>Gửi mã OTP</Submit></form><Link to="/login" className="block text-center text-sm underline">Quay lại đăng nhập</Link></Card>;
}

export function ResetPasswordV2() {
  const [email, setEmail] = useState(() => new URLSearchParams(window.location.search).get("email") || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState("");
  const [completed, setCompleted] = useState(false);
  const { busy, error, message, setMessage, run } = useRequest();
  function submit(event: FormEvent) { event.preventDefault(); void run(async () => {
    const result = await identityApi.resetPassword(email, code, password, confirmPassword);
    setMessage(result.message); setCode(""); setPassword(""); setConfirmPassword(""); setCompleted(true);
  }); }
  function resend() { void run(async () => { const result = await identityApi.forgotPassword(email); setMessage(result.message); }); }
  return <Card title="Đặt lại mật khẩu"><p className="text-sm text-slate-600">Nếu email tồn tại, mã OTP 6 chữ số đã được gửi từ no-reply@mduc247.site. Mã có hiệu lực 10 phút.</p>
    {!completed && <form onSubmit={submit} className="space-y-4">
    <Field label="Email" type="email" value={email} onChange={setEmail} />
    <label className="block text-sm font-medium text-slate-700">Mã OTP<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value)} required /></label>
    <Field label="Mật khẩu mới (ít nhất 8 ký tự, có chữ thường và ký tự đặc biệt)" type="password" minLength={8} value={password} onChange={setPassword} />
    <Field label="Xác nhận mật khẩu mới" type="password" minLength={8} value={confirmPassword} onChange={setConfirmPassword} />
    <Submit busy={busy}>Đặt lại mật khẩu</Submit>
  </form>}
    <Feedback error={error} message={message} />
    {!completed && <button type="button" onClick={resend} disabled={busy || !email} className="w-full rounded-lg border border-slate-500 py-2 text-slate-700 disabled:opacity-50">Gửi lại mã OTP</button>}
    <Link to="/login" className="block text-center text-sm underline">Đến trang đăng nhập</Link></Card>;
}
