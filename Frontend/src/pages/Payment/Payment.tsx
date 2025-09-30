import React, { useState, useEffect } from "react";
import Address from "../../components/Payment/Adress/Address";
import Product from "../../components/Payment/Product/Product";
import Delivery from "../../components/Payment/Delivery/Delivery";
import Payment from "../../components/Payment/Payment/Payment";
import OrderSummary from "../../components/Payment/OrderSummary/OrderSummary";
import VoucherBox from "../../components/Payment/VoucherBox/VoucherBox";

const CheckoutPage: React.FC = () => {
  const [shippingFee, setShippingFee] = useState<number>(30000);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "momo" | "vnpay">("cod");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // chỉ giữ subtotal cho OrderSummary và VoucherBox
  const [cartSubtotal, setCartSubtotal] = useState<number>(0);

  // mảng id các sản phẩm được chọn
  const [selectedItemsIds, setSelectedItemsIds] = useState<string[]>([]);

  // voucher
  const [voucherDiscount, setVoucherDiscount] = useState<number>(0);
  const [selectedVoucherCode, setSelectedVoucherCode] = useState<string | undefined>(undefined);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) return;

    const fetchCart = async () => {
      try {
        // lấy danh sách id sản phẩm được chọn từ Cart
        const saved = localStorage.getItem("checkoutItems");
        const selectedIds = saved ? JSON.parse(saved) : [];
        console.log("🟢 checkoutItems:", selectedIds);

        setSelectedItemsIds(selectedIds); // ✅ lưu lại để truyền vào Product

        // lấy cart từ API
        const res = await fetch("http://localhost:5000/api/cart", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Không thể lấy giỏ hàng");

        const data = await res.json();

        // lọc sản phẩm được chọn
        const filtered = data.items.filter((item: any) =>
          selectedIds.includes(item._id)
        );

        // tính subtotal từ danh sách lọc
        const subtotal = filtered.reduce((sum: number, item: any) => sum + item.subtotal, 0);

        console.log("🟢 Sản phẩm được chọn:", filtered);
        console.log("🟢 Subtotal:", subtotal);

        setCartSubtotal(subtotal);
      } catch (err) {
        console.error("❌ Lỗi fetch cart:", err);
      }
    };

    fetchCart();
  }, [token]);

  const handleVoucherPreview = (discountValue: number, code: string) => {
    setVoucherDiscount(discountValue);
    setSelectedVoucherCode(code);
    console.log(`✅ Voucher ${code} áp dụng, giảm ${discountValue}₫`);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow-lg rounded-lg font-sans text-gray-800">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Thanh toán</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Cột trái */}
        <div className="flex-1 space-y-6">
          <Address onSelect={setSelectedAddressId} />
          {/* ✅ truyền selectedItemsIds vào Product */}
          <Product selectedItems={selectedItemsIds} />
          <Delivery onChange={setShippingFee} />
        </div>

        {/* Cột phải */}
        <div className="w-full lg:w-1/3 space-y-6">
          <VoucherBox subtotal={cartSubtotal} onPreview={handleVoucherPreview} />
          <Payment onChange={setPaymentMethod} />
          <OrderSummary
            shippingFee={shippingFee}
            paymentMethod={paymentMethod}
            addressId={selectedAddressId}
            discount={voucherDiscount}
            voucherCode={selectedVoucherCode}
            // không thêm prop nào khác
          />
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
