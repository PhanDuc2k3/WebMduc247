import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { catalogApi } from "../../api/catalogApi";
export default function InventoryPanel({ variantId, onAdjusted }) {
    const [balance, setBalance] = useState(null);
    const [delta, setDelta] = useState("");
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [page, setPage] = useState(1);
    useEffect(() => {
        let active = true;
        catalogApi.inventory(variantId, page).then(result => { if (active)
            setBalance(result); })
            .catch(error => { if (active)
            toast.error(error instanceof Error ? error.message : "Không thể tải tồn kho.", { containerId: "general-toast" }); });
        return () => { active = false; };
    }, [variantId, page]);
    function submit(event) {
        event.preventDefault();
        void (async () => {
            setBusy(true);
            try {
                await catalogApi.adjustInventory(variantId, Number(delta), reason);
                setDelta("");
                setReason("");
                toast.success("Đã điều chỉnh tồn kho.", { containerId: "general-toast" });
                try {
                    setPage(1);
                    setBalance(await catalogApi.inventory(variantId, 1));
                    await onAdjusted();
                }
                catch {
                    toast.warning("Đã lưu tồn kho nhưng chưa tải lại được lịch sử.", { containerId: "general-toast" });
                }
            }
            catch (error) {
                toast.error(error instanceof Error ? error.message : "Không thể điều chỉnh tồn kho.", { containerId: "general-toast" });
            }
            finally {
                setBusy(false);
            }
        })();
    }
    return _jsxs("section", { className: "rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-sm", children: [_jsx("h2", { className: "text-lg font-bold", children: "T\u1ED3n kho SKU" }), _jsx("p", { className: "mt-2 text-sm text-[#718099]", children: "T\u1ED3n kh\u1EA3 d\u1EE5ng = h\u00E0ng th\u1EF1c c\u00F3 \u2212 h\u00E0ng \u0111ang gi\u1EEF." }), balance ? _jsx("div", { className: "mt-4 grid gap-3 sm:grid-cols-3", children: [["Hàng thực có", balance.onHand], ["Đang giữ", balance.reserved], ["Khả dụng", balance.available]].map(([label, value]) => _jsxs("div", { className: "rounded-xl bg-[#f4f7fb] p-4", children: [_jsx("small", { className: "text-[#718099]", children: label }), _jsx("strong", { className: "mt-1 block text-2xl text-[#172b49]", children: value })] }, label)) }) : _jsx("p", { className: "mt-4 text-sm", children: "\u0110ang t\u1EA3i t\u1ED3n kho..." }), _jsxs("form", { className: "mt-5 flex flex-wrap items-end gap-3", onSubmit: submit, children: [_jsxs("label", { className: "text-sm font-bold", children: ["Thay \u0111\u1ED5i s\u1ED1 l\u01B0\u1EE3ng", _jsx("input", { className: "mt-1 block w-36 rounded-xl border border-[#dce3ee] px-3 py-2", type: "number", step: "1", value: delta, onChange: event => setDelta(event.target.value), placeholder: "+10 ho\u1EB7c -3", required: true })] }), _jsxs("label", { className: "min-w-48 flex-1 text-sm font-bold", children: ["L\u00FD do", _jsx("input", { className: "mt-1 w-full rounded-xl border border-[#dce3ee] px-3 py-2", value: reason, onChange: event => setReason(event.target.value), minLength: 3, maxLength: 300, required: true })] }), _jsx("button", { className: "rounded-xl bg-[#476de4] px-4 py-2 font-bold text-white disabled:opacity-50", disabled: busy, children: "L\u01B0u \u0111i\u1EC1u ch\u1EC9nh" })] }), _jsx("h3", { className: "mt-7 font-bold", children: "L\u1ECBch s\u1EED g\u1EA7n \u0111\u00E2y" }), _jsx("div", { className: "mt-3 space-y-2", children: balance?.movements.length ? balance.movements.map(item => _jsxs("div", { className: "flex flex-wrap justify-between gap-2 border-b border-[#e8edf5] pb-2 text-sm", children: [_jsxs("span", { children: [item.reason, " \u00B7 ", item.source] }), _jsxs("span", { className: "font-bold", children: [item.delta > 0 ? "+" : "", item.delta] }), _jsx("small", { className: "text-[#718099]", children: new Date(item.occurredAt).toLocaleString("vi-VN") })] }, item.id)) : _jsx("p", { className: "text-sm text-[#718099]", children: "Ch\u01B0a c\u00F3 l\u1ECBch s\u1EED." }) }), balance && balance.total > 20 && _jsxs("nav", { className: "mt-4 flex items-center gap-3 text-sm", children: [_jsx("button", { type: "button", disabled: page <= 1, onClick: () => setPage(current => current - 1), children: "Tr\u01B0\u1EDBc" }), _jsxs("span", { children: ["Trang ", page, " / ", Math.ceil(balance.total / 20)] }), _jsx("button", { type: "button", disabled: page * 20 >= balance.total, onClick: () => setPage(current => current + 1), children: "Sau" })] })] });
}
