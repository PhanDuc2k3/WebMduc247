import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Camera, Check, Eye, EyeOff, Gift, LockKeyhole, MapPin, Package, ShieldCheck, UserRound } from "lucide-react";
import { profileApi } from "../../api/profileApi";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { formatAddress } from "../../utils/formatAddress";
import "./ProfileV2.css";
const tabs = [
    { id: "info", label: "Thông tin cá nhân" }, { id: "addresses", label: "Địa chỉ" },
    { id: "payment", label: "Phương thức thanh toán" }, { id: "security", label: "Bảo mật" },
    { id: "settings", label: "Cài đặt" },
];
const emptyAddress = { receiverName: "", receiverPhone: "", provinceCode: "", districtCode: "", wardCode: "", addressLine: "", note: null, isDefault: false };
const maskEmail = (email) => {
    const [name, domain] = email.split("@");
    return domain ? `${name.slice(0, 4)}***@${domain}` : email;
};
const notifySuccess = (message) => toast.success(message, { containerId: "general-toast" });
const notifyError = (message, toastId) => toast.error(message, { containerId: "general-toast", toastId });
export default function ProfileV2() {
    const [profile, setProfile] = useState(null);
    const [addresses, setAddresses] = useState([]);
    const [tab, setTab] = useState("info");
    const [editing, setEditing] = useState(false);
    const [displayName, setDisplayName] = useState("");
    const [showContact, setShowContact] = useState(false);
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [pendingPhone, setPendingPhone] = useState(null);
    const [deletionPassword, setDeletionPassword] = useState("");
    const [deletionRequest, setDeletionRequest] = useState(null);
    const [address, setAddress] = useState(emptyAddress);
    const [editingId, setEditingId] = useState(null);
    const [addressFormOpen, setAddressFormOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const avatarInput = useRef(null);
    useEffect(() => {
        let active = true;
        Promise.all([profileApi.me(), profileApi.addresses().catch(() => ({ addresses: [] })),
            profileApi.deletionRequest().catch(() => ({ request: null }))]).then(([user, list, deletion]) => {
            if (!active)
                return;
            setProfile(user);
            setDisplayName(user.displayName);
            setAddresses(list.addresses);
            setDeletionRequest(deletion.request);
        }).catch(cause => { if (active)
            notifyError(cause instanceof Error ? cause.message : "Không thể tải hồ sơ.", "profile-load-error"); })
            .finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, []);
    async function run(action) {
        setBusy(true);
        try {
            await action();
        }
        catch (cause) {
            notifyError(cause instanceof Error ? cause.message : "Không thể xử lý yêu cầu.");
        }
        finally {
            setBusy(false);
        }
    }
    async function reloadAddresses() { setAddresses((await profileApi.addresses()).addresses); }
    function startEditing() {
        if (!profile)
            return;
        setDisplayName(profile.displayName);
        setPhone("");
        setEditing(true);
    }
    function saveProfile(event) {
        event.preventDefault();
        if (!profile)
            return;
        void run(async () => {
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
            }
            else if (nextName !== profile.displayName) {
                notifySuccess("Đã cập nhật tên hiển thị.");
            }
            setEditing(false);
        });
    }
    function uploadAvatar(file) {
        if (!file)
            return;
        void run(async () => {
            const next = await profileApi.uploadAvatar(file);
            setProfile(next);
            window.dispatchEvent(new Event("identityUpdated"));
            notifySuccess("Đã cập nhật ảnh đại diện.");
            if (avatarInput.current)
                avatarInput.current.value = "";
        });
    }
    function requestPhone(event) {
        event.preventDefault();
        void run(async () => {
            const nextPhone = phone.trim();
            const result = await profileApi.requestPhoneCode(nextPhone);
            setCode("");
            setPendingPhone(nextPhone);
            setPhone("");
            notifySuccess(result.message);
        });
    }
    function resendPhoneCode() {
        if (!pendingPhone)
            return;
        void run(async () => {
            const result = await profileApi.requestPhoneCode(pendingPhone);
            setCode("");
            notifySuccess(result.message);
        });
    }
    function confirmPhone(event) {
        event.preventDefault();
        void run(async () => {
            setProfile(await profileApi.verifyPhoneCode(code));
            setCode("");
            setPhone("");
            setPendingPhone(null);
            setEditing(false);
            notifySuccess("Đã cập nhật số điện thoại.");
        });
    }
    function downloadPersonalData() {
        void run(async () => {
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
        });
    }
    function requestDeletion(event) {
        event.preventDefault();
        void run(async () => {
            const result = await profileApi.requestDeletion(deletionPassword);
            setDeletionRequest(result.request);
            setDeletionPassword("");
            notifySuccess(result.message);
        });
    }
    function cancelDeletionRequest() {
        void run(async () => {
            const result = await profileApi.cancelDeletionRequest();
            setDeletionRequest(result.request);
            notifySuccess(result.message);
        });
    }
    function saveAddress(event) {
        event.preventDefault();
        void run(async () => {
            if (editingId)
                await profileApi.updateAddress(editingId, { receiverName: address.receiverName, receiverPhone: address.receiverPhone, provinceCode: address.provinceCode, districtCode: address.districtCode, wardCode: address.wardCode, addressLine: address.addressLine, note: address.note });
            else
                await profileApi.createAddress(address);
            await reloadAddresses();
            setEditingId(null);
            setAddress(emptyAddress);
            setAddressFormOpen(false);
            notifySuccess("Đã lưu địa chỉ.");
        });
    }
    function editAddress(item) {
        void run(async () => {
            const { address: detail } = await profileApi.address(item.id);
            setAddress({ receiverName: detail.receiverName, receiverPhone: detail.receiverPhone || "", provinceCode: detail.provinceCode, districtCode: detail.districtCode, wardCode: detail.wardCode, addressLine: detail.addressLine, note: detail.note, isDefault: detail.isDefault });
            setEditingId(item.id);
            setAddressFormOpen(true);
        });
    }
    function updateAddress(key, value) { setAddress(current => ({ ...current, [key]: value })); }
    return _jsx("div", { className: "profile-v2", children: _jsxs("div", { className: "profile-shell profile-main", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Hồ sơ cá nhân" }] }), loading && _jsx("div", { className: "profile-card profile-loading", children: "\u0110ang t\u1EA3i h\u1ED3 s\u01A1..." }), !loading && !profile && _jsxs("div", { className: "profile-card profile-loading", children: ["Vui l\u00F2ng ", _jsx(Link, { to: "/login", children: "\u0111\u0103ng nh\u1EADp" }), " \u0111\u1EC3 xem h\u1ED3 s\u01A1 c\u1EE7a b\u1EA1n."] }), profile && _jsxs(_Fragment, { children: [_jsxs("section", { className: "profile-hero", "aria-label": "T\u00E0i kho\u1EA3n c\u1EE7a b\u1EA1n", children: [_jsx("div", { className: "profile-cover" }), _jsxs("div", { className: "profile-hero-body", children: [_jsxs("div", { className: "profile-avatar-group", children: [_jsx("div", { className: "profile-avatar", children: profile.avatarUrl ? _jsx("img", { src: profile.avatarUrl, alt: "\u1EA2nh \u0111\u1EA1i di\u1EC7n" }) : _jsx(UserRound, { size: 42 }) }), _jsx("input", { ref: avatarInput, type: "file", accept: "image/jpeg,image/png,image/webp", className: "profile-file-input", "aria-label": "Ch\u1ECDn \u1EA3nh \u0111\u1EA1i di\u1EC7n", onChange: event => uploadAvatar(event.target.files?.[0]) }), _jsxs("button", { type: "button", className: "profile-avatar-action", disabled: busy, onClick: () => avatarInput.current?.click(), children: [_jsx(Camera, { size: 15 }), " \u0110\u1ED5i \u1EA3nh"] })] }), _jsxs("div", { className: "profile-identity", children: [_jsxs("div", { className: "profile-name-line", children: [_jsx("strong", { children: profile.displayName || "Thành viên MDUC247" }), profile.emailVerified && _jsxs("span", { className: "profile-verified", children: [_jsx(Check, { size: 13 }), " \u0110\u00E3 x\u00E1c minh"] })] }), _jsx("span", { className: "profile-membership", children: "Th\u00E0nh vi\u00EAn MDUC247" }), _jsxs("div", { className: "profile-contact", children: [_jsx("span", { children: showContact ? profile.email : maskEmail(profile.email) }), _jsx("i", { "aria-hidden": "true", children: "\u00B7" }), _jsx("span", { children: profile.phoneMasked || "Chưa thêm số điện thoại" }), _jsx("button", { type: "button", "aria-label": showContact ? "Ẩn email" : "Hiện email", onClick: () => setShowContact(value => !value), children: showContact ? _jsx(EyeOff, { size: 17 }) : _jsx(Eye, { size: 17 }) })] })] }), _jsx("button", { type: "button", className: "profile-outline-button profile-edit-hero", onClick: () => { setTab("info"); startEditing(); }, children: "Ch\u1EC9nh s\u1EEDa h\u1ED3 s\u01A1" })] })] }), _jsx("nav", { className: "profile-tabs", "aria-label": "C\u00E1c m\u1EE5c h\u1ED3 s\u01A1", children: tabs.map(item => _jsx("button", { type: "button", className: tab === item.id ? "is-active" : "", "aria-current": tab === item.id ? "page" : undefined, onClick: () => setTab(item.id), children: item.label }, item.id)) }), _jsxs("div", { className: "profile-content", children: [_jsxs("div", { className: "profile-primary", children: [tab === "info" && _jsxs("section", { className: "profile-card profile-info-card", children: [_jsxs("div", { className: "profile-card-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: "Th\u00F4ng tin c\u00E1 nh\u00E2n" }), _jsx("p", { children: "Th\u00F4ng tin t\u00E0i kho\u1EA3n c\u1EE7a b\u1EA1n." })] }), _jsx("span", { className: "profile-readonly", children: editing ? "Chỉnh sửa" : "Chỉ đọc" })] }), _jsxs("form", { onSubmit: saveProfile, children: [_jsxs("div", { className: "profile-fields", children: [_jsxs("label", { children: ["H\u1ECD v\u00E0 t\u00EAn", _jsx("input", { value: profile.displayName || "Chưa cập nhật", readOnly: true })] }), _jsxs("label", { children: ["T\u00EAn hi\u1EC3n th\u1ECB", _jsx("input", { value: displayName, readOnly: !editing, minLength: 2, maxLength: 120, required: true, onChange: event => setDisplayName(event.target.value) })] }), _jsxs("label", { children: ["Email", _jsx("input", { value: showContact ? profile.email : "••••••••••••••••••", readOnly: true }), _jsxs("small", { children: ["\u0110ang che: ", maskEmail(profile.email)] })] }), _jsxs("label", { children: ["S\u1ED1 \u0111i\u1EC7n tho\u1EA1i", _jsx("input", { type: editing ? "tel" : "text", value: editing ? phone : profile.phoneMasked || "Chưa cập nhật", readOnly: !editing, placeholder: editing ? "+84901234567" : undefined, pattern: editing ? "\\+[1-9][0-9]{7,14}" : undefined, title: editing ? "Nhập số theo định dạng quốc tế, ví dụ +84901234567" : undefined, autoComplete: "tel", onChange: event => setPhone(event.target.value) }), _jsx("small", { children: editing ? `Nhập số mới theo dạng +84...; hiện tại: ${profile.phoneMasked || "chưa cập nhật"}. Mã xác nhận sẽ gửi tới ${profile.email}.` : `Đang che: ${profile.phoneMasked || "Chưa cập nhật"}` })] })] }), _jsx("div", { className: "profile-form-actions", children: editing ? _jsxs(_Fragment, { children: [_jsx("button", { className: "profile-primary-button", disabled: busy || displayName.trim().length < 2, children: "L\u01B0u thay \u0111\u1ED5i" }), _jsx("button", { type: "button", className: "profile-plain-button", onClick: () => { setDisplayName(profile.displayName); setPhone(""); setEditing(false); }, children: "H\u1EE7y" })] }) : _jsx("button", { type: "button", className: "profile-primary-button", onClick: startEditing, children: "Ch\u1EC9nh s\u1EEDa th\u00F4ng tin" }) })] }), pendingPhone && _jsxs("div", { className: "profile-phone-confirmation", role: "status", children: [_jsxs("h3", { children: ["Nh\u1EADp m\u00E3 x\u00E1c nh\u1EADn s\u1ED1 ", pendingPhone] }), _jsxs("p", { className: "profile-muted", children: ["M\u00E3 OTP \u0111\u00E3 g\u1EEDi t\u1EDBi ", profile.email, ", c\u00F3 hi\u1EC7u l\u1EF1c 5 ph\u00FAt. S\u1ED1 \u0111i\u1EC7n tho\u1EA1i ch\u1EC9 \u0111\u01B0\u1EE3c l\u01B0u sau khi nh\u1EADp \u0111\u00FAng m\u00E3."] }), _jsxs("form", { onSubmit: confirmPhone, className: "profile-inline-form", children: [_jsx("input", { "aria-label": "M\u00E3 OTP g\u1ED3m 6 ch\u1EEF s\u1ED1", inputMode: "numeric", pattern: "[0-9]{6}", maxLength: 6, placeholder: "M\u00E3 g\u1ED3m 6 ch\u1EEF s\u1ED1", value: code, onChange: event => setCode(event.target.value), required: true }), _jsx("button", { className: "profile-primary-button", disabled: busy, children: "X\u00E1c nh\u1EADn s\u1ED1" })] }), _jsx("button", { type: "button", className: "profile-plain-button profile-phone-resend", disabled: busy, onClick: resendPhoneCode, children: "G\u1EEDi l\u1EA1i m\u00E3 sau 60 gi\u00E2y" })] })] }), tab === "addresses" && _jsxs("section", { className: "profile-card", children: [_jsxs("div", { className: "profile-card-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: "S\u1ED5 \u0111\u1ECBa ch\u1EC9" }), _jsx("p", { children: "Qu\u1EA3n l\u00FD \u0111\u1ECBa ch\u1EC9 giao h\u00E0ng c\u1EE7a b\u1EA1n." })] }), _jsx("button", { type: "button", className: "profile-outline-button", onClick: () => { setAddress(emptyAddress); setEditingId(null); setAddressFormOpen(true); }, children: "+ Th\u00EAm \u0111\u1ECBa ch\u1EC9" })] }), _jsx("div", { className: "profile-address-list", children: addresses.length ? addresses.map(item => _jsxs("article", { className: "profile-address", children: [_jsx(MapPin, { size: 19 }), _jsxs("div", { children: [_jsxs("strong", { children: [item.receiverName, " ", item.isDefault && _jsx("span", { className: "profile-verified", children: "M\u1EB7c \u0111\u1ECBnh" })] }), _jsx("p", { children: item.receiverPhoneMasked }), _jsx("p", { children: formatAddress(item) }), _jsxs("div", { className: "profile-inline-actions", children: [_jsx("button", { type: "button", disabled: busy, onClick: () => editAddress(item), children: "S\u1EEDa" }), !item.isDefault && _jsx("button", { type: "button", disabled: busy, onClick: () => void run(async () => { await profileApi.setDefaultAddress(item.id); await reloadAddresses(); notifySuccess("Đã đặt địa chỉ mặc định."); }), children: "\u0110\u1EB7t m\u1EB7c \u0111\u1ECBnh" }), _jsx("button", { type: "button", disabled: busy, onClick: () => void run(async () => { await profileApi.deleteAddress(item.id); await reloadAddresses(); notifySuccess("Đã xóa địa chỉ."); }), children: "X\u00F3a" })] })] })] }, item.id)) : _jsx("p", { className: "profile-empty", children: "B\u1EA1n ch\u01B0a c\u00F3 \u0111\u1ECBa ch\u1EC9 giao h\u00E0ng." }) }), addressFormOpen && _jsxs("form", { onSubmit: saveAddress, className: "profile-address-form", children: [_jsx("h3", { children: editingId ? "Sửa địa chỉ" : "Thêm địa chỉ" }), _jsxs("div", { className: "profile-fields", children: [_jsxs("label", { children: ["T\u00EAn ng\u01B0\u1EDDi nh\u1EADn", _jsx("input", { value: address.receiverName, onChange: event => updateAddress("receiverName", event.target.value), required: true })] }), _jsxs("label", { children: ["S\u1ED1 \u0111i\u1EC7n tho\u1EA1i (+84...)", _jsx("input", { type: "tel", value: address.receiverPhone, onChange: event => updateAddress("receiverPhone", event.target.value), required: true })] }), _jsxs("label", { children: ["T\u1EC9nh/th\u00E0nh", _jsx("input", { value: address.provinceCode, onChange: event => updateAddress("provinceCode", event.target.value), required: true })] }), _jsxs("label", { children: ["Ph\u01B0\u1EDDng/x\u00E3", _jsx("input", { value: address.wardCode, onChange: event => updateAddress("wardCode", event.target.value), required: true })] }), _jsxs("label", { className: "profile-field-wide", children: ["\u0110\u1ECBa ch\u1EC9 chi ti\u1EBFt", _jsx("input", { value: address.addressLine, onChange: event => updateAddress("addressLine", event.target.value), required: true })] }), _jsxs("label", { className: "profile-field-wide", children: ["Ghi ch\u00FA", _jsx("textarea", { value: address.note || "", maxLength: 300, onChange: event => updateAddress("note", event.target.value) })] })] }), !editingId && _jsxs("label", { className: "profile-check", children: [_jsx("input", { type: "checkbox", checked: address.isDefault || false, onChange: event => updateAddress("isDefault", event.target.checked) }), " \u0110\u1EB7t l\u00E0m m\u1EB7c \u0111\u1ECBnh"] }), _jsxs("div", { className: "profile-form-actions", children: [_jsx("button", { className: "profile-primary-button", disabled: busy, children: "L\u01B0u \u0111\u1ECBa ch\u1EC9" }), _jsx("button", { type: "button", className: "profile-plain-button", onClick: () => { setAddressFormOpen(false); setEditingId(null); setAddress(emptyAddress); }, children: "H\u1EE7y" })] })] })] }), tab === "payment" && _jsxs("section", { className: "profile-card", children: [_jsx("div", { className: "profile-card-heading", children: _jsxs("div", { children: [_jsx("h2", { children: "Ph\u01B0\u01A1ng th\u1EE9c thanh to\u00E1n" }), _jsx("p", { children: "Qu\u1EA3n l\u00FD thanh to\u00E1n v\u00E0 v\u00ED c\u1EE7a b\u1EA1n." })] }) }), _jsxs("div", { className: "profile-feature", children: [_jsx(Gift, { size: 24 }), _jsxs("div", { children: [_jsx("strong", { children: "V\u00ED MDUC247" }), _jsx("p", { children: "Xem s\u1ED1 d\u01B0 v\u00E0 c\u00E1c giao d\u1ECBch trong trang v\u00ED." }), _jsx(Link, { to: "/wallet", children: "\u0110i \u0111\u1EBFn v\u00ED \u2192" })] })] }), _jsx("p", { className: "profile-empty", children: "Ch\u01B0a c\u00F3 ph\u01B0\u01A1ng th\u1EE9c thanh to\u00E1n n\u00E0o \u0111\u01B0\u1EE3c l\u01B0u trong h\u1ED3 s\u01A1." })] }), tab === "security" && _jsxs("section", { className: "profile-card", children: [_jsx("div", { className: "profile-card-heading", children: _jsxs("div", { children: [_jsx("h2", { children: "B\u1EA3o m\u1EADt t\u00E0i kho\u1EA3n" }), _jsx("p", { children: "Ki\u1EC3m tra tr\u1EA1ng th\u00E1i x\u00E1c minh v\u00E0 c\u1EADp nh\u1EADt s\u1ED1 \u0111i\u1EC7n tho\u1EA1i." })] }) }), _jsxs("div", { className: "profile-security-status", children: [_jsxs("div", { children: [_jsx(ShieldCheck, { size: 19 }), _jsx("span", { children: "Email" }), _jsx("strong", { children: profile.emailVerified ? "Đã xác minh" : "Chưa xác minh" })] }), _jsxs("div", { children: [_jsx(ShieldCheck, { size: 19 }), _jsx("span", { children: "S\u1ED1 \u0111i\u1EC7n tho\u1EA1i" }), _jsx("strong", { children: profile.phoneVerified ? "Đã xác minh qua SMS" : profile.phoneEmailConfirmed ? "Đã thêm qua email" : "Chưa thêm" })] })] }), _jsx("div", { className: "profile-divider" }), _jsx("h3", { children: "C\u1EADp nh\u1EADt s\u1ED1 \u0111i\u1EC7n tho\u1EA1i" }), _jsxs("p", { className: "profile-muted", children: ["Nh\u1EADp s\u1ED1 m\u1EDBi, r\u1ED3i l\u1EA5y m\u00E3 OTP trong email t\u00E0i kho\u1EA3n (", profile.email, "). M\u00E3 c\u00F3 hi\u1EC7u l\u1EF1c 5 ph\u00FAt. C\u00E1ch n\u00E0y x\u00E1c nh\u1EADn thao t\u00E1c c\u1EE7a b\u1EA1n, kh\u00F4ng x\u00E1c minh quy\u1EC1n s\u1EDF h\u1EEFu s\u1ED1 \u0111i\u1EC7n tho\u1EA1i."] }), _jsxs("form", { onSubmit: requestPhone, className: "profile-inline-form", children: [_jsx("input", { type: "tel", placeholder: "+84901234567", value: phone, onChange: event => setPhone(event.target.value), required: true }), _jsx("button", { className: "profile-primary-button", disabled: busy, children: "G\u1EEDi m\u00E3 qua email" })] }), _jsxs("form", { onSubmit: confirmPhone, className: "profile-inline-form", children: [_jsx("input", { inputMode: "numeric", pattern: "[0-9]{6}", maxLength: 6, placeholder: "M\u00E3 g\u1ED3m 6 ch\u1EEF s\u1ED1", value: code, onChange: event => setCode(event.target.value), required: true }), _jsx("button", { className: "profile-outline-button", disabled: busy, children: "X\u00E1c nh\u1EADn th\u00EAm s\u1ED1" })] })] }), tab === "settings" && _jsxs("section", { className: "profile-card", children: [_jsx("div", { className: "profile-card-heading", children: _jsxs("div", { children: [_jsx("h2", { children: "C\u00E0i \u0111\u1EB7t" }), _jsx("p", { children: "T\u00F9y ch\u1EC9nh c\u00E1ch b\u1EA1n nh\u1EADn th\u00F4ng tin t\u1EEB MDUC247." })] }) }), _jsxs("label", { className: "profile-setting", children: [_jsxs("span", { children: [_jsx("strong", { children: "Th\u00F4ng b\u00E1o ti\u1EBFp th\u1ECB" }), _jsx("small", { children: "Nh\u1EADn tin v\u1EC1 \u01B0u \u0111\u00E3i v\u00E0 c\u1EADp nh\u1EADt m\u1EDBi." })] }), _jsx("input", { type: "checkbox", checked: profile.marketingOptIn, disabled: busy, onChange: event => { const checked = event.target.checked; void run(async () => { setProfile(await profileApi.setMarketing(checked)); notifySuccess("Đã lưu cài đặt thông báo."); }); } })] }), _jsx("div", { className: "profile-divider" }), _jsx("h3", { children: "D\u1EEF li\u1EC7u c\u1EE7a b\u1EA1n" }), _jsx("p", { className: "profile-muted", children: "T\u1EA3i h\u1ED3 s\u01A1, \u0111\u1ECBa ch\u1EC9 v\u00E0 l\u1ECBch s\u1EED b\u1EA3o m\u1EADt c\u1EE7a t\u00E0i kho\u1EA3n. T\u1EC7p ch\u01B0a g\u1ED3m \u0111\u01A1n h\u00E0ng, thanh to\u00E1n ho\u1EB7c tr\u00F2 chuy\u1EC7n." }), _jsx("button", { type: "button", className: "profile-outline-button", disabled: busy, onClick: downloadPersonalData, children: "T\u1EA3i d\u1EEF li\u1EC7u t\u00E0i kho\u1EA3n" }), _jsx("div", { className: "profile-divider" }), _jsx("h3", { children: "Y\u00EAu c\u1EA7u x\u00F3a t\u00E0i kho\u1EA3n" }), _jsx("p", { className: "profile-muted", children: "Y\u00EAu c\u1EA7u \u0111\u01B0\u1EE3c ghi nh\u1EADn \u0111\u1EC3 xem x\u00E9t d\u1EEF li\u1EC7u \u1EDF c\u00E1c d\u1ECBch v\u1EE5 li\u00EAn quan. T\u00E0i kho\u1EA3n ch\u01B0a b\u1ECB x\u00F3a ngay khi g\u1EEDi y\u00EAu c\u1EA7u." }), deletionRequest?.status === "REJECTED" && _jsxs("p", { role: "status", className: "profile-muted", children: ["Y\u00EAu c\u1EA7u tr\u01B0\u1EDBc ch\u01B0a \u0111\u01B0\u1EE3c ch\u1EA5p nh\u1EADn: ", deletionRequest.resolutionNote || "Vui lòng liên hệ hỗ trợ."] }), deletionRequest?.status === "PENDING" ?
                                                    _jsx("button", { type: "button", className: "profile-outline-button", disabled: busy, onClick: cancelDeletionRequest, children: "H\u1EE7y y\u00EAu c\u1EA7u \u0111\u00E3 g\u1EEDi" }) :
                                                    _jsxs("form", { onSubmit: requestDeletion, className: "profile-inline-form", children: [_jsx("input", { type: "password", autoComplete: "current-password", placeholder: "Nh\u1EADp m\u1EADt kh\u1EA9u \u0111\u1EC3 x\u00E1c nh\u1EADn", value: deletionPassword, onChange: event => setDeletionPassword(event.target.value), required: true }), _jsx("button", { className: "profile-outline-button", disabled: busy, children: "G\u1EEDi y\u00EAu c\u1EA7u x\u00F3a" })] })] })] }), _jsxs("aside", { className: "profile-sidebar", children: [_jsxs("section", { className: "profile-card", children: [_jsx("h2", { children: "T\u1ED5ng quan t\u00E0i kho\u1EA3n" }), _jsxs("div", { className: "profile-stat-grid", children: [_jsxs("div", { children: [_jsx("strong", { children: addresses.length }), _jsx("span", { children: "\u0110\u1ECBa ch\u1EC9 \u0111\u00E3 l\u01B0u" })] }), _jsxs("div", { children: [_jsx("strong", { children: addresses.filter(item => item.isDefault).length }), _jsx("span", { children: "\u0110\u1ECBa ch\u1EC9 m\u1EB7c \u0111\u1ECBnh" })] }), _jsxs("div", { children: [_jsx("strong", { children: profile.emailVerified ? "Có" : "Chưa" }), _jsx("span", { children: "Email x\u00E1c minh" })] }), _jsxs("div", { children: [_jsx("strong", { children: profile.phoneVerified ? "Có" : profile.phoneEmailConfirmed ? "Có" : "Chưa" }), _jsx("span", { children: "S\u1ED1 \u0111i\u1EC7n tho\u1EA1i" })] })] })] }), _jsxs("section", { className: "profile-card profile-activity", children: [_jsx("h2", { children: "Ho\u1EA1t \u0111\u1ED9ng t\u00E0i kho\u1EA3n" }), _jsxs("div", { children: [_jsx("span", { className: "profile-activity-icon", children: _jsx(UserRound, { size: 19 }) }), _jsxs("p", { children: [_jsx("strong", { children: "H\u1ED3 s\u01A1 c\u00E1 nh\u00E2n" }), _jsx("small", { children: "Th\u00F4ng tin t\u00E0i kho\u1EA3n hi\u1EC7n t\u1EA1i" })] })] }), _jsxs("div", { children: [_jsx("span", { className: "profile-activity-icon coral", children: _jsx(MapPin, { size: 19 }) }), _jsxs("p", { children: [_jsx("strong", { children: "S\u1ED5 \u0111\u1ECBa ch\u1EC9" }), _jsxs("small", { children: [addresses.length, " \u0111\u1ECBa ch\u1EC9 \u0111\u00E3 l\u01B0u"] })] })] }), _jsxs("div", { children: [_jsx("span", { className: "profile-activity-icon purple", children: _jsx(Package, { size: 19 }) }), _jsxs("p", { children: [_jsx("strong", { children: "\u0110\u01A1n h\u00E0ng c\u1EE7a b\u1EA1n" }), _jsx("small", { children: "Xem trong trang \u0111\u01A1n h\u00E0ng" })] })] })] }), _jsxs("section", { className: "profile-safe", children: [_jsx("div", { className: "profile-safe-icon", children: _jsx(LockKeyhole, { size: 23 }) }), _jsx("h2", { children: "T\u00E0i kho\u1EA3n an to\u00E0n" }), _jsx("p", { children: profile.emailVerified ? "Email tài khoản đã xác minh. Bạn có thể thêm số điện thoại bằng mã gửi qua email." : "Hãy xác minh email để bảo vệ tài khoản." }), _jsx("button", { type: "button", onClick: () => setTab("security"), children: "Qu\u1EA3n l\u00FD b\u1EA3o m\u1EADt \u2192" })] })] })] })] })] }) });
}
