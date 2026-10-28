import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { adminRequestId } from '../../api/adminCommand';
import { adminCaseApi } from '../../api/adminCaseApi';
import ApprovalSelector from './ApprovalSelector';
import UserWorkspace from './UserWorkspace';
import UserContactSearch from './UserContactSearch';
import StoreWorkspace, { registrationLabels } from './StoreWorkspace';
import StoreApplicationQueue from './StoreApplicationQueue';
import { useAdminSession } from './AdminSession';
import { hasAdminPermission } from './adminPolicy';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight, Eye, LockKeyhole, Package, RefreshCw, Search, ShieldCheck, Store, UnlockKeyhole, Users } from 'lucide-react';
import { platformAdminApi } from '../../api/platformAdminApi';
import { AdminDialog, date, formatNumber, money, StatusBadge } from './AdminUi';
const adminTitles = {
    users: { title: 'Người dùng', noun: 'tài khoản', description: 'Tra cứu tài khoản và kiểm soát quyền truy cập vào sàn.' },
    stores: { title: 'Cửa hàng', noun: 'cửa hàng', description: 'Theo dõi gian hàng và xử lý tạm ngừng hoạt động khi cần.' },
    products: { title: 'Sản phẩm', noun: 'sản phẩm', description: 'Tra cứu hàng hóa, giá, tồn kho và kiểm duyệt sản phẩm.' },
    orders: { title: 'Đơn hàng', noun: 'đơn hàng', description: 'Theo dõi đơn theo cửa hàng, thanh toán và lịch sử xử lý.' },
};
const roles = { buyer: 'Khách hàng', seller: 'Người bán', platform_admin: 'Quản trị sàn' };
const filters = {
    users: [['active', 'Đang hoạt động'], ['pending_verification', 'Chờ xác minh'], ['suspended', 'Sàn tạm khóa']],
    stores: [['active', 'Đang hoạt động'], ['paused', 'Seller tự ngừng'], ['suspended', 'Sàn tạm khóa']],
    products: [['active', 'Đang bán'], ['published', 'Đã đăng bán'], ['draft', 'Bản nháp'], ['hidden', 'Shop đã ẩn'], ['discontinued', 'Ngừng kinh doanh'], ['suspended', 'Sàn đã ẩn']],
    orders: [['PENDING_INVENTORY', 'Đang giữ hàng'], ['PENDING_PAYMENT', 'Chờ thanh toán'], ['PLACED', 'Đơn mới'], ['CONFIRMED', 'Đã xác nhận'],
        ['PREPARING', 'Đang chuẩn bị'], ['READY_TO_SHIP', 'Chờ lấy hàng'], ['SHIPPING', 'Đang giao'], ['DELIVERED', 'Đã giao'], ['COMPLETED', 'Hoàn tất'], ['CANCEL_PENDING', 'Đang hủy'], ['CANCELLED', 'Đã hủy']],
};
export function RecordDialog(props) {
    return props.resource === 'users' ? _jsx(UserWorkspace, { id: props.id, close: props.close, changed: props.changed }) : props.resource === 'stores' ? _jsx(StoreWorkspace, { id: props.id, close: props.close, changed: props.changed }) : _jsx(ResourceRecordDialog, { ...props });
}
function ResourceRecordDialog({ resource, id, close, changed }) {
    const user = useAdminSession(), canModerate = hasAdminPermission(user, `${resource}.moderate`);
    const [approvalId, setApprovalId] = useState('');
    const attempt = useRef({ signature: '', requestId: '' });
    const [canCancelBlocked, setCanCancelBlocked] = useState(false);
    useEffect(() => { let active = true; if (resource === 'orders')
        void adminCaseApi.capabilities().then(result => { if (active)
            setCanCancelBlocked(result.permissions.includes('orders.cancel_blocked')); }).catch(() => { if (active)
            setCanCancelBlocked(false); }); return () => { active = false; }; }, [resource]);
    const [record, setRecord] = useState(null), [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0);
    const [confirm, setConfirm] = useState(false), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        setRecord(null);
        setHistory([]);
        platformAdminApi.detail(resource, id).then(result => { if (active) {
            setRecord(result.record);
            setHistory(result.history);
        } })
            .catch(cause => { if (active)
            setError(cause instanceof Error ? cause.message : 'Chưa tải được chi tiết.'); })
            .finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, [resource, id, revision]);
    const suspended = resource === 'users' ? record?.status === 'suspended' : Boolean(record?.suspended);
    const actionTitle = resource === 'orders' ? 'Hủy đơn do người bán bị khóa' : suspended ? 'Khôi phục' : resource === 'products' ? 'Ẩn sản phẩm' : resource === 'stores' ? 'Tạm ngừng cửa hàng' : 'Khóa tài khoản';
    const protectedAdmin = resource === 'users' && record?.roles?.includes('platform_admin');
    async function moderate(event) {
        event.preventDefault();
        if (!record || busy)
            return;
        setBusy(true);
        setError('');
        try {
            const action = suspended ? 'restore' : 'suspend';
            const requestId = adminRequestId(attempt.current, { resource, id, action, reason: reason.trim(), version: record.version, approvalId });
            if (resource === 'orders')
                await platformAdminApi.cancelBlockedSeller(record, reason.trim(), requestId, approvalId || undefined);
            else
                await platformAdminApi.moderate(resource, record, action, reason.trim(), requestId);
            setNotice(resource === 'orders' ? 'Đã hủy đơn. Nghĩa vụ tiền được xử lý theo phương thức thanh toán của đơn.' : suspended ? 'Đã khôi phục đối tượng.' : 'Đã áp dụng thao tác và lưu nhật ký.');
            setConfirm(false);
            setReason('');
            setRevision(value => value + 1);
            changed();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Chưa thể thực hiện thao tác.');
        }
        finally {
            setBusy(false);
        }
    }
    const entries = !record ? [] : resource === 'users' ? [
        ['Họ tên', record.fullName], ['Email', record.email], ['Vai trò', record.roles?.map(role => roles[role] || role).join(', ')],
        ['Ngày tham gia', date(record.createdAt, true)], ['Xác minh email', record.emailVerifiedAt ? date(record.emailVerifiedAt, true) : 'Chưa xác minh'],
    ] : resource === 'stores' ? [
        ['Tên cửa hàng', record.name], ['Đường dẫn', record.slug], ['Lĩnh vực', record.category || 'Chưa phân loại'], ['Email liên hệ', record.contactEmail],
        ['Mã chủ cửa hàng', record.ownerId], ['Sản phẩm', record.productCount], ['Shop muốn nhận đơn', record.acceptingOrders ? 'Có' : 'Không'], ['Ngày tạo', date(record.createdAt, true)],
    ] : resource === 'products' ? [
        ['Tên sản phẩm', record.name], ['Cửa hàng', record.storeName], ['Danh mục', record.categoryName || 'Chưa phân loại'], ['Thương hiệu', record.brand || 'Chưa cập nhật'],
        ['Giá hiện tại', money(record.priceMinor)], ['Tồn khả dụng', record.stock], ['Ngày tạo', date(record.createdAt, true)],
    ] : [['Mã đơn', record.id], ['Cửa hàng', record.storeName], ['Mã người mua', record.buyerId], ['Phương thức', record.paymentMethod],
        ['Tiền sản phẩm', money(record.subtotalMinor)], ['Giảm giá', money(record.discountMinor)], ['Phí vận chuyển', money(record.shippingMinor)],
        ['Tổng giá trị', money(record.totalMinor)], ['Đã hoàn tiền', money(record.refundedMinor)], ['Mã vận chuyển', record.shipmentRef || 'Chưa cập nhật'],
        ['Người nhận', record.delivery?.receiverName], ['Số điện thoại', record.delivery?.phoneMasked],
        ['Khu vực nhận', [record.delivery?.ward, record.delivery?.province].filter(Boolean).join(', ') || 'Chưa cập nhật'], ['Ngày đặt', date(record.createdAt, true)]];
    return _jsx(AdminDialog, { title: `Chi tiết ${adminTitles[resource].noun}`, close: () => { if (!busy)
            close(); }, busy: busy, children: _jsxs("div", { className: "pa-detail", children: [notice && _jsx("p", { className: "pa-success", role: "status", children: notice }), error && _jsxs("div", { className: "pa-error", role: "alert", children: [error, _jsx("button", { className: "pa-text-link", disabled: busy, onClick: () => { setConfirm(false); setRevision(value => value + 1); }, children: "T\u1EA3i l\u1EA1i chi ti\u1EBFt" })] }), loading ? _jsx("p", { className: "pa-detail-loading", role: "status", children: "\u0110ang t\u1EA3i chi ti\u1EBFt\u2026" }) : record && _jsxs(_Fragment, { children: [_jsxs("div", { className: "pa-detail-badges", children: [_jsx(StatusBadge, { status: record.status }), record.paymentStatus && _jsx(StatusBadge, { status: record.paymentStatus })] }), record.suspensionReason && _jsxs("p", { className: "pa-warning", children: [_jsx("strong", { children: "L\u00FD do s\u00E0n t\u1EA1m kh\u00F3a:" }), " ", record.suspensionReason] }), record.imageUrl && _jsx("img", { className: "pa-detail-image", src: record.imageUrl, alt: record.name || '' }), _jsx("dl", { children: entries.map(([label, value]) => _jsxs("div", { children: [_jsx("dt", { children: label }), _jsx("dd", { children: value ?? 'Chưa có dữ liệu' })] }, label)) }), record.description && _jsxs("div", { className: "pa-detail-description", children: [_jsx("h3", { children: "M\u00F4 t\u1EA3" }), _jsx("p", { children: record.description })] }), !!record.variants?.length && _jsxs("div", { className: "pa-detail-section", children: [_jsx("h3", { children: "Bi\u1EBFn th\u1EC3 s\u1EA3n ph\u1EA9m" }), _jsx("div", { className: "pa-table-scroll", children: _jsxs("table", { className: "pa-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "SKU / thu\u1ED9c t\u00EDnh" }), _jsx("th", { children: "Gi\u00E1" }), _jsx("th", { children: "T\u1ED3n" }), _jsx("th", { children: "Tr\u1EA1ng th\u00E1i" })] }) }), _jsx("tbody", { children: record.variants.map(variant => _jsxs("tr", { children: [_jsxs("td", { children: [variant.sku, _jsx("small", { children: Object.entries(variant.attributes || {}).map(([k, v]) => `${k}: ${v}`).join(', ') })] }), _jsx("td", { children: money(variant.priceMinor) }), _jsx("td", { children: variant.stock }), _jsx("td", { children: variant.status === 'active' ? 'Hoạt động' : 'Ngừng hoạt động' })] }, variant.id)) })] }) })] }), !!record.items?.length && _jsxs("div", { className: "pa-detail-section", children: [_jsx("h3", { children: "S\u1EA3n ph\u1EA9m trong \u0111\u01A1n" }), _jsx("div", { className: "pa-table-scroll", children: _jsxs("table", { className: "pa-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "S\u1EA3n ph\u1EA9m" }), _jsx("th", { children: "S\u1ED1 l\u01B0\u1EE3ng" }), _jsx("th", { children: "\u0110\u01A1n gi\u00E1" }), _jsx("th", { children: "Th\u00E0nh ti\u1EC1n" })] }) }), _jsx("tbody", { children: record.items.map(item => _jsxs("tr", { children: [_jsxs("td", { children: [_jsx("strong", { children: item.name }), _jsx("small", { children: item.sku })] }), _jsx("td", { children: item.quantity }), _jsx("td", { children: money(item.unitPriceMinor) }), _jsx("td", { children: money(item.lineTotalMinor) })] }, item.id)) })] }) })] }), _jsxs("div", { className: "pa-detail-section", children: [_jsx("h3", { children: resource === 'orders' ? 'Lịch sử xử lý' : 'Lịch sử quản trị' }), history.length ? _jsx("ol", { className: "pa-history", children: history.map((entry, index) => _jsxs("li", { children: [_jsxs("div", { children: [_jsx(StatusBadge, { status: entry.next_status }), _jsx("time", { children: date(entry.created_at, true) })] }), entry.reason && _jsx("p", { children: entry.reason }), _jsx("small", { children: entry.actor_name || (entry.actor_id ? `Quản trị viên ${entry.actor_id.slice(0, 8)}` : 'Hệ thống') })] }, entry.id || index)) }) : _jsx("p", { className: "pa-detail-muted", children: "Ch\u01B0a c\u00F3 thao t\u00E1c \u0111\u01B0\u1EE3c ghi nh\u1EADn." })] }), protectedAdmin && _jsx("p", { className: "pa-detail-muted", children: "T\u00E0i kho\u1EA3n qu\u1EA3n tr\u1ECB \u0111\u01B0\u1EE3c b\u1EA3o v\u1EC7. Vi\u1EC7c c\u1EA5p ho\u1EB7c thu h\u1ED3i quy\u1EC1n th\u1EF1c hi\u1EC7n qua quy tr\u00ECnh qu\u1EA3n tr\u1ECB ri\u00EAng." }), confirm ? _jsxs("form", { className: "pa-confirm-box", onSubmit: moderate, children: [_jsxs("h3", { children: ["X\u00E1c nh\u1EADn ", actionTitle.toLowerCase()] }), resource === 'orders' && _jsx(ApprovalSelector, { operation: "cancel_paid_order", targetId: record.id, version: record.version, value: approvalId, onChange: setApprovalId }), resource === 'orders' && _jsx("p", { children: "Ch\u1EC9 \u00E1p d\u1EE5ng khi shop ho\u1EB7c t\u00E0i kho\u1EA3n ch\u1EE7 shop b\u1ECB s\u00E0n kh\u00F3a v\u00E0 \u0111\u01A1n ch\u01B0a b\u00E0n giao v\u1EADn chuy\u1EC3n. H\u1EC7 th\u1ED1ng s\u1EBD tr\u1EA3 t\u1ED3n v\u00E0 chuy\u1EC3n ngh\u0129a v\u1EE5 ho\u00E0n ti\u1EC1n sang Payment." }), resource !== 'orders' && _jsx("p", { children: suspended ? resource === 'users' ? 'Tài khoản sẽ được gỡ khóa. Email chưa xác minh vẫn cần được xác minh trước khi đăng nhập.' : 'Đối tượng sẽ được gỡ chặn của sàn. Trạng thái bán/nhận đơn vẫn phụ thuộc thiết lập của shop.' : resource === 'users' ? 'Tài khoản sẽ không thể đăng nhập và các phiên hiện tại sẽ bị thu hồi.' : 'Đối tượng sẽ ngừng xuất hiện hoặc nhận giao dịch mới trên sàn. Các đơn đã tạo vẫn được giữ nguyên.' }), !suspended && ['users', 'stores'].includes(resource) && _jsx("p", { children: "\u0110\u01A1n h\u00E0ng, ho\u00E0n ti\u1EC1n v\u00E0 h\u1ED3 s\u01A1 h\u1ED7 tr\u1EE3 \u0111ang m\u1EDF v\u1EABn c\u1EA7n \u0111\u01B0\u1EE3c x\u1EED l\u00FD. D\u00F9ng h\u00E0ng ch\u1EDD h\u1ED3 s\u01A1 v\u00E0 quy\u1EC1n can thi\u1EC7p h\u1EADu m\u00E3i khi ng\u01B0\u1EDDi b\u00E1n kh\u00F4ng th\u1EC3 ti\u1EBFp t\u1EE5c." }), _jsxs("label", { htmlFor: "pa-reason", children: ["L\u00FD do th\u1EF1c hi\u1EC7n", _jsx("textarea", { id: "pa-reason", value: reason, onChange: event => setReason(event.target.value), minLength: 8, maxLength: 500, required: true, disabled: busy, placeholder: "Ghi r\u00F5 l\u00FD do \u0111\u1EC3 l\u01B0u v\u00E0o nh\u1EADt k\u00FD qu\u1EA3n tr\u1ECB\u2026" })] }), _jsxs("div", { className: "pa-dialog-actions", children: [_jsx("button", { type: "button", className: "pa-button pa-button-light", onClick: () => setConfirm(false), disabled: busy, children: "H\u1EE7y" }), _jsx("button", { type: "submit", className: `pa-button ${suspended ? '' : 'pa-button-danger'}`, disabled: busy || reason.trim().length < 8, children: busy ? 'Đang xử lý…' : 'Xác nhận' })] })] }) :
                            _jsxs("div", { className: "pa-dialog-actions", children: [resource !== 'orders' && canModerate && !protectedAdmin && _jsxs("button", { type: "button", className: `pa-button ${suspended ? '' : 'pa-button-danger'}`, onClick: () => { setConfirm(true); setReason(''); setError(''); setNotice(''); }, children: [suspended ? _jsx(UnlockKeyhole, { size: 16 }) : _jsx(LockKeyhole, { size: 16 }), " ", actionTitle] }), resource === 'stores' && !suspended && record.status === 'active' && _jsxs(Link, { to: `/store/${record.slug}`, target: "_blank", rel: "noreferrer", className: "pa-button pa-button-light", children: ["Trang c\u1EEDa h\u00E0ng ", _jsx(ArrowUpRight, { size: 15 })] }), resource === 'products' && !suspended && ['active', 'published'].includes(record.status) && _jsxs(Link, { to: `/products/${record.id}`, target: "_blank", rel: "noreferrer", className: "pa-button pa-button-light", children: ["Trang s\u1EA3n ph\u1EA9m ", _jsx(ArrowUpRight, { size: 15 })] }), resource === 'orders' && _jsxs(Link, { to: `/admin/returns?q=${record.id}`, className: "pa-button pa-button-light", children: ["Y\u00EAu c\u1EA7u tr\u1EA3 h\u00E0ng ", _jsx(ArrowUpRight, { size: 15 })] }), resource === 'orders' && canCancelBlocked && ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_TO_SHIP'].includes(record.status) && _jsx("button", { className: "pa-button pa-button-danger", onClick: () => { setConfirm(true); setReason(''); setError(''); }, children: "H\u1EE7y \u0111\u01A1n khi ng\u01B0\u1EDDi b\u00E1n b\u1ECB kh\u00F3a" }), _jsx("button", { type: "button", className: "pa-button pa-button-light", onClick: close, children: "\u0110\u00F3ng" })] })] })] }) });
}
export default function PlatformRecords({ resource }) {
    const actor = useAdminSession();
    const [params, setParams] = useSearchParams();
    const q = params.get('q') || '', status = params.get('status') || '', role = params.get('role') || '', selected = params.get('id');
    const from = params.get('from') || '', to = params.get('to') || '', statusGroup = params.get('statusGroup') || '', excludeCancelled = params.get('excludeCancelled') || '';
    const ownerId = params.get('ownerId') || '', buyerId = params.get('buyerId') || '', storeId = params.get('storeId') || '';
    const rawPage = Number(params.get('page') || 1), page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const [draft, setDraft] = useState(q), [data, setData] = useState(null), [loading, setLoading] = useState(true);
    const [error, setError] = useState(''), [revision, setRevision] = useState(0);
    const config = adminTitles[resource];
    useEffect(() => setDraft(q), [q, resource]);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        setData(null);
        platformAdminApi.list(resource, { q, status, role: resource === 'users' ? role : undefined, page, limit: 12, from, to, ...(resource === 'stores' ? { ownerId } : {}), ...(resource === 'orders' ? { statusGroup, excludeCancelled, buyerId, storeId } : {}) }).then(result => {
            if (!active)
                return;
            if (result.totalPages > 0 && page > result.totalPages) {
                const next = new URLSearchParams(params);
                next.set('page', String(result.totalPages));
                setParams(next, { replace: true });
                return;
            }
            setData(result);
        }).catch(cause => { if (active)
            setError(cause instanceof Error ? cause.message : 'Chưa tải được danh sách.'); }).finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, [resource, q, status, role, page, from, to, statusGroup, excludeCancelled, ownerId, buyerId, storeId, revision, params, setParams]);
    function filter(key, value) { const next = new URLSearchParams(params); if (value)
        next.set(key, value);
    else
        next.delete(key); if (key !== 'page' && key !== 'id')
        next.delete('page'); if (key !== 'id')
        next.delete('id'); setParams(next); }
    function search(event) { event.preventDefault(); filter('q', draft.trim()); }
    const heads = resource === 'users' ? ['Người dùng', 'Vai trò', 'Trạng thái', 'Ngày tham gia'] : resource === 'stores' ? ['Cửa hàng', 'Sản phẩm', 'Trạng thái', 'Ngày tạo'] :
        resource === 'products' ? ['Sản phẩm / cửa hàng', 'Giá hiện tại', 'Tồn kho', 'Trạng thái'] : ['Mã đơn / cửa hàng', 'Giá trị đơn', 'Trạng thái', 'Ngày đặt'];
    return _jsxs("div", { className: "pa-page", children: [_jsxs("div", { className: "pa-page-heading", children: [_jsxs("div", { children: [_jsx("span", { className: "pa-eyebrow", children: "QU\u1EA2N L\u00DD V\u1EACN H\u00C0NH" }), _jsx("h1", { children: config.title }), _jsx("p", { children: config.description })] }), _jsxs("button", { className: "pa-button pa-button-light", disabled: loading, onClick: () => setRevision(value => value + 1), children: [_jsx(RefreshCw, { size: 16, className: loading ? 'animate-spin' : '' }), "L\u00E0m m\u1EDBi"] })] }), resource === 'users' && hasAdminPermission(actor, 'users.view_sensitive') && _jsx(UserContactSearch, { select: id => filter('id', id) }), resource === 'stores' && _jsx(StoreApplicationQueue, { select: id => filter('id', id), revision: revision }), storeId && _jsxs("p", { className: "pa-warning", children: ["\u0110ang l\u1ECDc \u0111\u01A1n theo c\u1EEDa h\u00E0ng #", storeId.slice(0, 8), ". ", _jsx("button", { className: "pa-text-link", onClick: () => filter('storeId', ''), children: "B\u1ECF b\u1ED9 l\u1ECDc c\u1EEDa h\u00E0ng" })] }), (ownerId || buyerId) && _jsxs("p", { className: "pa-warning", children: ["\u0110ang l\u1ECDc theo ng\u01B0\u1EDDi d\u00F9ng #", (ownerId || buyerId).slice(0, 8), ". ", _jsx("button", { className: "pa-text-link", onClick: () => filter(ownerId ? 'ownerId' : 'buyerId', ''), children: "B\u1ECF b\u1ED9 l\u1ECDc ng\u01B0\u1EDDi d\u00F9ng" })] }), _jsxs("section", { className: "pa-panel pa-records", children: [_jsxs("div", { className: "pa-records-top", children: [_jsxs("div", { children: [_jsxs("h2", { children: ["Danh s\u00E1ch ", config.noun] }), _jsx("span", { className: "pa-count-chip", children: data ? formatNumber(data.total) : '—' })] }), _jsxs("form", { className: "pa-search", onSubmit: search, children: [_jsx(Search, { size: 17 }), _jsx("input", { "aria-label": `Tìm ${config.noun}`, value: draft, onChange: event => setDraft(event.target.value), maxLength: 100, placeholder: resource === 'users' ? 'Tìm ID, tên hoặc email…' : resource === 'orders' ? 'Tìm mã đơn, cửa hàng, sản phẩm…' : 'Tìm kiếm…' }), _jsx("button", { type: "submit", children: "T\u00ECm ki\u1EBFm" })] })] }), _jsxs("div", { className: "pa-filters", children: [_jsxs("label", { children: [_jsx("span", { className: "sr-only", children: "Tr\u1EA1ng th\u00E1i" }), _jsxs("select", { value: status, onChange: event => filter('status', event.target.value), children: [_jsx("option", { value: "", children: "T\u1EA5t c\u1EA3 tr\u1EA1ng th\u00E1i" }), filters[resource].map(([value, label]) => _jsx("option", { value: value, children: label }, value))] })] }), _jsxs("label", { children: ["T\u1EEB ng\u00E0y", _jsx("input", { type: "date", value: from, onChange: event => filter('from', event.target.value) })] }), _jsxs("label", { children: ["\u0110\u1EBFn ng\u00E0y", _jsx("input", { type: "date", value: to, min: from, onChange: event => filter('to', event.target.value) })] }), statusGroup && _jsxs("span", { children: ["Nh\u00F3m: ", { pending: 'Chờ xử lý', delivered: 'Đã giao / hoàn tất', cancelled: 'Đã hủy', other: 'Trạng thái khác' }[statusGroup] || statusGroup, _jsx("button", { className: "pa-text-link", onClick: () => filter('statusGroup', ''), children: "B\u1ECF" })] }), excludeCancelled && _jsxs("span", { children: ["Lo\u1EA1i \u0111\u01A1n \u0111\u00E3 h\u1EE7y", _jsx("button", { className: "pa-text-link", onClick: () => filter('excludeCancelled', ''), children: "B\u1ECF" })] }), resource === 'users' && _jsxs("label", { children: [_jsx("span", { className: "sr-only", children: "Vai tr\u00F2" }), _jsxs("select", { value: role, onChange: event => filter('role', event.target.value), children: [_jsx("option", { value: "", children: "T\u1EA5t c\u1EA3 vai tr\u00F2" }), Object.entries(roles).map(([value, label]) => _jsx("option", { value: value, children: label }, value))] })] }), (q || status || role || from || to || statusGroup || excludeCancelled) && _jsx("button", { className: "pa-text-link", onClick: () => setParams({}), children: "X\u00F3a b\u1ED9 l\u1ECDc" })] }), error && _jsxs("div", { className: "pa-error pa-record-error", role: "alert", children: [error, _jsx("button", { className: "pa-text-link", onClick: () => setRevision(value => value + 1), children: "Th\u1EED l\u1EA1i" })] }), _jsx("div", { className: "pa-table-scroll", "aria-busy": loading, children: _jsxs("table", { className: "pa-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [heads.map(head => _jsx("th", { children: head }, head)), _jsx("th", { children: _jsx("span", { className: "sr-only", children: "Thao t\u00E1c" }) })] }) }), _jsxs("tbody", { children: [data?.items.map(row => _jsxs("tr", { children: [resource === 'users' && _jsxs(_Fragment, { children: [_jsx("td", { children: _jsxs("div", { className: "pa-user-cell", children: [_jsx("span", { className: "pa-table-avatar", children: row.fullName?.slice(0, 1).toUpperCase() || _jsx(Users, { size: 17 }) }), _jsxs("div", { children: [_jsx("strong", { className: "pa-row-title", children: row.fullName }), _jsx("small", { children: row.email })] })] }) }), _jsx("td", { children: _jsx("div", { className: "pa-role-list", children: row.roles?.map(role => _jsxs("span", { className: `pa-role ${role === 'platform_admin' ? 'pa-role-admin' : ''}`, children: [role === 'platform_admin' && _jsx(ShieldCheck, { size: 11 }), " ", roles[role] || role] }, role)) }) }), _jsx("td", { children: _jsx(StatusBadge, { status: row.status }) }), _jsx("td", { children: date(row.createdAt) })] }), resource === 'stores' && _jsxs(_Fragment, { children: [_jsx("td", { children: _jsxs("div", { className: "pa-user-cell", children: [_jsx("span", { className: "pa-table-avatar pa-avatar-green", children: _jsx(Store, { size: 19 }) }), _jsxs("div", { children: [_jsx("strong", { className: "pa-row-title", children: row.name }), _jsxs("small", { children: ["/", row.slug] })] })] }) }), _jsxs("td", { children: [formatNumber(row.productCount), " s\u1EA3n ph\u1EA9m"] }), _jsxs("td", { children: [_jsx(StatusBadge, { status: row.status }), _jsxs("small", { children: [row.acceptingOrders ? 'Seller muốn nhận đơn' : 'Seller tự ngừng', " \u00B7 ", registrationLabels[row.registrationStatus || 'NOT_REQUIRED']] })] }), _jsx("td", { children: date(row.createdAt) })] }), resource === 'products' && _jsxs(_Fragment, { children: [_jsx("td", { children: _jsxs("div", { className: "pa-user-cell", children: [_jsx("span", { className: "pa-table-avatar pa-avatar-purple", children: _jsx(Package, { size: 19 }) }), _jsxs("div", { children: [_jsx("strong", { className: "pa-row-title", children: row.name }), _jsx("small", { children: row.storeName })] })] }) }), _jsx("td", { className: "pa-table-money", children: money(row.priceMinor) }), _jsx("td", { children: formatNumber(row.stock) }), _jsx("td", { children: _jsx(StatusBadge, { status: row.status }) })] }), resource === 'orders' && _jsxs(_Fragment, { children: [_jsxs("td", { children: [_jsxs("strong", { className: "pa-row-title", children: ["#", row.id.slice(0, 8).toUpperCase()] }), _jsx("small", { children: row.storeName })] }), _jsx("td", { className: "pa-table-money", children: money(row.totalMinor) }), _jsxs("td", { children: [_jsx(StatusBadge, { status: row.status }), _jsx("small", { children: row.paymentStatus === 'PAID' ? 'Đã thanh toán' : row.paymentStatus === 'REFUNDED' ? 'Đã hoàn tiền' : row.paymentMethod })] }), _jsx("td", { children: date(row.createdAt, true) })] }), _jsx("td", { children: _jsxs("button", { className: "pa-row-action", onClick: () => filter('id', row.id), "aria-label": `Xem chi tiết ${row.fullName || row.name || row.id}`, children: [_jsx(Eye, { size: 16 }), _jsx("span", { children: "Chi ti\u1EBFt" })] }) })] }, row.id)), !data?.items.length && _jsx("tr", { children: _jsx("td", { colSpan: 5, className: "pa-empty-cell", children: loading ? 'Đang tải dữ liệu…' : error ? 'Dữ liệu chưa sẵn sàng.' : q || status || role ? 'Không có kết quả phù hợp với bộ lọc.' : `Chưa có ${config.noun}.` }) })] })] }) }), _jsxs("div", { className: "pa-pagination", children: [_jsx("span", { children: data ? data.total ? `Hiển thị ${(page - 1) * data.limit + 1}–${Math.min(page * data.limit, data.total)} trong ${formatNumber(data.total)} ${config.noun}` : `0 ${config.noun}` : 'Chưa tải dữ liệu' }), _jsxs("div", { children: [_jsx("button", { "aria-label": "Trang tr\u01B0\u1EDBc", disabled: loading || page <= 1, onClick: () => filter('page', String(page - 1)), children: _jsx(ChevronLeft, { size: 17 }) }), _jsxs("span", { children: ["Trang ", page, " / ", Math.max(1, data?.totalPages || 1)] }), _jsx("button", { "aria-label": "Trang sau", disabled: loading || !data || page >= data.totalPages, onClick: () => filter('page', String(page + 1)), children: _jsx(ChevronRight, { size: 17 }) })] })] })] }), selected && _jsx(RecordDialog, { resource: resource, id: selected, close: () => filter('id', ''), changed: () => setRevision(value => value + 1) }, `${resource}:${selected}`)] });
}
