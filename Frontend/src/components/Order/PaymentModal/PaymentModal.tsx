import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, CreditCard, Mail, RefreshCw, ArrowRight } from "lucide-react";
import { toast } from "react-toastify";
import walletApi from "../../../api/walletApi";
import paymentApi from "../../../api/paymentApi";
import orderApi from "../../../api/orderApi";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderCode: string;
  total: number;
  currentPaymentMethod: string;
  onPaymentSuccess: () => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  orderId,
  orderCode,
  total,
  currentPaymentMethod,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<"wallet" | "momo" | "vietqr" | "cod">(
    currentPaymentMethod === "WALLET" ? "wallet" :
    currentPaymentMethod === "MOMO" ? "momo" :
    currentPaymentMethod === "VIETQR" ? "vietqr" : "cod"
  );
  const [paymentCode, setPaymentCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const hasSentCodeForWalletRef = useRef<string | null>(null); // Track orderCode đã gửi mã

  // Reset state khi modal mở
  useEffect(() => {
    if (isOpen) {
      setPaymentCode("");
      setCodeSent(false);
      const method = currentPaymentMethod === "WALLET" ? "wallet" :
        currentPaymentMethod === "MOMO" ? "momo" :
        currentPaymentMethod === "VIETQR" ? "vietqr" : "cod";
      setSelectedMethod(method);
      
      // Tự động gửi mã nếu phương thức là ví và chưa gửi
      if (method === "wallet" && hasSentCodeForWalletRef.current !== orderCode) {
        // Delay nhỏ để đảm bảo state đã được set
        setTimeout(() => {
          handleSendCode();
        }, 100);
      }
    } else {
      // Reset khi modal đóng
      hasSentCodeForWalletRef.current = null;
    }
  }, [isOpen]); // Chỉ phụ thuộc vào isOpen để tránh gửi lại khi currentPaymentMethod thay đổi

  // Handler gửi mã xác thực
  const handleSendCode = async () => {
    // Kiểm tra xem đã gửi mã cho orderCode này chưa
    if (hasSentCodeForWalletRef.current === orderCode || sendingCode) {
      return;
    }

    hasSentCodeForWalletRef.current = orderCode;
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
      hasSentCodeForWalletRef.current = null; // Reset nếu lỗi
      toast.error(
        err?.response?.data?.message || "Không thể gửi mã xác thực. Vui lòng thử lại.",
        { containerId: "general-toast" }
      );
    } finally {
      setSendingCode(false);
    }
  };

  // Handler khi chọn phương thức ví - tự động gửi mã
  const handleSelectWallet = () => {
    setSelectedMethod("wallet");
    // Chỉ gửi mã nếu chưa gửi cho orderCode này
    if (hasSentCodeForWalletRef.current !== orderCode && !codeSent && !sendingCode) {
      handleSendCode();
    }
  };

  // Handler thanh toán bằng ví
  const handleWalletPayment = async () => {
    if (!paymentCode || paymentCode.length !== 6) {
      toast.error("Vui lòng nhập mã xác thực 6 chữ số", {
        containerId: "general-toast",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Cập nhật payment method nếu chưa phải WALLET
      if (currentPaymentMethod !== "WALLET") {
        await orderApi.updatePaymentMethod(orderId, "WALLET");
      }

      const payRes = await walletApi.payWithWallet({
        orderCode,
        amount: total,
        emailCode: paymentCode,
      });

      toast.success("Thanh toán thành công!", {
        containerId: "general-toast",
      });

      onPaymentSuccess();
      onClose();
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

  // Handler thanh toán bằng MoMo
  const handleMoMoPayment = async () => {
    try {
      setIsProcessing(true);
      // Cập nhật payment method
      if (currentPaymentMethod !== "MOMO") {
        await orderApi.updatePaymentMethod(orderId, "MOMO");
      }

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
      console.error("Lỗi thanh toán MoMo:", err);
      toast.error(
        err?.response?.data?.message || "Không thể thanh toán bằng MoMo. Vui lòng thử lại.",
        { containerId: "general-toast" }
      );
      setIsProcessing(false);
    }
  };

  // Handler thanh toán bằng VietQR
  const handleVietQRPayment = async () => {
    try {
      setIsProcessing(true);
      // Cập nhật payment method
      if (currentPaymentMethod !== "VIETQR") {
        await orderApi.updatePaymentMethod(orderId, "VIETQR");
      }

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
        onPaymentSuccess();
        onClose();
      } else {
        throw new Error(payData.message || "Không lấy được QR code từ VietQR");
      }
    } catch (err: any) {
      console.error("Lỗi thanh toán VietQR:", err);
      toast.error(
        err?.response?.data?.message || "Không thể thanh toán bằng VietQR. Vui lòng thử lại.",
        { containerId: "general-toast" }
      );
      setIsProcessing(false);
    }
  };

  // Handler chuyển sang COD
  const handleCODPayment = async () => {
    try {
      setIsProcessing(true);
      // Cập nhật payment method
      await orderApi.updatePaymentMethod(orderId, "COD");

      toast.success("Đã chuyển sang thanh toán khi nhận hàng (COD)", {
        containerId: "general-toast",
      });

      onPaymentSuccess();
      onClose();
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

  // Handler gửi lại mã
  const handleResendCode = async () => {
    if (sendingCode) {
      return;
    }
    // Reset flag để cho phép gửi lại
    hasSentCodeForWalletRef.current = null;
    await handleSendCode();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in"
      onClick={() => {
        if (!isProcessing) {
          onClose();
        }
      }}
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#2F5FEB] flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              Thanh toán đơn hàng
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Mã đơn: <strong>{orderCode}</strong> - Tổng tiền: <strong>{total.toLocaleString("vi-VN")}₫</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Chọn phương thức thanh toán */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Chọn phương thức thanh toán
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleSelectWallet}
                disabled={isProcessing}
                className={`p-4 border-2 rounded-lg transition-all ${
                  selectedMethod === "wallet"
                    ? "border-[#2F5FEB] bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  <span className="font-semibold">Ví của tôi</span>
                </div>
              </button>
              <button
                onClick={() => setSelectedMethod("momo")}
                disabled={isProcessing}
                className={`p-4 border-2 rounded-lg transition-all ${
                  selectedMethod === "momo"
                    ? "border-pink-500 bg-pink-50"
                    : "border-gray-300 hover:border-gray-400"
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  <span className="font-semibold">Ví MoMo</span>
                </div>
              </button>
              <button
                onClick={() => setSelectedMethod("vietqr")}
                disabled={isProcessing}
                className={`p-4 border-2 rounded-lg transition-all ${
                  selectedMethod === "vietqr"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 hover:border-gray-400"
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  <span className="font-semibold">VietQR</span>
                </div>
              </button>
              <button
                onClick={() => setSelectedMethod("cod")}
                disabled={isProcessing}
                className={`p-4 border-2 rounded-lg transition-all ${
                  selectedMethod === "cod"
                    ? "border-gray-600 bg-gray-50"
                    : "border-gray-300 hover:border-gray-400"
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  <span className="font-semibold">COD</span>
                </div>
              </button>
            </div>
          </div>

          {/* Form thanh toán theo phương thức đã chọn */}
          {selectedMethod === "wallet" && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-800">Thanh toán bằng ví</span>
              </div>
              
              {codeSent && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    Mã xác thực đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                  disabled={isProcessing}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#2F5FEB] focus:outline-none text-lg text-center font-mono tracking-widest disabled:bg-gray-100"
                />
              </div>

              <button
                onClick={handleResendCode}
                disabled={sendingCode || isProcessing}
                className="w-full py-2 px-4 text-sm text-[#2F5FEB] hover:text-[#244ACC] font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${sendingCode ? "animate-spin" : ""}`} />
                {sendingCode ? "Đang gửi..." : "Gửi lại mã xác thực"}
              </button>

              <button
                onClick={handleWalletPayment}
                disabled={isProcessing || paymentCode.length !== 6}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#2F5FEB] to-[#244ACC] text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            </div>
          )}

          {selectedMethod === "momo" && (
            <div className="space-y-4 p-4 bg-pink-50 rounded-lg border-2 border-pink-200">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-pink-600" />
                <span className="font-semibold text-pink-800">Thanh toán bằng MoMo</span>
              </div>
              <p className="text-sm text-gray-700">
                Bạn sẽ được chuyển đến trang thanh toán MoMo để hoàn tất giao dịch.
              </p>
              <button
                onClick={handleMoMoPayment}
                disabled={isProcessing}
                className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <span>Thanh toán bằng MoMo</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {selectedMethod === "vietqr" && (
            <div className="space-y-4 p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">Thanh toán bằng VietQR</span>
              </div>
              <p className="text-sm text-gray-700">
                Mã QR sẽ được mở trong tab mới. Vui lòng quét mã để thanh toán.
              </p>
              <button
                onClick={handleVietQRPayment}
                disabled={isProcessing}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <span>Thanh toán bằng VietQR</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {selectedMethod === "cod" && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-800">Thanh toán khi nhận hàng (COD)</span>
              </div>
              <p className="text-sm text-gray-700">
                Bạn sẽ thanh toán khi nhận được hàng. Đơn hàng sẽ được xử lý ngay.
              </p>
              <button
                onClick={handleCODPayment}
                disabled={isProcessing}
                className="w-full py-3 px-4 bg-gray-600 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <span>Xác nhận chuyển sang COD</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

