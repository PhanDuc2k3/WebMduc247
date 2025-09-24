import React, { useEffect, useState } from "react";

interface CartResponse {
  subtotal: number;
  discount: number;
}

interface OrderSummaryProps {
  shippingFee: number;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ shippingFee }) => {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [voucher, setVoucher] = useState<{ voucherId: string | null; discount: number }>({
    voucherId: null,
    discount: 0,
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    // Lấy voucher từ localStorage
    const savedVoucher = localStorage.getItem("appliedVoucher");
    if (savedVoucher) {
      try {
        const parsed = JSON.parse(savedVoucher);
        setVoucher({
          voucherId: parsed.voucherId ?? null,
          discount: parsed.discount ?? 0,
        });
        console.log("🎟️ Voucher lấy từ localStorage:", parsed);
      } catch (err) {
        console.error("🔥 Lỗi khi parse voucher từ localStorage:", err);
      }
    }

    if (!token) {
      console.warn("⚠️ Chưa đăng nhập, không thể lấy giỏ hàng!");
      setLoading(false);
      return;
    }

    const fetchCart = async () => {
      try {
        console.log("👉 Gọi API giỏ hàng để lấy tóm tắt đơn hàng...");

        const res = await fetch("http://localhost:5000/api/cart", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`❌ API Error ${res.status}: ${errorText}`);
        }

        const data = await res.json();
        console.log("✅ Dữ liệu giỏ hàng:", data);

        setCart({
          subtotal: data.subtotal ?? 0,
          discount: data.discount ?? 0,
        });
      } catch (err) {
        console.error("🔥 Lỗi khi fetch giỏ hàng:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [token]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-gray-500">
        Đang tải tóm tắt đơn hàng...
      </div>
    );
  }

  if (!cart) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-red-500">
        Không lấy được dữ liệu giỏ hàng
      </div>
    );
  }

  // Áp dụng cả discount từ giỏ hàng và từ voucher
  const { subtotal, discount: cartDiscount } = cart;
  const totalDiscount = cartDiscount + (voucher.discount || 0);
  const total = subtotal - totalDiscount + shippingFee;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="font-semibold text-lg mb-4">Tóm tắt đơn hàng</div>

      <div className="flex justify-between text-gray-700 mb-2">
        <span>Tạm tính</span>
        <span className="font-medium">{subtotal.toLocaleString("vi-VN")}₫</span>
      </div>

      <div className="flex justify-between text-gray-700 mb-2">
        <span>Giảm giá (giỏ hàng)</span>
        <span className="text-red-500 font-medium">
          -{cartDiscount.toLocaleString("vi-VN")}₫
        </span>
      </div>

      {voucher.discount > 0 && (
        <div className="flex justify-between text-gray-700 mb-2">
          <span>
            Giảm giá Voucher {voucher.voucherId ? `(${voucher.voucherId})` : ""}
          </span>
          <span className="text-red-500 font-medium">
            -{voucher.discount.toLocaleString("vi-VN")}₫
          </span>
        </div>
      )}

      <div className="flex justify-between text-gray-700 mb-4">
        <span>Phí vận chuyển</span>
        <span className="text-green-600 font-medium">
          {shippingFee > 0
            ? `${shippingFee.toLocaleString("vi-VN")}₫`
            : "Miễn phí"}
        </span>
      </div>

      <div className="border-t pt-4 flex justify-between items-center text-lg font-bold">
        <span>Tổng cộng</span>
        <span className="text-red-500">{total.toLocaleString("vi-VN")}₫</span>
      </div>

      <button className="w-full mt-6 bg-blue-600 text-white py-3 rounded font-semibold text-lg hover:bg-blue-700 transition">
        Thanh toán
      </button>
    </div>
  );
};

export default OrderSummary;
