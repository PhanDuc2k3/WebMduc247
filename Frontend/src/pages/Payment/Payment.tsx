import React, { useState, useEffect } from "react";
import Address from "../../components/Payment/Adress/Address";
import Product from "../../components/Payment/Product/Product";
import Delivery from "../../components/Payment/Delivery/Delivery";
import Payment from "../../components/Payment/Payment/Payment";
import OrderSummary from "../../components/Payment/OrderSummary/OrderSummary";
import VoucherBox from "../../components/Payment/VoucherBox/VoucherBox";

import cartApi from "../../api/cartApi";
import addressApi from "../../api/addressApi";
import type { AddressType } from "../../api/addressApi";

const CheckoutPage: React.FC = () => {
  const [shippingFee, setShippingFee] = useState<number>(30000);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "momo" | "vnpay">("cod");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [cartSubtotal, setCartSubtotal] = useState<number>(0);
  const [selectedItemsIds, setSelectedItemsIds] = useState<string[]>([]);
  const [voucherDiscount, setVoucherDiscount] = useState<number>(0);
  const [selectedVoucherCode, setSelectedVoucherCode] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState<boolean>(false);

  // Load giỏ hàng và selected items từ localStorage
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const saved = localStorage.getItem("checkoutItems");
        const selectedIds = saved ? JSON.parse(saved) : [];
        setSelectedItemsIds(selectedIds);

        const { data } = await cartApi.getCart();
        const filtered = data.items.filter((item: any) =>
          selectedIds.includes(item._id)
        );

        const subtotal = filtered.reduce(
          (sum: number, item: any) => sum + item.subtotal,
          0
        );
        setCartSubtotal(subtotal);
      } catch (err) {
        console.error("❌ Lỗi fetch cart:", err);
      }
    };

    fetchCart();
  }, []);

  const handleVoucherPreview = (discountValue: number, code: string) => {
    setVoucherDiscount(discountValue);
    setSelectedVoucherCode(code);
    console.log(`✅ Voucher ${code} áp dụng, giảm ${discountValue}₫`);
  };

  return (
    <div className="w-full py-8 md:py-12">
      <div className="mb-8 animate-fade-in-down">
        <h1 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900 gradient-text flex items-center gap-3">
          <span>💳</span> Thanh toán
        </h1>
        <p className="text-gray-600 text-lg">Hoàn tất đơn hàng của bạn</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 animate-fade-in-up">
        {/* Cột trái */}
        <div className="flex-1 space-y-6">
          <div className="animate-fade-in-up delay-200">
            <Address onSelect={setSelectedAddressId} />
          </div>
          <div className="animate-fade-in-up delay-300">
            <Product selectedItems={selectedItemsIds} />
          </div>
          <div className="animate-fade-in-up delay-400">
            <Delivery onChange={setShippingFee} />
          </div>
        </div>

        {/* Cột phải - Sticky */}
        <div className="w-full lg:w-1/3 space-y-6">
          <div className="animate-fade-in-up delay-500">
            <VoucherBox subtotal={cartSubtotal} onPreview={handleVoucherPreview} />
          </div>
          <div className="animate-fade-in-up delay-600">
            <Payment onChange={setPaymentMethod} />
          </div>
          <div className="animate-fade-in-up delay-700">
            <OrderSummary
              shippingFee={shippingFee}
              paymentMethod={paymentMethod}
              addressId={selectedAddressId}
              discount={voucherDiscount}
              voucherCode={selectedVoucherCode}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
