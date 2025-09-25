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

  // Cart subtotal để tính voucher
  const [cartSubtotal, setCartSubtotal] = useState<number>(0);

  // Voucher state
  const [voucherDiscount, setVoucherDiscount] = useState<number>(0);
  const [selectedVoucherCode, setSelectedVoucherCode] = useState<string | undefined>(undefined);

  const token = localStorage.getItem("token");

  // Lấy subtotal từ cart
  useEffect(() => {
    if (!token) return;

    const fetchCart = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/cart", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setCartSubtotal(data.subtotal ?? 0);
      } catch (err) {
        console.error("Lỗi fetch cart subtotal:", err);
      }
    };

    fetchCart();
  }, [token]);

  // Callback khi VoucherBox preview thành công
  const handleVoucherPreview = (discountValue: number, code: string) => {
    setVoucherDiscount(discountValue);
    setSelectedVoucherCode(code);
    console.log(`Voucher ${code} áp dụng, giảm ${discountValue}₫`);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow-lg rounded-lg font-sans text-gray-800">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Thanh toán</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Cột trái */}
        <div className="flex-1 space-y-6">
          <Address onSelect={setSelectedAddressId} />
          <Product />
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
            discount={voucherDiscount} // voucher discount
            voucherCode={selectedVoucherCode}
          />
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
