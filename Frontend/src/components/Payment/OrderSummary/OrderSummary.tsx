import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Subtotal from "./Subtotal";
import CartDiscount from "./CartDiscount"; // chỉ hiển thị voucher
import ShippingFee from "./ShippingFee";
import TotalAmount from "./TotalAmount";

interface CartResponse {
  subtotal: number;
  shippingFee: number;
  total?: number;
}

interface OrderSummaryProps {
  shippingFee: number;
  paymentMethod: "cod" | "momo" | "vnpay";
  addressId: string | null;
  discount: number; // voucher discount (preview)
  voucherCode?: string; // voucher code tạm thời
}

interface AddressType {
  _id: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  country?: string;
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

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchCart = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/cart", {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setCart({
          subtotal: data.subtotal ?? 0,
          shippingFee: data.shippingFee ?? 0,
          total: data.subtotal ?? 0,
        });
      } catch (err) {
        console.error("🔥 Lỗi fetch giỏ hàng:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [token]);

  useEffect(() => {
    if (!addressId || !token) {
      setSelectedAddress(null);
      return;
    }

    const fetchAddress = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/address/${addressId}`, {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSelectedAddress(data);
      } catch (err) {
        console.error("🔥 Lỗi fetch address:", err);
        setSelectedAddress(null);
      }
    };

    fetchAddress();
  }, [addressId, token]);

  if (loading) return <div>Đang tải tóm tắt đơn hàng...</div>;
  if (!cart) return <div>Không lấy được dữ liệu giỏ hàng</div>;

  const { subtotal: cartSubtotal } = cart;
  const total = cartSubtotal - discount + shippingFee;

const handleCheckout = async () => {
  if (!token) return alert("Vui lòng đăng nhập!");
  if (!selectedAddress) return alert("Vui lòng chọn địa chỉ giao hàng!");

  try {
    const orderPayload = {
      shippingAddress: {
        fullName: selectedAddress.fullName,
        phone: selectedAddress.phone,
        address: `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.country || ""}`,
      },
      paymentMethod,
      shippingFee,
      voucherCode, 
      note: "Giao hàng nhanh giúp mình"
    };

    const res = await fetch("http://localhost:5000/api/orders", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Lỗi tạo đơn hàng");

    navigate(`/order/${data.order._id}`);
  } catch (err) {
    console.error("🔥 Lỗi handleCheckout:", err);
    alert("Không thể tạo đơn hàng. Vui lòng thử lại!");
  }
};


  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="font-semibold text-lg mb-4">Tóm tắt đơn hàng</div>

      <Subtotal subtotal={cartSubtotal} />
      {discount > 0 && <CartDiscount voucherDiscount={discount} />}
      <ShippingFee shippingFee={shippingFee} />
      <TotalAmount total={total} />

      <button
        onClick={handleCheckout}
        className="w-full mt-6 bg-blue-600 text-white py-3 rounded font-semibold text-lg hover:bg-blue-700 transition"
      >
        Thanh toán
      </button>
    </div>
  );
};

export default OrderSummary;
