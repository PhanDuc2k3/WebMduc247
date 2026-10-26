import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { paymentV2Api, type PaymentIntent } from "../../api/paymentV2Api";
import { orderV2Api } from "../../api/orderV2Api";

export default function PaymentReturnV2() {
  const location=useLocation();
  const id=sessionStorage.getItem("pendingPaymentIntentId") ||
    new URLSearchParams(location.search).get("orderId") || "";
  const [intent,setIntent]=useState<PaymentIntent|null>(null);
  const [orderPaid,setOrderPaid]=useState(false);
  const [error,setError]=useState("");
  useEffect(() => {
    if (!id) { setError("Không tìm thấy giao dịch để kiểm tra."); return; }
    let active=true;
    async function refresh() {
      try {
        const result=await paymentV2Api.intent(id);
        if (!active) return;
        setIntent(result.intent); setError("");
        if (result.intent.status==="SUCCEEDED") {
          const group=(await orderV2Api.buyerOrder(result.intent.orderGroupId)).group;
          if (active) setOrderPaid(group.paymentStatus==="PAID");
          if (group.paymentStatus==="PAID") sessionStorage.removeItem("pendingPaymentIntentId");
        }
      } catch (cause) {
        if (active) {
          const message=cause instanceof Error ? cause.message : "Không thể kiểm tra thanh toán.";
          setError(message); toast.error(message,{ containerId:"general-toast",toastId:"payment-return-error" });
        }
      }
    }
    void refresh();
    const timer=setInterval(() => { void refresh(); },3000);
    return () => { active=false; clearInterval(timer); };
  },[id]);
  const title=intent?.status==="REFUNDED" ? "Đã hoàn tiền" :
    intent?.status==="PARTIALLY_REFUNDED" ? "Đã hoàn một phần" :
    orderPaid ? "Thanh toán đã xác nhận" : intent?.needsReview ?
    "Giao dịch cần đối soát" : ["FAILED","EXPIRED"].includes(intent?.status||"") ?
    "Thanh toán chưa hoàn tất" : "Đang xác minh thanh toán";
  return <div className="mx-auto max-w-2xl py-16 text-center"><div className="rounded-2xl border border-[#e6ebf5] bg-white p-8">
    <h1 className="text-3xl font-extrabold text-[#172a49]">{title}</h1>
    {error ? <p className="mt-4 text-red-600">{error}</p> :
      <p className="mt-4 text-[#70819d]">{["REFUNDED","PARTIALLY_REFUNDED"].includes(intent?.status||"") ?
        "Xem chi tiết từng khoản hoàn trong đơn hàng." :
        orderPaid ? "Nhà cung cấp đã xác nhận và đơn hàng đã được cập nhật." :
        intent?.needsReview ? "Hệ thống đang đối soát với nhà cung cấp. Vui lòng chưa thanh toán lại." :
        "Việc trở về trang này không xác nhận đã nhận tiền. Trạng thái sẽ cập nhật khi server nhận kết quả hợp lệ."}</p>}
    {intent && <p className="mt-3 text-sm text-[#70819d]">Trạng thái giao dịch: {intent.status}</p>}
    <div className="mt-7 flex justify-center gap-5">
      {intent?.orderGroupId && <Link to={`/orders/${intent.orderGroupId}`} className="font-bold text-[#476de4]">Xem đơn hàng</Link>}
      <Link to="/orders" className="font-bold text-[#476de4]">Lịch sử đơn</Link>
    </div>
  </div></div>;
}
