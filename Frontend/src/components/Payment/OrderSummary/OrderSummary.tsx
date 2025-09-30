import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Subtotal from "./Subtotal";
import CartDiscount from "./CartDiscount";
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
  discount: number;
  voucherCode?: string;
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
  const [selectedCartSubtotal, setSelectedCartSubtotal] = useState<number>(0); // ✅ Subtotal các sản phẩm chọn
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // 📦 Lấy giỏ hàng đầy đủ
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const fetchCart = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/cart", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Không thể tải giỏ hàng");
        setCart({
          subtotal: data.subtotal ?? 0,
          shippingFee: data.shippingFee ?? 0,
          total: data.subtotal ?? 0,
        });
      } catch {
        setCart(null);
      } finally {
        setLoading(false);
      }
    };
    fetchCart();
  }, [token]);

  // 📦 Lấy subtotal các sản phẩm đã chọn
  useEffect(() => {
    if (!token) return;

    const fetchSelectedSubtotal = async () => {
      try {
        const saved = localStorage.getItem("checkoutItems");
        const selectedIds: string[] = saved ? JSON.parse(saved) : [];

        const res = await fetch("http://localhost:5000/api/cart", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Không thể lấy giỏ hàng");

        const data = await res.json();
        const subtotal = data.items
          .filter((item: any) => selectedIds.includes(item._id))
          .reduce((sum: number, item: any) => sum + item.subtotal, 0);

        setSelectedCartSubtotal(subtotal);
      } catch (err) {
        console.error(err);
        setSelectedCartSubtotal(0);
      }
    };

    fetchSelectedSubtotal();
  }, [token]);

  // 📦 Lấy địa chỉ
  useEffect(() => {
    if (!addressId || !token) {
      setSelectedAddress(null);
      return;
    }
    const fetchAddress = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/address/${addressId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Không thể tải địa chỉ");
        setSelectedAddress(data);
      } catch {
        setSelectedAddress(null);
      }
    };
    fetchAddress();
  }, [addressId, token]);

  const total = selectedCartSubtotal - discount + shippingFee;

  // ✅ FIX: Thêm selectedItems từ localStorage
  const handleCheckout = async () => {
    if (!token) return alert("Vui lòng đăng nhập!");
    if (!selectedAddress) return alert("Vui lòng chọn địa chỉ giao hàng!");

    const selectedItemsSaved = localStorage.getItem("checkoutItems");
    const selectedItems = selectedItemsSaved ? JSON.parse(selectedItemsSaved) : [];
    if (!selectedItems.length) return alert("Không có sản phẩm nào để thanh toán");

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
        note: "Giao hàng nhanh giúp mình",
        selectedItems, // ✅ Gửi danh sách sản phẩm được chọn
      };

      const orderRes = await fetch("http://localhost:5000/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.message || "Lỗi tạo đơn hàng");

      localStorage.setItem("lastOrderId", orderData.order._id);
      localStorage.setItem("lastOrderCode", orderData.order.orderCode);

      // ✅ Xóa checkoutItems sau khi thanh toán
      localStorage.removeItem("checkoutItems");

      if (paymentMethod === "momo") {
        const payRes = await fetch("http://localhost:5000/api/payment/momo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: orderData.order.total,
            orderInfo: `Thanh toán đơn hàng #${orderData.order.orderCode}`,
            orderCode: orderData.order.orderCode,
          }),
        });

        const payData = await payRes.json();
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
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra khi thanh toán");
    }
  };

  if (loading) return <div>Đang tải tóm tắt đơn hàng...</div>;
  if (!cart) return <div>Không lấy được dữ liệu giỏ hàng</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="font-semibold text-lg mb-4">Tóm tắt đơn hàng</div>
      {/* ✅ Subtotal chỉ tính các sản phẩm đã chọn */}
      <Subtotal subtotal={selectedCartSubtotal} />
      {/* ✅ Voucher giảm giá */}
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
