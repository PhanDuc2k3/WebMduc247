import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Camera, Check, Eye, EyeOff, Gift, LockKeyhole, MapPin, Package, ShieldCheck, UserRound } from "lucide-react";
import { profileApi, type Address, type AddressInput, type DeletionRequest, type Profile } from "../../api/profileApi";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { formatAddress } from "../../utils/formatAddress";
import "./ProfileV2.css";

type Tab = "info" | "addresses" | "payment" | "security" | "settings";
const tabs: { id: Tab; label: string }[] = [
  { id: "info", label: "Thông tin cá nhân" }, { id: "addresses", label: "Địa chỉ" },
  { id: "payment", label: "Phương thức thanh toán" }, { id: "security", label: "Bảo mật" },
  { id: "settings", label: "Cài đặt" },
];
const emptyAddress: AddressInput = { receiverName: "", receiverPhone: "", provinceCode: "", districtCode: "", wardCode: "", addressLine: "", note: null, isDefault: false };
const maskEmail = (email: string) => {
  const [name, domain] = email.split("@");
  return domain ? `${name.slice(0, 4)}***@${domain}` : email;
};
const notifySuccess = (message: string) => toast.success(message, { containerId: "general-toast" });
const notifyError = (message: string, toastId?: string) => toast.error(message, { containerId: "general-toast", toastId });

export default function ProfileV2() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [tab, setTab] = useState<Tab>("info");
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [deletionPassword, setDeletionPassword] = useState("");
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [address, setAddress] = useState<AddressInput>(emptyAddress);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([profileApi.me(), profileApi.addresses().catch(() => ({ addresses: [] as Address[] })),
      profileApi.deletionRequest().catch(() => ({ request: null }))]).then(([user, list, deletion]) => {
      if (!active) return;
      setProfile(user); setDisplayName(user.displayName); setAddresses(list.addresses); setDeletionRequest(deletion.request);
    }).catch(cause => { if (active) notifyError(cause instanceof Error ? cause.message : "Không thể tải hồ sơ.", "profile-load-error"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try { await action(); }
    catch (cause) { notifyError(cause instanceof Error ? cause.message : "Không thể xử lý yêu cầu."); }
    finally { setBusy(false); }
  }
  async function reloadAddresses() { setAddresses((await profileApi.addresses()).addresses); }
  function startEditing() {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setPhone("");
    setEditing(true);
  }
  function saveProfile(event: FormEvent) { event.preventDefault(); if (!profile) return; void run(async () => {
    const nextName = displayName.trim();
    const nextPhone = phone.trim();
    if (nextName !== profile.displayName) {
      const next = await profileApi.update(nextName);
      setProfile(next);
      window.dispatchEvent(new Event("identityUpdated"));
    }
    if (nextPhone) {
      const result = await profileApi.requestPhoneCode(nextPhone);
      setCode("");
      setPendingPhone(nextPhone);
      setPhone("");
      notifySuccess(result.message);
    } else if (nextName !== profile.displayName) {
      notifySuccess("Đã cập nhật tên hiển thị.");
    }
    setEditing(false);
  }); }
  function uploadAvatar(file?: File) {
    if (!file) return;
    void run(async () => {
      const next = await profileApi.uploadAvatar(file);
      setProfile(next); window.dispatchEvent(new Event("identityUpdated")); notifySuccess("Đã cập nhật ảnh đại diện.");
      if (avatarInput.current) avatarInput.current.value = "";
    });
  }
  function requestPhone(event: FormEvent) { event.preventDefault(); void run(async () => {
    const nextPhone = phone.trim();
    const result = await profileApi.requestPhoneCode(nextPhone);
    setCode(""); setPendingPhone(nextPhone); setPhone(""); notifySuccess(result.message);
  }); }
  function resendPhoneCode() { if (!pendingPhone) return; void run(async () => {
    const result = await profileApi.requestPhoneCode(pendingPhone);
    setCode(""); notifySuccess(result.message);
  }); }
  function confirmPhone(event: FormEvent) { event.preventDefault(); void run(async () => {
    setProfile(await profileApi.verifyPhoneCode(code)); setCode(""); setPhone(""); setPendingPhone(null); setEditing(false); notifySuccess("Đã cập nhật số điện thoại.");
  }); }
  function downloadPersonalData() { void run(async () => {
    const data = await profileApi.exportPersonalData();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `mduc247-tai-khoan-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notifySuccess("Đã tải dữ liệu tài khoản.");
  }); }
  function requestDeletion(event: FormEvent) { event.preventDefault(); void run(async () => {
    const result = await profileApi.requestDeletion(deletionPassword);
    setDeletionRequest(result.request); setDeletionPassword(""); notifySuccess(result.message);
  }); }
  function cancelDeletionRequest() { void run(async () => {
    const result = await profileApi.cancelDeletionRequest();
    setDeletionRequest(result.request); notifySuccess(result.message);
  }); }
  function saveAddress(event: FormEvent) { event.preventDefault(); void run(async () => {
    if (editingId) await profileApi.updateAddress(editingId, { receiverName: address.receiverName, receiverPhone: address.receiverPhone, provinceCode: address.provinceCode, districtCode: address.districtCode, wardCode: address.wardCode, addressLine: address.addressLine, note: address.note });
    else await profileApi.createAddress(address);
    await reloadAddresses(); setEditingId(null); setAddress(emptyAddress); setAddressFormOpen(false); notifySuccess("Đã lưu địa chỉ.");
  }); }
  function editAddress(item: Address) { void run(async () => {
    const { address: detail } = await profileApi.address(item.id);
    setAddress({ receiverName: detail.receiverName, receiverPhone: detail.receiverPhone || "", provinceCode: detail.provinceCode, districtCode: detail.districtCode, wardCode: detail.wardCode, addressLine: detail.addressLine, note: detail.note, isDefault: detail.isDefault });
    setEditingId(item.id); setAddressFormOpen(true);
  }); }
  function updateAddress<K extends keyof AddressInput>(key: K, value: AddressInput[K]) { setAddress(current => ({ ...current, [key]: value })); }

  return <div className="profile-v2">
    <div className="profile-shell profile-main">
      <ContentBreadcrumb items={[{ label: "Hồ sơ cá nhân" }]} />
      {loading && <div className="profile-card profile-loading">Đang tải hồ sơ...</div>}
      {!loading && !profile && <div className="profile-card profile-loading">Vui lòng <Link to="/login">đăng nhập</Link> để xem hồ sơ của bạn.</div>}
      {profile && <>
        <section className="profile-hero" aria-label="Tài khoản của bạn">
          <div className="profile-cover" />
          <div className="profile-hero-body">
            <div className="profile-avatar-group">
              <div className="profile-avatar">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="Ảnh đại diện" /> : <UserRound size={42} />}</div>
              <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" className="profile-file-input" aria-label="Chọn ảnh đại diện" onChange={event => uploadAvatar(event.target.files?.[0])} />
              <button type="button" className="profile-avatar-action" disabled={busy} onClick={() => avatarInput.current?.click()}><Camera size={15} /> Đổi ảnh</button>
            </div>
            <div className="profile-identity"><div className="profile-name-line"><strong>{profile.displayName || "Thành viên MDUC247"}</strong>{profile.emailVerified && <span className="profile-verified"><Check size={13} /> Đã xác minh</span>}</div><span className="profile-membership">Thành viên MDUC247</span><div className="profile-contact"><span>{showContact ? profile.email : maskEmail(profile.email)}</span><i aria-hidden="true">·</i><span>{profile.phoneMasked || "Chưa thêm số điện thoại"}</span><button type="button" aria-label={showContact ? "Ẩn email" : "Hiện email"} onClick={() => setShowContact(value => !value)}>{showContact ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
            <button type="button" className="profile-outline-button profile-edit-hero" onClick={() => { setTab("info"); startEditing(); }}>Chỉnh sửa hồ sơ</button>
          </div>
        </section>
        <nav className="profile-tabs" aria-label="Các mục hồ sơ">{tabs.map(item => <button key={item.id} type="button" className={tab === item.id ? "is-active" : ""} aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
        <div className="profile-content"><div className="profile-primary">
          {tab === "info" && <section className="profile-card profile-info-card"><div className="profile-card-heading"><div><h2>Thông tin cá nhân</h2><p>Thông tin tài khoản của bạn.</p></div><span className="profile-readonly">{editing ? "Chỉnh sửa" : "Chỉ đọc"}</span></div>
            <form onSubmit={saveProfile}><div className="profile-fields">
              <label>Họ và tên<input value={profile.displayName || "Chưa cập nhật"} readOnly /></label>
              <label>Tên hiển thị<input value={displayName} readOnly={!editing} minLength={2} maxLength={120} required onChange={event => setDisplayName(event.target.value)} /></label>
              <label>Email<input value={showContact ? profile.email : "••••••••••••••••••"} readOnly /><small>Đang che: {maskEmail(profile.email)}</small></label>
              <label>Số điện thoại<input type={editing ? "tel" : "text"} value={editing ? phone : profile.phoneMasked || "Chưa cập nhật"} readOnly={!editing} placeholder={editing ? "+84901234567" : undefined} pattern={editing ? "\\+[1-9][0-9]{7,14}" : undefined} title={editing ? "Nhập số theo định dạng quốc tế, ví dụ +84901234567" : undefined} autoComplete="tel" onChange={event => setPhone(event.target.value)} /><small>{editing ? `Nhập số mới theo dạng +84...; hiện tại: ${profile.phoneMasked || "chưa cập nhật"}. Mã xác nhận sẽ gửi tới ${profile.email}.` : `Đang che: ${profile.phoneMasked || "Chưa cập nhật"}`}</small></label>
            </div><div className="profile-form-actions">{editing ? <><button className="profile-primary-button" disabled={busy || displayName.trim().length < 2}>Lưu thay đổi</button><button type="button" className="profile-plain-button" onClick={() => { setDisplayName(profile.displayName); setPhone(""); setEditing(false); }}>Hủy</button></> : <button type="button" className="profile-primary-button" onClick={startEditing}>Chỉnh sửa thông tin</button>}</div></form>
            {pendingPhone && <div className="profile-phone-confirmation" role="status"><h3>Nhập mã xác nhận số {pendingPhone}</h3><p className="profile-muted">Mã OTP đã gửi tới {profile.email}, có hiệu lực 5 phút. Số điện thoại chỉ được lưu sau khi nhập đúng mã.</p><form onSubmit={confirmPhone} className="profile-inline-form"><input aria-label="Mã OTP gồm 6 chữ số" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="Mã gồm 6 chữ số" value={code} onChange={event => setCode(event.target.value)} required /><button className="profile-primary-button" disabled={busy}>Xác nhận số</button></form><button type="button" className="profile-plain-button profile-phone-resend" disabled={busy} onClick={resendPhoneCode}>Gửi lại mã sau 60 giây</button></div>}
          </section>}
          {tab === "addresses" && <section className="profile-card"><div className="profile-card-heading"><div><h2>Sổ địa chỉ</h2><p>Quản lý địa chỉ giao hàng của bạn.</p></div><button type="button" className="profile-outline-button" onClick={() => { setAddress(emptyAddress); setEditingId(null); setAddressFormOpen(true); }}>+ Thêm địa chỉ</button></div>
            <div className="profile-address-list">{addresses.length ? addresses.map(item => <article className="profile-address" key={item.id}><MapPin size={19} /><div><strong>{item.receiverName} {item.isDefault && <span className="profile-verified">Mặc định</span>}</strong><p>{item.receiverPhoneMasked}</p><p>{formatAddress(item)}</p><div className="profile-inline-actions"><button type="button" disabled={busy} onClick={() => editAddress(item)}>Sửa</button>{!item.isDefault && <button type="button" disabled={busy} onClick={() => void run(async () => { await profileApi.setDefaultAddress(item.id); await reloadAddresses(); notifySuccess("Đã đặt địa chỉ mặc định."); })}>Đặt mặc định</button>}<button type="button" disabled={busy} onClick={() => void run(async () => { await profileApi.deleteAddress(item.id); await reloadAddresses(); notifySuccess("Đã xóa địa chỉ."); })}>Xóa</button></div></div></article>) : <p className="profile-empty">Bạn chưa có địa chỉ giao hàng.</p>}</div>
            {addressFormOpen && <form onSubmit={saveAddress} className="profile-address-form"><h3>{editingId ? "Sửa địa chỉ" : "Thêm địa chỉ"}</h3><div className="profile-fields">
              <label>Tên người nhận<input value={address.receiverName} onChange={event => updateAddress("receiverName", event.target.value)} required /></label>
              <label>Số điện thoại (+84...)<input type="tel" value={address.receiverPhone} onChange={event => updateAddress("receiverPhone", event.target.value)} required /></label>
              <label>Tỉnh/thành<input value={address.provinceCode} onChange={event => updateAddress("provinceCode", event.target.value)} required /></label>
              <label>Phường/xã<input value={address.wardCode} onChange={event => updateAddress("wardCode", event.target.value)} required /></label>
              <label className="profile-field-wide">Địa chỉ chi tiết<input value={address.addressLine} onChange={event => updateAddress("addressLine", event.target.value)} required /></label>
              <label className="profile-field-wide">Ghi chú<textarea value={address.note || ""} maxLength={300} onChange={event => updateAddress("note", event.target.value)} /></label>
            </div>{!editingId && <label className="profile-check"><input type="checkbox" checked={address.isDefault || false} onChange={event => updateAddress("isDefault", event.target.checked)} /> Đặt làm mặc định</label>}<div className="profile-form-actions"><button className="profile-primary-button" disabled={busy}>Lưu địa chỉ</button><button type="button" className="profile-plain-button" onClick={() => { setAddressFormOpen(false); setEditingId(null); setAddress(emptyAddress); }}>Hủy</button></div></form>}
          </section>}
          {tab === "payment" && <section className="profile-card"><div className="profile-card-heading"><div><h2>Phương thức thanh toán</h2><p>Quản lý thanh toán và ví của bạn.</p></div></div><div className="profile-feature"><Gift size={24} /><div><strong>Ví MDUC247</strong><p>Xem số dư và các giao dịch trong trang ví.</p><Link to="/wallet">Đi đến ví →</Link></div></div><p className="profile-empty">Chưa có phương thức thanh toán nào được lưu trong hồ sơ.</p></section>}
          {tab === "security" && <section className="profile-card"><div className="profile-card-heading"><div><h2>Bảo mật tài khoản</h2><p>Kiểm tra trạng thái xác minh và cập nhật số điện thoại.</p></div></div><div className="profile-security-status"><div><ShieldCheck size={19} /><span>Email</span><strong>{profile.emailVerified ? "Đã xác minh" : "Chưa xác minh"}</strong></div><div><ShieldCheck size={19} /><span>Số điện thoại</span><strong>{profile.phoneVerified ? "Đã xác minh qua SMS" : profile.phoneEmailConfirmed ? "Đã thêm qua email" : "Chưa thêm"}</strong></div></div><div className="profile-divider" /><h3>Cập nhật số điện thoại</h3><p className="profile-muted">Nhập số mới, rồi lấy mã OTP trong email tài khoản ({profile.email}). Mã có hiệu lực 5 phút. Cách này xác nhận thao tác của bạn, không xác minh quyền sở hữu số điện thoại.</p><form onSubmit={requestPhone} className="profile-inline-form"><input type="tel" placeholder="+84901234567" value={phone} onChange={event => setPhone(event.target.value)} required /><button className="profile-primary-button" disabled={busy}>Gửi mã qua email</button></form><form onSubmit={confirmPhone} className="profile-inline-form"><input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="Mã gồm 6 chữ số" value={code} onChange={event => setCode(event.target.value)} required /><button className="profile-outline-button" disabled={busy}>Xác nhận thêm số</button></form></section>}
          {tab === "settings" && <section className="profile-card">
            <div className="profile-card-heading"><div><h2>Cài đặt</h2><p>Tùy chỉnh cách bạn nhận thông tin từ MDUC247.</p></div></div>
            <label className="profile-setting"><span><strong>Thông báo tiếp thị</strong><small>Nhận tin về ưu đãi và cập nhật mới.</small></span><input type="checkbox" checked={profile.marketingOptIn} disabled={busy} onChange={event => { const checked = event.target.checked; void run(async () => { setProfile(await profileApi.setMarketing(checked)); notifySuccess("Đã lưu cài đặt thông báo."); }); }} /></label>
            <div className="profile-divider" />
            <h3>Dữ liệu của bạn</h3>
            <p className="profile-muted">Tải hồ sơ, địa chỉ và lịch sử bảo mật của tài khoản. Tệp chưa gồm đơn hàng, thanh toán hoặc trò chuyện.</p>
            <button type="button" className="profile-outline-button" disabled={busy} onClick={downloadPersonalData}>Tải dữ liệu tài khoản</button>
            <div className="profile-divider" />
            <h3>Yêu cầu xóa tài khoản</h3>
            <p className="profile-muted">Yêu cầu được ghi nhận để xem xét dữ liệu ở các dịch vụ liên quan. Tài khoản chưa bị xóa ngay khi gửi yêu cầu.</p>
            {deletionRequest?.status === "REJECTED" && <p role="status" className="profile-muted">Yêu cầu trước chưa được chấp nhận: {deletionRequest.resolutionNote || "Vui lòng liên hệ hỗ trợ."}</p>}
            {deletionRequest?.status === "PENDING" ?
              <button type="button" className="profile-outline-button" disabled={busy} onClick={cancelDeletionRequest}>Hủy yêu cầu đã gửi</button> :
              <form onSubmit={requestDeletion} className="profile-inline-form"><input type="password" autoComplete="current-password" placeholder="Nhập mật khẩu để xác nhận" value={deletionPassword} onChange={event => setDeletionPassword(event.target.value)} required /><button className="profile-outline-button" disabled={busy}>Gửi yêu cầu xóa</button></form>}
          </section>}
        </div><aside className="profile-sidebar"><section className="profile-card"><h2>Tổng quan tài khoản</h2><div className="profile-stat-grid"><div><strong>{addresses.length}</strong><span>Địa chỉ đã lưu</span></div><div><strong>{addresses.filter(item => item.isDefault).length}</strong><span>Địa chỉ mặc định</span></div><div><strong>{profile.emailVerified ? "Có" : "Chưa"}</strong><span>Email xác minh</span></div><div><strong>{profile.phoneVerified ? "Có" : profile.phoneEmailConfirmed ? "Có" : "Chưa"}</strong><span>Số điện thoại</span></div></div></section><section className="profile-card profile-activity"><h2>Hoạt động tài khoản</h2><div><span className="profile-activity-icon"><UserRound size={19} /></span><p><strong>Hồ sơ cá nhân</strong><small>Thông tin tài khoản hiện tại</small></p></div><div><span className="profile-activity-icon coral"><MapPin size={19} /></span><p><strong>Sổ địa chỉ</strong><small>{addresses.length} địa chỉ đã lưu</small></p></div><div><span className="profile-activity-icon purple"><Package size={19} /></span><p><strong>Đơn hàng của bạn</strong><small>Xem trong trang đơn hàng</small></p></div></section><section className="profile-safe"><div className="profile-safe-icon"><LockKeyhole size={23} /></div><h2>Tài khoản an toàn</h2><p>{profile.emailVerified ? "Email tài khoản đã xác minh. Bạn có thể thêm số điện thoại bằng mã gửi qua email." : "Hãy xác minh email để bảo vệ tài khoản."}</p><button type="button" onClick={() => setTab("security")}>Quản lý bảo mật →</button></section></aside></div>
      </>}
    </div>
  </div>;
}
