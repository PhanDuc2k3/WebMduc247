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

interface OrderSummaryProps {
  shippingFee: number;
  paymentMethod: "cod" | "momo" | "vnpay";
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
    productId: string;
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
        const selectedIds: string[] = saved ? JSON.parse(saved) : [];
        if (!selectedIds.length || !cart?.items) {
          setSelectedCartSubtotal(0);
          return;
        }

        const subtotal = cart.items
          .filter((item) => selectedIds.includes(item._id))
          .reduce((sum, item) => sum + item.subtotal, 0);

        setSelectedCartSubtotal(subtotal);
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
  const selectedItemIds: string[] = selectedItemsSaved ? JSON.parse(selectedItemsSaved) : [];
  if (!selectedItemIds.length) return alert("Không có sản phẩm nào để thanh toán");

  try {
    // map selected IDs sang items đúng type CreateOrderData.items
    const itemsForOrder: CreateOrderData["items"] = cart?.items
      ?.filter(item => selectedItemIds.includes(item._id))
      .map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        variation: item.variation,
      })) || [];

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
      const payRes = await fetch("/api/payment/momo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          amount: orderData.order.total,
          orderInfo: `Thanh toán đơn hàng #${orderData.order.orderCode}`,
          orderCode: orderData.order.orderCode,
        }),
      });

      const payData = await payRes.json();
      console.log("=== Response MoMo ===", payData);
      if (!payRes.ok || !payData.payUrl) throw new Error("Không lấy được payUrl từ MoMo");
      window.location.href = payData.payUrl;
      return;
    }

    if (paymentMethod === "vnpay") {
      alert("Chức năng thanh toán VNPay đang phát triển!");
      return;
    }

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
        <div className="text-4xl mb-4 animate-pulse">💳</div>
        <p className="text-gray-600 text-lg font-medium">Đang tải tóm tắt đơn hàng...</p>
      </div>
    );
  }
  
  if (!cart) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6 text-center animate-fade-in">
        <div className="text-4xl mb-4">❌</div>
        <p className="text-red-500 text-lg font-medium">Không lấy được dữ liệu giỏ hàng</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden sticky top-6">
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 border-b-2 border-gray-200">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span>💰</span> Tóm tắt đơn hàng
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
          <span className="text-2xl">💳</span>
          <span>Thanh toán ngay</span>
        </button>
        <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl mt-4">
          <p className="text-yellow-800 text-sm font-semibold flex items-center gap-2">
            <span>⚠️</span> Vui lòng kiểm tra kỹ thông tin đơn hàng trước khi xác nhận
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
