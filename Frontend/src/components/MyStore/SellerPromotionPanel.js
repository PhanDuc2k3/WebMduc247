import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { engagementApi } from "../../api/engagementApi";
import { catalogApi } from "../../api/catalogApi";
import { vnd } from "../../api/orderV2Api";
const field = "mt-1 w-full rounded-xl border border-[#dce3ee] bg-white px-3 py-2 text-sm";
const localTime = (milliseconds) => {
    const date = new Date(milliseconds);
    return new Date(milliseconds - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export default function SellerPromotionPanel({ storeId, products }) {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState({ title: "", code: "", discountType: "FIXED", discountValue: "10000",
        minSpendMinor: "0", maxDiscountMinor: "", totalLimit: "100", perUserLimit: "1",
        scopeType: "STORE", scopeId: "", segment: "ALL",
        startsAt: localTime(Date.now()), endsAt: localTime(Date.now() + 86400_000) });
    const [flash, setFlash] = useState({ title: "", variantId: "", salePriceMinor: "",
        quota: "10", startsAt: localTime(Date.now()), endsAt: localTime(Date.now() + 3600_000) });
    const variants = useMemo(() => products.flatMap(product => (product.variants || []).map(item => ({
        id: item.id, label: `${product.name} · ${item.sku} · ${vnd(item.priceMinor)}`,
        price: item.priceMinor
    }))), [products]);
    useEffect(() => {
        let active = true;
        setLoading(true);
        engagementApi.seller(storeId).then(result => { if (active)
            setCampaigns(result.campaigns); })
            .catch(error => {
            if (active)
                toast.error(error instanceof Error ? error.message : "Không thể tải chương trình.", { containerId: "general-toast" });
        })
            .finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, [storeId]);
    useEffect(() => {
        let active = true;
        const flatten = (nodes, level = 0) => nodes.flatMap(item => [{ id: item.id, name: `${"— ".repeat(level)}${item.name}` },
            ...flatten(item.children || [], level + 1)]);
        catalogApi.categories().then(result => { if (active)
            setCategories(flatten(result.categories)); })
            .catch(error => {
            if (active)
                toast.warning(error instanceof Error ? error.message : "Chưa thể tải danh mục.", { containerId: "general-toast", toastId: "promo-categories" });
        });
        return () => { active = false; };
    }, []);
    async function reload() { setCampaigns((await engagementApi.seller(storeId)).campaigns); }
    async function createVoucher(event) {
        event.preventDefault();
        setBusy(true);
        try {
            await engagementApi.createVoucher(storeId, {
                title: form.title.trim(), code: form.code.trim().toUpperCase(),
                discountType: form.discountType, discountValue: form.discountType === "PERCENT" ?
                    Math.round(Number(form.discountValue) * 100) : Number(form.discountValue),
                minSpendMinor: Number(form.minSpendMinor),
                maxDiscountMinor: form.maxDiscountMinor ? Number(form.maxDiscountMinor) : null,
                totalLimit: Number(form.totalLimit), perUserLimit: Number(form.perUserLimit),
                scopeType: form.scopeType, scopeId: form.scopeType === "STORE" ? null : form.scopeId,
                segment: form.segment, startsAt: new Date(form.startsAt).toISOString(),
                endsAt: new Date(form.endsAt).toISOString()
            });
            await reload();
            setForm(current => ({ ...current, title: "", code: "" }));
            toast.success("Đã tạo voucher shop.", { containerId: "general-toast" });
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Không thể tạo voucher.", { containerId: "general-toast" });
        }
        finally {
            setBusy(false);
        }
    }
    async function createFlash(event) {
        event.preventDefault();
        setBusy(true);
        try {
            await engagementApi.createFlashSale(storeId, {
                title: flash.title.trim(), startsAt: new Date(flash.startsAt).toISOString(),
                endsAt: new Date(flash.endsAt).toISOString(),
                items: [{ variantId: flash.variantId, salePriceMinor: Number(flash.salePriceMinor), quota: Number(flash.quota) }]
            });
            await reload();
            setFlash(current => ({ ...current, title: "", salePriceMinor: "" }));
            toast.success("Đã tạo Flash Sale.", { containerId: "general-toast" });
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Không thể tạo Flash Sale.", { containerId: "general-toast" });
        }
        finally {
            setBusy(false);
        }
    }
    async function toggle(campaign) {
        setBusy(true);
        try {
            await engagementApi.setStatus(campaign.id, campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE");
            await reload();
            toast.success("Đã cập nhật chương trình.", { containerId: "general-toast" });
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Không thể cập nhật chương trình.", { containerId: "general-toast" });
        }
        finally {
            setBusy(false);
        }
    }
    return _jsxs("section", { className: "rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-sm sm:p-6", children: [_jsx("h2", { className: "text-xl font-bold", children: "Khuy\u1EBFn m\u00E3i c\u1EE7a shop" }), _jsx("p", { className: "mt-1 text-sm text-[#718099]", children: "Gi\u00E1 v\u00E0 quota \u0111\u01B0\u1EE3c ki\u1EC3m tra tr\u00EAn server. M\u1ED7i checkout d\u00F9ng t\u1ED1i \u0111a m\u1ED9t m\u00E3 shop c\u00F9ng m\u1ED9t m\u00E3 s\u00E0n." }), loading ? _jsx("p", { className: "mt-4", children: "\u0110ang t\u1EA3i..." }) : campaigns.length ?
                _jsx("div", { className: "mt-4 space-y-2", children: campaigns.map(item => _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3", children: [_jsxs("div", { children: [_jsx("strong", { children: item.title }), _jsxs("p", { className: "text-sm text-[#718099]", children: [item.type === "VOUCHER" ?
                                                `Mã ${item.voucher?.code} · Đã dùng ${item.voucher?.usedCount || 0}/${item.voucher?.totalLimit || 0}` :
                                                `Flash Sale · ${item.flashItems?.reduce((sum, flash) => sum + flash.soldCount, 0) || 0} đã bán`, " \u00B7 ", item.status, " \u00B7 \u0111\u1EBFn ", new Date(item.endsAt).toLocaleString("vi-VN")] })] }), item.status !== "ENDED" && _jsx("button", { type: "button", disabled: busy, onClick: () => void toggle(item), className: "font-bold text-[#476de4] disabled:opacity-50", children: item.status === "ACTIVE" ? "Tạm dừng" : "Bật lại" })] }, item.id)) }) : _jsx("p", { className: "mt-4 text-sm text-[#718099]", children: "Ch\u01B0a c\u00F3 ch\u01B0\u01A1ng tr\u00ECnh." }), _jsxs("div", { className: "mt-6 grid gap-6 xl:grid-cols-2", children: [_jsxs("form", { onSubmit: createVoucher, className: "space-y-3 rounded-xl bg-[#f7f9fd] p-4", children: [_jsx("h3", { className: "font-bold", children: "T\u1EA1o voucher" }), _jsxs("label", { className: "block text-sm", children: ["T\u00EAn ch\u01B0\u01A1ng tr\u00ECnh", _jsx("input", { required: true, minLength: 3, className: field, value: form.title, onChange: event => setForm({ ...form, title: event.target.value }) })] }), _jsxs("label", { className: "block text-sm", children: ["M\u00E3 voucher", _jsx("input", { required: true, minLength: 4, maxLength: 32, className: field, value: form.code, onChange: event => setForm({ ...form, code: event.target.value.toUpperCase() }) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("label", { className: "text-sm", children: ["Lo\u1EA1i gi\u1EA3m", _jsxs("select", { className: field, value: form.discountType, onChange: event => setForm({ ...form, discountType: event.target.value,
                                                    discountValue: event.target.value === "PERCENT" ? "10" : "10000" }), children: [_jsx("option", { value: "FIXED", children: "S\u1ED1 ti\u1EC1n (\u20AB)" }), _jsx("option", { value: "PERCENT", children: "Ph\u1EA7n tr\u0103m (%)" })] })] }), _jsxs("label", { className: "text-sm", children: ["Gi\u00E1 tr\u1ECB", _jsx("input", { required: true, type: "number", min: form.discountType === "PERCENT" ? 0.01 : 1, step: form.discountType === "PERCENT" ? "0.01" : "1", max: form.discountType === "PERCENT" ? 100 : undefined, className: field, value: form.discountValue, onChange: event => setForm({ ...form, discountValue: event.target.value }) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("label", { className: "text-sm", children: ["\u0110\u01A1n t\u1ED1i thi\u1EC3u (\u20AB)", _jsx("input", { type: "number", min: 0, className: field, value: form.minSpendMinor, onChange: event => setForm({ ...form, minSpendMinor: event.target.value }) })] }), _jsxs("label", { className: "text-sm", children: ["Gi\u1EA3m t\u1ED1i \u0111a (\u20AB)", _jsx("input", { type: "number", min: 0, placeholder: "Kh\u00F4ng gi\u1EDBi h\u1EA1n", className: field, value: form.maxDiscountMinor, onChange: event => setForm({ ...form, maxDiscountMinor: event.target.value }) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("label", { className: "text-sm", children: ["T\u1ED5ng l\u01B0\u1EE3t", _jsx("input", { required: true, type: "number", min: 1, className: field, value: form.totalLimit, onChange: event => setForm({ ...form, totalLimit: event.target.value }) })] }), _jsxs("label", { className: "text-sm", children: ["L\u01B0\u1EE3t m\u1ED7i ng\u01B0\u1EDDi", _jsx("input", { required: true, type: "number", min: 1, className: field, value: form.perUserLimit, onChange: event => setForm({ ...form, perUserLimit: event.target.value }) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("label", { className: "text-sm", children: ["Ph\u1EA1m vi", _jsxs("select", { className: field, value: form.scopeType, onChange: event => setForm({ ...form, scopeType: event.target.value, scopeId: "" }), children: [_jsx("option", { value: "STORE", children: "C\u1EA3 shop" }), _jsx("option", { value: "SKU", children: "M\u1ED9t SKU" }), _jsx("option", { value: "CATEGORY", children: "Danh m\u1EE5c" })] })] }), _jsxs("label", { className: "text-sm", children: ["\u0110\u1ED1i t\u01B0\u1EE3ng", _jsxs("select", { className: field, value: form.segment, onChange: event => setForm({ ...form, segment: event.target.value }), children: [_jsx("option", { value: "ALL", children: "M\u1ECDi ng\u01B0\u1EDDi mua" }), _jsx("option", { value: "FIRST_ORDER", children: "\u0110\u01A1n \u0111\u1EA7u ti\u00EAn" })] })] })] }), form.scopeType === "SKU" && _jsxs("label", { className: "block text-sm", children: ["SKU", _jsxs("select", { required: true, className: field, value: form.scopeId, onChange: event => setForm({ ...form, scopeId: event.target.value }), children: [_jsx("option", { value: "", children: "Ch\u1ECDn SKU" }), variants.map(item => _jsx("option", { value: item.id, children: item.label }, item.id))] })] }), form.scopeType === "CATEGORY" && _jsxs("label", { className: "block text-sm", children: ["Danh m\u1EE5c", _jsxs("select", { required: true, className: field, value: form.scopeId, onChange: event => setForm({ ...form, scopeId: event.target.value }), children: [_jsx("option", { value: "", children: "Ch\u1ECDn danh m\u1EE5c" }), categories.map(item => _jsx("option", { value: item.id, children: item.name }, item.id))] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("label", { className: "text-sm", children: ["B\u1EAFt \u0111\u1EA7u", _jsx("input", { required: true, type: "datetime-local", className: field, value: form.startsAt, onChange: event => setForm({ ...form, startsAt: event.target.value }) })] }), _jsxs("label", { className: "text-sm", children: ["K\u1EBFt th\u00FAc", _jsx("input", { required: true, type: "datetime-local", className: field, value: form.endsAt, onChange: event => setForm({ ...form, endsAt: event.target.value }) })] })] }), _jsx("button", { disabled: busy, className: "rounded-xl bg-[#476de4] px-4 py-2 font-bold text-white disabled:opacity-50", children: "T\u1EA1o voucher" })] }), _jsxs("form", { onSubmit: createFlash, className: "space-y-3 rounded-xl bg-[#f7f9fd] p-4", children: [_jsx("h3", { className: "font-bold", children: "T\u1EA1o Flash Sale" }), _jsxs("label", { className: "block text-sm", children: ["T\u00EAn ch\u01B0\u01A1ng tr\u00ECnh", _jsx("input", { required: true, minLength: 3, className: field, value: flash.title, onChange: event => setFlash({ ...flash, title: event.target.value }) })] }), _jsxs("label", { className: "block text-sm", children: ["SKU", _jsxs("select", { required: true, className: field, value: flash.variantId, onChange: event => setFlash({ ...flash, variantId: event.target.value }), children: [_jsx("option", { value: "", children: "Ch\u1ECDn SKU" }), variants.map(item => _jsx("option", { value: item.id, children: item.label }, item.id))] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("label", { className: "text-sm", children: ["Gi\u00E1 Flash (\u20AB)", _jsx("input", { required: true, type: "number", min: 1, className: field, value: flash.salePriceMinor, onChange: event => setFlash({ ...flash, salePriceMinor: event.target.value }) })] }), _jsxs("label", { className: "text-sm", children: ["Quota", _jsx("input", { required: true, type: "number", min: 1, className: field, value: flash.quota, onChange: event => setFlash({ ...flash, quota: event.target.value }) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("label", { className: "text-sm", children: ["B\u1EAFt \u0111\u1EA7u", _jsx("input", { required: true, type: "datetime-local", className: field, value: flash.startsAt, onChange: event => setFlash({ ...flash, startsAt: event.target.value }) })] }), _jsxs("label", { className: "text-sm", children: ["K\u1EBFt th\u00FAc", _jsx("input", { required: true, type: "datetime-local", className: field, value: flash.endsAt, onChange: event => setFlash({ ...flash, endsAt: event.target.value }) })] })] }), _jsx("button", { disabled: busy || !variants.length, className: "rounded-xl bg-[#476de4] px-4 py-2 font-bold text-white disabled:opacity-50", children: "T\u1EA1o Flash Sale" })] })] })] });
}
