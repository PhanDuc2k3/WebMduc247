import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { paymentV2Api } from "../../api/paymentV2Api";
import { orderV2Api } from "../../api/orderV2Api";
export default function PaymentReturnV2() {
    const location = useLocation();
    const id = sessionStorage.getItem("pendingPaymentIntentId") ||
        new URLSearchParams(location.search).get("orderId") || "";
    const [intent, setIntent] = useState(null);
    const [orderPaid, setOrderPaid] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => {
        if (!id) {
            setError("Không tìm thấy giao dịch để kiểm tra.");
            return;
        }
        let active = true;
        async function refresh() {
            try {
                const result = await paymentV2Api.intent(id);
                if (!active)
                    return;
                setIntent(result.intent);
                setError("");
                if (result.intent.status === "SUCCEEDED") {
                    const group = (await orderV2Api.buyerOrder(result.intent.orderGroupId)).group;
                    if (active)
                        setOrderPaid(group.paymentStatus === "PAID");
                    if (group.paymentStatus === "PAID")
                        sessionStorage.removeItem("pendingPaymentIntentId");
                }
            }
            catch (cause) {
                if (active) {
                    const message = cause instanceof Error ? cause.message : "Không thể kiểm tra thanh toán.";
                    setError(message);
                    toast.error(message, { containerId: "general-toast", toastId: "payment-return-error" });
                }
            }
        }
        void refresh();
        const timer = setInterval(() => { void refresh(); }, 3000);
        return () => { active = false; clearInterval(timer); };
    }, [id]);
    const title = intent?.status === "REFUNDED" ? "Đã hoàn tiền" :
        intent?.status === "PARTIALLY_REFUNDED" ? "Đã hoàn một phần" :
            orderPaid ? "Thanh toán đã xác nhận" : intent?.needsReview ?
                "Giao dịch cần đối soát" : ["FAILED", "EXPIRED"].includes(intent?.status || "") ?
                "Thanh toán chưa hoàn tất" : "Đang xác minh thanh toán";
    return _jsx("div", { className: "mx-auto max-w-2xl py-16 text-center", children: _jsxs("div", { className: "rounded-2xl border border-[#e6ebf5] bg-white p-8", children: [_jsx("h1", { className: "text-3xl font-extrabold text-[#172a49]", children: title }), error ? _jsx("p", { className: "mt-4 text-red-600", children: error }) :
                    _jsx("p", { className: "mt-4 text-[#70819d]", children: ["REFUNDED", "PARTIALLY_REFUNDED"].includes(intent?.status || "") ?
                            "Xem chi tiết từng khoản hoàn trong đơn hàng." :
                            orderPaid ? "Nhà cung cấp đã xác nhận và đơn hàng đã được cập nhật." :
                                intent?.needsReview ? "Hệ thống đang đối soát với nhà cung cấp. Vui lòng chưa thanh toán lại." :
                                    "Việc trở về trang này không xác nhận đã nhận tiền. Trạng thái sẽ cập nhật khi server nhận kết quả hợp lệ." }), intent && _jsxs("p", { className: "mt-3 text-sm text-[#70819d]", children: ["Tr\u1EA1ng th\u00E1i giao d\u1ECBch: ", intent.status] }), _jsxs("div", { className: "mt-7 flex justify-center gap-5", children: [intent?.orderGroupId && _jsx(Link, { to: `/orders/${intent.orderGroupId}`, className: "font-bold text-[#476de4]", children: "Xem \u0111\u01A1n h\u00E0ng" }), _jsx(Link, { to: "/orders", className: "font-bold text-[#476de4]", children: "L\u1ECBch s\u1EED \u0111\u01A1n" })] })] }) });
}
