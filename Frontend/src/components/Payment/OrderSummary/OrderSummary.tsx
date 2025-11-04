import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

interface OrderSummaryProps {
  shippingFee: number;
  paymentMethod: "cod" | "momo" | "vietqr" | "wallet";
  addressId: string | null;
  discount: number;
  voucherCode?: string;
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
  voucherCode,
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

  const total = selectedCartSubtotal - discount + shippingFee;

const handleCheckout = async () => {
  if (!selectedAddress) return alert("Vui lòng chọn địa chỉ giao hàng!");

  const selectedItemsSaved = localStorage.getItem("checkoutItems");
  if (!selectedItemsSaved) {
    return alert("Không có sản phẩm nào để thanh toán");
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
          return alert("Không lấy được dữ liệu giỏ hàng");
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
      return alert("Không có sản phẩm nào để thanh toán");
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
  voucherCode,
};




    // === CONSOLE LOG để debug ===
    console.log("=== Payload gửi lên API createOrder ===");
    console.log(orderPayload);
    console.log("=== Selected Items ===");
    console.log(itemsForOrder);
    console.log("=== Shipping Address ===");
    console.log(selectedAddress);

    const orderRes = await orderApi.createOrder(orderPayload);
    const orderData = orderRes.data;

    console.log("=== Response từ API createOrder ===");
    console.log(orderData);

    // Lưu order info vào localStorage
    localStorage.setItem("lastOrderId", orderData.order._id);
    localStorage.setItem("lastOrderCode", orderData.order.orderCode);
    localStorage.removeItem("checkoutItems");

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
        
        // Chuyển hướng đến trang thanh toán MoMo
        window.location.href = payData.payUrl;
        return;
      } catch (err: any) {
        console.error("=== Lỗi tạo thanh toán MoMo ===", err);
        const errorMessage = err.response?.data?.message || err.message || "Không thể tạo thanh toán MoMo";
        alert(errorMessage);
        throw new Error(errorMessage);
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
        const errorMessage = err.response?.data?.message || err.message || "Không thể tạo thanh toán VietQR";
                  alert(errorMessage);
          throw new Error(errorMessage);
        }
      }

      if (paymentMethod === "wallet") {
        try {
          const totalAmount = orderData.order.total;
          
          // Kiểm tra số dư ví trước
          const walletRes = await walletApi.getWallet();
          const walletBalance = walletRes.data.wallet.balance;
          
          if (walletBalance < totalAmount) {
            alert(`Số dư ví không đủ! Số dư hiện tại: ${walletBalance.toLocaleString('vi-VN')}₫. Vui lòng nạp thêm tiền vào ví.`);
            navigate('/wallet');
            return;
          }
          
          // Thanh toán bằng ví
          const payRes = await walletApi.payWithWallet({
            orderCode: orderData.order.orderCode,
            amount: totalAmount,
          });
          
          console.log("=== Response Wallet Payment ===", payRes.data);
          
          alert("Thanh toán thành công!");
          navigate(`/order/${orderData.order._id}`);
          return;
        } catch (err: any) {
          console.error("=== Lỗi thanh toán bằng ví ===", err);
          const errorMessage = err.response?.data?.message || err.message || "Không thể thanh toán bằng ví";
          alert(errorMessage);
          throw new Error(errorMessage);
        }
      }

      // COD - không cần thanh toán ngay
      alert("Tạo đơn hàng thành công!");
      navigate(`/order/${orderData.order._id}`);
  } catch (err) {
    console.error("=== Lỗi handleCheckout ===", err);
    alert(err instanceof Error ? err.message : "Có lỗi xảy ra khi thanh toán");
  }
};


  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6 text-center animate-fade-in">
        <p className="text-gray-600 text-lg font-medium">Đang tải tóm tắt đơn hàng...</p>
      </div>
    );
  }
  
  if (!cart) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6 text-center animate-fade-in">
        <p className="text-red-500 text-lg font-medium">Không lấy được dữ liệu giỏ hàng</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden sticky top-6">
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 border-b-2 border-gray-200">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          Tóm tắt đơn hàng
        </h2>
        <p className="text-white/90 text-sm mt-1">Kiểm tra thông tin trước khi thanh toán</p>
      </div>
      <div className="p-6 space-y-4 bg-gradient-to-br from-white to-gray-50">
        <Subtotal subtotal={selectedCartSubtotal} />
        {discount > 0 && <CartDiscount voucherDiscount={discount} />}
        <ShippingFee shippingFee={shippingFee} />
        <div className="border-t-2 border-gray-300 pt-4 mt-4">
          <TotalAmount total={total} />
        </div>
        <button
          onClick={handleCheckout}
          className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 flex items-center justify-center gap-2"
        >
          <span>Thanh toán ngay</span>
        </button>
        <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl mt-4">
          <p className="text-yellow-800 text-sm font-semibold flex items-center gap-2">
            Vui lòng kiểm tra kỹ thông tin đơn hàng trước khi xác nhận
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
