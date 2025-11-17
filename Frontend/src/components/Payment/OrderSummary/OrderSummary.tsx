import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, XCircle, CheckCircle, Wallet } from "lucide-react";
import Subtotal from "./Subtotal";
import CartDiscount from "./CartDiscount";
import ShippingFee from "./ShippingFee";
import TotalAmount from "./TotalAmount";

import cartApi from "../../../api/cartApi";
import addressApi from "../../../api/addressApi";
import type { AddressType } from "../../../api/addressApi";
import orderApi from "../../../api/orderApi";
import type { CreateOrderData } from "../../../api/orderApi";
import paymentApi from "../../../api/paymentApi";
import walletApi from "../../../api/walletApi";
import { toast } from "react-toastify";

interface OrderSummaryProps {
  shippingFee: number;
  paymentMethod: "cod" | "momo" | "vietqr" | "wallet";
  addressId: string | null;
  discount: number;
  shippingDiscount?: number;
  productVoucherCode?: string | null;
  freeshipVoucherCode?: string | null;
}

interface CartResponse {
  subtotal: number;
  shippingFee: number;
  total?: number;
  items?: {
    _id: string;
    subtotal: number;
    quantity: number;
    productId: string | { _id: string };
    variation?: { color?: string; size?: string; additionalPrice?: number };
  }[];
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  shippingFee,
  paymentMethod,
  addressId,
  discount,
  shippingDiscount,
  productVoucherCode,
  freeshipVoucherCode,
}) => {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<AddressType | null>(null);
  const [selectedCartSubtotal, setSelectedCartSubtotal] = useState<number>(0);

  const navigate = useNavigate();

  // 📦 Lấy giỏ hàng đầy đủ
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const res = await cartApi.getCart();
        setCart(res.data);
      } catch (err) {
        console.error(err);
        setCart(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, []);

  // 📦 Lấy subtotal các sản phẩm đã chọn
  useEffect(() => {
    const fetchSelectedSubtotal = async () => {
      try {
        const saved = localStorage.getItem("checkoutItems");
        if (!saved) {
          setSelectedCartSubtotal(0);
          return;
        }

        const parsed = JSON.parse(saved);
        
        // Kiểm tra nếu là mảng ID (format cũ) hoặc mảng objects (format mới)
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof parsed[0] === "string") {
            // Format cũ: mảng ID
            const selectedIds: string[] = parsed;
            if (!cart?.items) {
              setSelectedCartSubtotal(0);
              return;
            }

            const subtotal = cart.items
              .filter((item) => selectedIds.includes(item._id))
              .reduce((sum, item) => sum + item.subtotal, 0);

            setSelectedCartSubtotal(subtotal);
          } else {
            // Format mới: mảng objects
            const products = parsed as any[];
            const subtotal = products.reduce(
              (sum: number, item: any) => sum + (item.subtotal || 0),
              0
            );
            setSelectedCartSubtotal(subtotal);
          }
        } else {
          setSelectedCartSubtotal(0);
        }
      } catch (err) {
        console.error(err);
        setSelectedCartSubtotal(0);
      }
    };

    fetchSelectedSubtotal();
  }, [cart]);

  // 📦 Lấy địa chỉ
  useEffect(() => {
    if (!addressId) {
      setSelectedAddress(null);
      return;
    }

    const fetchAddress = async () => {
      try {
        const res = await addressApi.getAddressById(addressId);
        setSelectedAddress(res.data);
      } catch (err) {
        console.error(err);
        setSelectedAddress(null);
      }
    };

    fetchAddress();
  }, [addressId]);

  const total = Math.max(0, selectedCartSubtotal - discount + shippingFee - (shippingDiscount || 0));

const handleCheckout = async () => {
  if (!selectedAddress) {
    toast.warning(
      <div className="flex items-center gap-2">
        <AlertTriangle className="text-yellow-500" size={18} />
        <span>Vui lòng chọn địa chỉ giao hàng!</span>
      </div>
    );
    return;
  }

  const selectedItemsSaved = localStorage.getItem("checkoutItems");
  if (!selectedItemsSaved) {
    toast.error(
      <div className="flex items-center gap-2">
        <XCircle className="text-red-500" size={18} />
        <span>Không có sản phẩm nào để thanh toán</span>
      </div>
    );
    return;
  }

  try {
    const parsed = JSON.parse(selectedItemsSaved);
    let itemsForOrder: CreateOrderData["items"] = [];

    // Kiểm tra nếu là mảng ID (format cũ) hoặc mảng objects (format mới)
    if (Array.isArray(parsed) && parsed.length > 0) {
      if (typeof parsed[0] === "string") {
        // Format cũ: mảng ID, cần lấy từ cart
        const selectedItemIds: string[] = parsed;
        if (!cart?.items) {
          toast.error(
            <div className="flex items-center gap-2">
              <XCircle className="text-red-500" size={18} />
              <span>Không lấy được dữ liệu giỏ hàng</span>
            </div>
          );
          return;
        }

        itemsForOrder = cart.items
          .filter(item => selectedItemIds.includes(item._id))
          .map(item => ({
            productId: typeof item.productId === 'string' ? item.productId : item.productId._id,
            quantity: item.quantity,
            variation: item.variation,
          }));
      } else {
        // Format mới: mảng objects, dùng trực tiếp
        const products = parsed as any[];
        itemsForOrder = products.map((item: any) => ({
          productId: typeof item.productId === 'string' ? item.productId : (item.productId?._id || item.productId),
          quantity: item.quantity,
          variation: item.variation,
        }));
      }
    }

    if (!itemsForOrder.length) {
      toast.error(
        "Không có sản phẩm nào để thanh toán",
        { containerId: "general-toast" }
      );
      return;
    }

    const shippingAddressString = `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.country || ""}`;

const orderPayload: CreateOrderData = {
    items: itemsForOrder,
    shippingAddress: {
      fullName: selectedAddress.fullName,
      phone: selectedAddress.phone,
      address: `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.country || ""}`,
    },
    paymentMethod,
    productVoucherCode: productVoucherCode || undefined,
    freeshipVoucherCode: freeshipVoucherCode || undefined,
  };




    // === CONSOLE LOG để debug ===
    console.log("=== Payload gửi lên API createOrder ===");
    console.log(orderPayload);
    console.log("=== Selected Items ===");
    console.log(itemsForOrder);
    console.log("=== Shipping Address ===");
    console.log(selectedAddress);

    // Kiểm tra số dư ví TRƯỚC KHI tạo đơn hàng (nếu thanh toán bằng ví)
    if (paymentMethod === "wallet") {
      try {
        const walletRes = await walletApi.getWallet();
        const walletBalance = walletRes.data.wallet.balance;
        const estimatedTotal = total; // Sử dụng total đã tính
        
        if (walletBalance < estimatedTotal) {
          toast.warning(
            `Số dư ví không đủ! Số dư hiện tại: ${walletBalance.toLocaleString('vi-VN')}₫. Vui lòng nạp thêm tiền vào ví.`,
            { containerId: "general-toast" }
          );
          navigate('/wallet');
          return; // Dừng lại, không tạo đơn hàng
        }
      } catch (err: any) {
        console.error("=== Lỗi kiểm tra số dư ví ===", err);
        toast.error(
          "Không thể kiểm tra số dư ví. Vui lòng thử lại sau.",
          { containerId: "general-toast" }
        );
        return; // Dừng lại, không tạo đơn hàng
      }
    }

    // Tạo đơn hàng
    const orderRes = await orderApi.createOrder(orderPayload);
    const orderData = orderRes.data;

    console.log("=== Response từ API createOrder ===");
    console.log(orderData);

    // Lưu order info vào localStorage (chỉ lưu khi đơn hàng được tạo thành công)
    localStorage.setItem("lastOrderId", orderData.order._id);
    localStorage.setItem("lastOrderCode", orderData.order.orderCode);

    // Xử lý thanh toán theo phương thức
    if (paymentMethod === "momo") {
      try {
        const payRes = await paymentApi.createMoMoPayment({
          amount: orderData.order.total,
          orderInfo: `Thanh toán đơn hàng #${orderData.order.orderCode}`,
          orderCode: orderData.order.orderCode,
        });

        const payData = payRes.data;
        console.log("=== Response MoMo ===", payData);
        
        if (!payData.payUrl) {
          throw new Error(payData.message || "Không lấy được payUrl từ MoMo");
        }
        
        // Chỉ xóa checkoutItems khi thanh toán được tạo thành công
        localStorage.removeItem("checkoutItems");
        
        // Chuyển hướng đến trang thanh toán MoMo
        window.location.href = payData.payUrl;
        return;
      } catch (err: any) {
        console.error("=== Lỗi tạo thanh toán MoMo ===", err);
        toast.error(
          "Không thể tạo thanh toán MoMo. Vui lòng thử lại sau.",
          { containerId: "general-toast" }
        );
        // Không xóa checkoutItems, giữ lại để người dùng có thể thử lại
        return; // Dừng lại, không điều hướng
      }
    }

    if (paymentMethod === "vietqr") {
      try {
        const payRes = await paymentApi.createVietQRPayment({
          amount: orderData.order.total,
          orderInfo: `Thanh toán đơn hàng #${orderData.order.orderCode}`,
          orderCode: orderData.order.orderCode,
        });

        const payData = payRes.data;
        console.log("=== Response VietQR ===", payData);
        
        if (!payData.qrCodeUrl) {
          throw new Error("Không lấy được QR code từ VietQR");
        }
        
        // Chỉ xóa checkoutItems khi QR code được tạo thành công
        localStorage.removeItem("checkoutItems");
        
        // Lưu thông tin QR code vào localStorage để hiển thị ở trang thanh toán
        localStorage.setItem("vietqrData", JSON.stringify({
          qrCodeUrl: payData.qrCodeUrl,
          amount: payData.amount,
          accountNo: payData.accountNo,
          accountName: payData.accountName,
          orderInfo: payData.orderInfo,
          orderCode: orderData.order.orderCode,
        }));
        
        // Chuyển đến trang hiển thị QR code
        navigate(`/payment-qr?orderCode=${encodeURIComponent(orderData.order.orderCode)}`);
        return;
      } catch (err: any) {
        console.error("=== Lỗi tạo thanh toán VietQR ===", err);
        toast.error(
          "Không thể tạo thanh toán VietQR. Vui lòng thử lại sau.",
          { containerId: "general-toast" }
        );
        // Không xóa checkoutItems, giữ lại để người dùng có thể thử lại
        return; // Dừng lại, không điều hướng
      }
    }

    if (paymentMethod === "wallet") {
      try {
        const totalAmount = orderData.order.total;
        
        // Thanh toán bằng ví (đã kiểm tra số dư ở trên)
        const payRes = await walletApi.payWithWallet({
          orderCode: orderData.order.orderCode,
          amount: totalAmount,
        });
        
        console.log("=== Response Wallet Payment ===", payRes.data);
        
        // Chỉ xóa checkoutItems khi thanh toán thành công
        localStorage.removeItem("checkoutItems");
        
        toast.success(
          "Thanh toán thành công!",
          { containerId: "general-toast" }
        );
        navigate(`/order/${orderData.order._id}`);
        return;
      } catch (err: any) {
        console.error("=== Lỗi thanh toán bằng ví ===", err);
        toast.error(
          "Không thể thanh toán bằng ví. Vui lòng thử lại sau.",
          { containerId: "general-toast" }
        );
        // Không xóa checkoutItems, giữ lại để người dùng có thể thử lại
        return; // Dừng lại, không điều hướng
      }
    }

    // COD - không cần thanh toán ngay, xóa checkoutItems ngay
    localStorage.removeItem("checkoutItems");
    
    toast.success(
      "Tạo đơn hàng thành công!",
      { containerId: "general-toast" }
    );
    navigate(`/order/${orderData.order._id}`);
  } catch (err) {
    console.error("=== Lỗi handleCheckout ===", err);
  }
};


  if (loading) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 p-4 sm:p-6 text-center animate-fade-in">
        <p className="text-gray-600 text-base sm:text-lg font-medium">Đang tải tóm tắt đơn hàng...</p>
      </div>
    );
  }
  
  if (!cart) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 p-4 sm:p-6 text-center animate-fade-in">
        <p className="text-red-500 text-base sm:text-lg font-medium">Không lấy được dữ liệu giỏ hàng</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden lg:sticky lg:top-6">
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 sm:p-6 border-b-2 border-gray-200">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 sm:gap-3">
          Tóm tắt đơn hàng
        </h2>
        <p className="text-white/90 text-xs sm:text-sm mt-1">Kiểm tra thông tin trước khi thanh toán</p>
      </div>
      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 bg-gradient-to-br from-white to-gray-50">
        <Subtotal subtotal={selectedCartSubtotal} />
        {discount > 0 && <CartDiscount voucherDiscount={discount} />}
        <ShippingFee shippingFee={shippingFee} shippingDiscount={shippingDiscount || 0} />
        <div className="border-t-2 border-gray-300 pt-3 sm:pt-4 mt-3 sm:mt-4">
          <TotalAmount total={total} />
        </div>
        <button
          onClick={handleCheckout}
          className="w-full mt-4 sm:mt-6 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg sm:rounded-xl font-bold text-base sm:text-lg lg:text-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 flex items-center justify-center gap-2"
        >
          <span>Thanh toán ngay</span>
        </button>
        <div className="p-3 sm:p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg sm:rounded-xl mt-3 sm:mt-4">
          <p className="text-yellow-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
            Vui lòng kiểm tra kỹ thông tin đơn hàng trước khi xác nhận
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
