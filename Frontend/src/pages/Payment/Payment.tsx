import React, { useState, useEffect } from "react";
import Address from "../../components/Payment/Adress/Address";
import Product from "../../components/Payment/Product/Product";
import Delivery from "../../components/Payment/Delivery/Delivery";
import Payment from "../../components/Payment/Payment/Payment";
import OrderSummary from "../../components/Payment/OrderSummary/OrderSummary";
import VoucherBox from "../../components/Payment/VoucherBox/VoucherBox";
import VoucherPopup from "../../components/Payment/VoucherBox/VoucherPopup";

import cartApi from "../../api/cartApi";
import addressApi from "../../api/addressApi";
import type { AddressType } from "../../api/addressApi";
import type { AvailableVoucher } from "../../api/voucherApi";

const CheckoutPage: React.FC = () => {
  const [shippingFee, setShippingFee] = useState<number>(30000);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "momo" | "vietqr" | "wallet">("cod");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]); // ✅ thêm dòng này

  const [cartSubtotal, setCartSubtotal] = useState<number>(0);
  const [selectedItemsIds, setSelectedItemsIds] = useState<string[]>([]);
  const [voucherDiscount, setVoucherDiscount] = useState<number>(0);
  const [shippingDiscount, setShippingDiscount] = useState<number>(0);
  const [productVoucherCode, setProductVoucherCode] = useState<string | null>(null);
  const [freeshipVoucherCode, setFreeshipVoucherCode] = useState<string | null>(null);

  // State cho voucher popup
  const [isVoucherPopupOpen, setIsVoucherPopupOpen] = useState<boolean>(false);
  const [selectedProductVoucher, setSelectedProductVoucher] = useState<AvailableVoucher | null>(null);
  const [selectedFreeshipVoucher, setSelectedFreeshipVoucher] = useState<AvailableVoucher | null>(null);

  const [loading, setLoading] = useState<boolean>(false);

  // Load giỏ hàng và selected items từ localStorage
  useEffect(() => {
    const loadCheckoutItems = async () => {
      try {
        const saved = localStorage.getItem("checkoutItems");
        if (!saved) {
          console.warn("⚠️ Không có sản phẩm nào được chọn để checkout");
          return;
        }

        const parsed = JSON.parse(saved);
        
        // Kiểm tra nếu là mảng ID (format cũ) hoặc mảng objects (format mới)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Nếu phần tử đầu tiên là string -> đó là mảng ID (format cũ)
          if (typeof parsed[0] === "string") {
            // Format cũ: mảng ID, cần fetch từ API
            const selectedIds = parsed as string[];
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
            setSelectedProducts(filtered);
          } else {
            // Format mới: mảng objects, dùng trực tiếp
            const products = parsed as any[];
            setSelectedProducts(products);
            
            const ids = products.map((p: any) => p._id);
            setSelectedItemsIds(ids);

            const subtotal = products.reduce(
              (sum: number, item: any) => sum + (item.subtotal || 0),
              0
            );

            setCartSubtotal(subtotal);
          }
        }
      } catch (err) {
        console.error("❌ Lỗi load checkout items:", err);
      }
    };

    loadCheckoutItems();
  }, []);


  const handleVoucherPreview = (
    productDiscount: number,
    productCode: string | null,
    freeshipDiscount: number,
    freeshipCode: string | null
  ) => {
    setVoucherDiscount(productDiscount);
    setShippingDiscount(freeshipDiscount);
    setProductVoucherCode(productCode);
    setFreeshipVoucherCode(freeshipCode);
    console.log(`✅ Voucher product: ${productCode || "Không"} (${productDiscount}₫), freeship: ${freeshipCode || "Không"} (${freeshipDiscount}₫)`);
  };

  // Handler cho việc mở/đóng voucher popup
  const handleOpenVoucherPopup = () => {
    setIsVoucherPopupOpen(true);
  };

  const handleCloseVoucherPopup = () => {
    setIsVoucherPopupOpen(false);
  };

  // Handler cho việc chọn voucher
  const handleSelectProductVoucher = (voucher: AvailableVoucher | null) => {
    setSelectedProductVoucher(voucher);
    // Tính discount và cập nhật
    if (voucher) {
      const productDiscount = voucher.discount;
      handleVoucherPreview(productDiscount, voucher.code, shippingDiscount, freeshipVoucherCode);
    } else {
      handleVoucherPreview(0, null, shippingDiscount, freeshipVoucherCode);
    }
  };

  const handleSelectFreeshipVoucher = (voucher: AvailableVoucher | null) => {
    setSelectedFreeshipVoucher(voucher);
    // Tính discount cho freeship với shippingFee hiện tại
    let freeshipDiscount = 0;
    if (voucher) {
      if (voucher.discountType === "fixed") {
        freeshipDiscount = Math.min(voucher.discountValue, shippingFee);
      } else {
        freeshipDiscount = Math.min(
          (shippingFee * voucher.discountValue) / 100,
          voucher.maxDiscount || shippingFee,
          shippingFee
        );
      }
      handleVoucherPreview(voucherDiscount, productVoucherCode, freeshipDiscount, voucher.code);
    } else {
      handleVoucherPreview(voucherDiscount, productVoucherCode, 0, null);
    }
  };

  // Cập nhật discount khi shippingFee thay đổi
  useEffect(() => {
    if (selectedFreeshipVoucher) {
      let freeshipDiscount = 0;
      if (selectedFreeshipVoucher.discountType === "fixed") {
        freeshipDiscount = Math.min(selectedFreeshipVoucher.discountValue, shippingFee);
      } else {
        freeshipDiscount = Math.min(
          (shippingFee * selectedFreeshipVoucher.discountValue) / 100,
          selectedFreeshipVoucher.maxDiscount || shippingFee,
          shippingFee
        );
      }
      const productDiscount = selectedProductVoucher ? selectedProductVoucher.discount : 0;
      const productCode = selectedProductVoucher ? selectedProductVoucher.code : null;
      handleVoucherPreview(productDiscount, productCode, freeshipDiscount, selectedFreeshipVoucher.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingFee, selectedFreeshipVoucher]);

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
            <Product selectedItems={selectedProducts} />
          </div>
          <div className="animate-fade-in-up delay-400">
            <Delivery onChange={setShippingFee} />
          </div>
        </div>

        {/* Cột phải - Sticky */}
        <div className="w-full lg:w-1/3 space-y-6">
          <div className="animate-fade-in-up delay-500">
            <VoucherBox 
              subtotal={cartSubtotal} 
              shippingFee={shippingFee} 
              selectedItems={selectedItemsIds}
              onPreview={handleVoucherPreview}
              onOpenPopup={handleOpenVoucherPopup}
              selectedProductVoucher={selectedProductVoucher}
              selectedFreeshipVoucher={selectedFreeshipVoucher}
              onRemoveProductVoucher={() => handleSelectProductVoucher(null)}
              onRemoveFreeshipVoucher={() => handleSelectFreeshipVoucher(null)}
            />
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
              shippingDiscount={shippingDiscount}
              productVoucherCode={productVoucherCode}
              freeshipVoucherCode={freeshipVoucherCode}
            />
          </div>
        </div>
      </div>

      {/* Voucher Popup - Render ở đây để popup toàn màn hình */}
      <VoucherPopup
        isOpen={isVoucherPopupOpen}
        onClose={handleCloseVoucherPopup}
        subtotal={cartSubtotal}
        shippingFee={shippingFee}
        selectedItems={selectedItemsIds}
        selectedProductVoucher={selectedProductVoucher}
        selectedFreeshipVoucher={selectedFreeshipVoucher}
        onSelectProduct={handleSelectProductVoucher}
        onSelectFreeship={handleSelectFreeshipVoucher}
      />
    </div>
  );
};

export default CheckoutPage;
