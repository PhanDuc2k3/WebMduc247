import React, { useState, useEffect } from "react";
import { CreditCard, Mail, RefreshCw, ArrowRight, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import walletApi from "../../../api/walletApi";
import paymentApi from "../../../api/paymentApi";
import orderApi from "../../../api/orderApi";
import { useNavigate } from "react-router-dom";

interface WalletPaymentFormProps {
  orderId: string;
  orderCode: string;
  total: number;
  onPaymentSuccess: () => void;
  onChangePaymentMethod: (method: "momo" | "vietqr" | "cod") => void;
}

export default function WalletPaymentForm({
  orderId,
  orderCode,
  total,
  onPaymentSuccess,
  onChangePaymentMethod,
}: WalletPaymentFormProps) {
  const [paymentCode, setPaymentCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const navigate = useNavigate();

  // Gửi mã xác thực khi component mount
  useEffect(() => {
    const sendInitialCode = async () => {
      if (!codeSent) {
        setSendingCode(true);
        try {
          await walletApi.sendPaymentCode({
            orderCode,
            amount: total,
          });
          setCodeSent(true);
          toast.success("Mã xác thực đã được gửi đến email của bạn", {
            containerId: "general-toast",
          });
        } catch (err: any) {
          console.error("Lỗi gửi mã xác thực:", err);
          toast.error(
            err?.response?.data?.message || "Không thể gửi mã xác thực. Vui lòng thử lại.",
            { containerId: "general-toast" }
          );
        } finally {
          setSendingCode(false);
        }
      }
    };

    sendInitialCode();
  }, [orderCode, total, codeSent]);

  // Handler xác nhận thanh toán với mã email
  const handleConfirmPayment = async () => {
    if (!paymentCode || paymentCode.length !== 6) {
      toast.error("Vui lòng nhập mã xác thực 6 chữ số", {
        containerId: "general-toast",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const payRes = await walletApi.payWithWallet({
        orderCode,
        amount: total,
        emailCode: paymentCode,
      });

      console.log("=== Response Wallet Payment ===", payRes.data);

      toast.success("Thanh toán thành công!", {
        containerId: "general-toast",
      });

      // Reload order để cập nhật trạng thái
      onPaymentSuccess();
    } catch (err: any) {
      console.error("=== Lỗi thanh toán bằng ví ===", err);
      toast.error(
        err?.response?.data?.message || "Mã xác thực không đúng hoặc đã hết hạn. Vui lòng thử lại.",
        { containerId: "general-toast" }
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler gửi lại mã
  const handleResendCode = async () => {
    setSendingCode(true);
    try {
      await walletApi.sendPaymentCode({
        orderCode,
        amount: total,
      });
      setCodeSent(true);
      toast.success("Đã gửi lại mã xác thực", {
        containerId: "general-toast",
      });
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Không thể gửi lại mã. Vui lòng thử lại sau.",
        { containerId: "general-toast" }
      );
    } finally {
      setSendingCode(false);
    }
  };

  // Handler chuyển sang thanh toán online (MoMo)
  const handleSwitchToMoMo = async () => {
    try {
      setIsProcessing(true);
      // Cập nhật phương thức thanh toán
      await orderApi.updatePaymentMethod(orderId, "MOMO");

      // Tạo payment MoMo
      const payRes = await paymentApi.createMoMoPayment({
        amount: total,
        orderInfo: `Thanh toán đơn hàng #${orderCode}`,
        orderCode,
      });

      const payData = payRes.data;
      if (payData.payUrl) {
        window.location.href = payData.payUrl;
      } else {
        throw new Error(payData.message || "Không lấy được payUrl từ MoMo");
      }
    } catch (err: any) {
      console.error("Lỗi chuyển sang MoMo:", err);
      toast.error(
        err?.response?.data?.message || "Không thể chuyển sang thanh toán MoMo. Vui lòng thử lại.",
        { containerId: "general-toast" }
      );
      setIsProcessing(false);
    }
  };

  // Handler chuyển sang thanh toán VietQR
  const handleSwitchToVietQR = async () => {
    try {
      setIsProcessing(true);
      // Cập nhật phương thức thanh toán
      await orderApi.updatePaymentMethod(orderId, "VIETQR");

      // Tạo payment VietQR
      const payRes = await paymentApi.createVietQRPayment({
        amount: total,
        orderInfo: `Thanh toán đơn hàng #${orderCode}`,
        orderCode,
      });

      const payData = payRes.data;
      if (payData.qrCodeUrl) {
        // Mở QR code trong tab mới hoặc hiển thị modal
        window.open(payData.qrCodeUrl, "_blank");
        toast.info("Vui lòng quét mã QR để thanh toán", {
          containerId: "general-toast",
        });
      } else {
        throw new Error(payData.message || "Không lấy được QR code từ VietQR");
      }
    } catch (err: any) {
      console.error("Lỗi chuyển sang VietQR:", err);
      toast.error(
        err?.response?.data?.message || "Không thể chuyển sang thanh toán VietQR. Vui lòng thử lại.",
        { containerId: "general-toast" }
      );
      setIsProcessing(false);
    }
  };

  // Handler chuyển sang COD
  const handleSwitchToCOD = async () => {
    try {
      setIsProcessing(true);
      // Cập nhật phương thức thanh toán
      await orderApi.updatePaymentMethod(orderId, "COD");

      toast.success("Đã chuyển sang thanh toán khi nhận hàng (COD)", {
        containerId: "general-toast",
      });

      // Reload order để cập nhật trạng thái
      onPaymentSuccess();
    } catch (err: any) {
      console.error("Lỗi chuyển sang COD:", err);
      toast.error(
        err?.response?.data?.message || "Không thể chuyển sang COD. Vui lòng thử lại.",
        { containerId: "general-toast" }
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-blue-100 overflow-hidden animate-fade-in-up">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 border-b-2 border-blue-200">
        <h2 className="text-xl sm:text-2xl font-bold text-[#2F5FEB] flex items-center gap-2 sm:gap-3">
          <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
          Thanh toán bằng ví
        </h2>
        <p className="text-gray-600 text-xs sm:text-sm mt-1">
          Vui lòng nhập mã xác thực đã được gửi đến email của bạn
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* Thông báo gửi mã */}
        {codeSent && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 flex items-start gap-3">
            <Mail className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800">
                Mã xác thực đã được gửi đến email của bạn
              </p>
              <p className="text-xs text-green-600 mt-1">
                Vui lòng kiểm tra hộp thư và nhập mã 6 chữ số
              </p>
            </div>
          </div>
        )}

        {/* Form nhập mã */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Mã xác thực (6 chữ số)
          </label>
          <input
            type="text"
            value={paymentCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 6);
              setPaymentCode(value);
            }}
            placeholder="Nhập mã xác thực"
            maxLength={6}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#2F5FEB] focus:outline-none text-lg text-center font-mono tracking-widest"
            disabled={isProcessing}
          />

          {/* Button gửi lại mã */}
          <button
            onClick={handleResendCode}
            disabled={sendingCode || isProcessing}
            className="w-full py-2 px-4 text-sm text-[#2F5FEB] hover:text-[#244ACC] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${sendingCode ? "animate-spin" : ""}`} />
            {sendingCode ? "Đang gửi..." : "Gửi lại mã xác thực"}
          </button>
        </div>

        {/* Button thanh toán */}
        <button
          onClick={handleConfirmPayment}
          disabled={isProcessing || paymentCode.length !== 6}
          className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-[#2F5FEB] to-[#244ACC] text-white font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : (
            <>
              <span>Xác nhận thanh toán</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-300"></div>
          <span className="text-sm text-gray-500 font-semibold">HOẶC</span>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        {/* Các phương thức thanh toán khác */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Chuyển sang phương thức thanh toán khác:
          </p>

          <button
            onClick={handleSwitchToMoMo}
            disabled={isProcessing}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Thanh toán bằng MoMo
          </button>

          <button
            onClick={handleSwitchToVietQR}
            disabled={isProcessing}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Thanh toán bằng VietQR
          </button>

          <button
            onClick={handleSwitchToCOD}
            disabled={isProcessing}
            className="w-full py-2.5 px-4 bg-gray-600 text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Chuyển sang COD (Thanh toán khi nhận hàng)
          </button>
        </div>
      </div>
    </div>
  );
}

