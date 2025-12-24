import React, { useState, useEffect } from "react";
import { CreditCard } from "lucide-react";
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
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
  const [selectedSystemVoucher, setSelectedSystemVoucher] = useState<AvailableVoucher | null>(null);
  const [selectedFreeshipVoucher, setSelectedFreeshipVoucher] = useState<AvailableVoucher | null>(null);
  const [selectedStoreVoucher, setSelectedStoreVoucher] = useState<AvailableVoucher | null>(null);

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
      } catch (err: any) {
        console.error("❌ Lỗi load checkout items:", err);
        toast.error(
          "Không thể tải thông tin đơn hàng. Vui lòng thử lại sau.",
          { containerId: "general-toast" }
        );
      }
    };

    loadCheckoutItems();
  }, []);


  // Tính toán discount từ 3 loại voucher
  const calculateVoucherDiscounts = () => {
    let productDiscount = 0;
    let freeshipDiscount = 0;
    let productCode: string | null = null;
    let freeshipCode: string | null = null;

    // Tính discount từ voucher hệ thống
    if (selectedSystemVoucher) {
      if (selectedSystemVoucher.voucherType === "product") {
        productDiscount += selectedSystemVoucher.discount;
        productCode = selectedSystemVoucher.code;
      } else if (selectedSystemVoucher.voucherType === "freeship") {
        if (selectedSystemVoucher.discountType === "fixed") {
          freeshipDiscount += Math.min(selectedSystemVoucher.discountValue, shippingFee);
        } else {
          freeshipDiscount += Math.min(
            (shippingFee * selectedSystemVoucher.discountValue) / 100,
            selectedSystemVoucher.maxDiscount || shippingFee,
            shippingFee
          );
        }
        freeshipCode = selectedSystemVoucher.code;
      }
    }

    // Tính discount từ voucher freeship
    if (selectedFreeshipVoucher) {
      if (selectedFreeshipVoucher.discountType === "fixed") {
        freeshipDiscount += Math.min(selectedFreeshipVoucher.discountValue, shippingFee);
      } else {
        freeshipDiscount += Math.min(
          (shippingFee * selectedFreeshipVoucher.discountValue) / 100,
          selectedFreeshipVoucher.maxDiscount || shippingFee,
          shippingFee
        );
      }
      // Nếu chưa có freeship code từ hệ thống, dùng code này
      if (!freeshipCode) {
        freeshipCode = selectedFreeshipVoucher.code;
      }
    }

    // Tính discount từ voucher cửa hàng
    if (selectedStoreVoucher) {
      if (selectedStoreVoucher.voucherType === "product") {
        productDiscount += selectedStoreVoucher.discount;
        // Nếu chưa có product code từ hệ thống, dùng code này
        if (!productCode) {
          productCode = selectedStoreVoucher.code;
        }
      } else if (selectedStoreVoucher.voucherType === "freeship") {
        if (selectedStoreVoucher.discountType === "fixed") {
          freeshipDiscount += Math.min(selectedStoreVoucher.discountValue, shippingFee);
        } else {
          freeshipDiscount += Math.min(
            (shippingFee * selectedStoreVoucher.discountValue) / 100,
            selectedStoreVoucher.maxDiscount || shippingFee,
            shippingFee
          );
        }
        // Nếu chưa có freeship code, dùng code này
        if (!freeshipCode) {
          freeshipCode = selectedStoreVoucher.code;
        }
      }
    }

    // Đảm bảo freeship discount không vượt quá shippingFee
    freeshipDiscount = Math.min(freeshipDiscount, shippingFee);

    setVoucherDiscount(productDiscount);
    setShippingDiscount(freeshipDiscount);
    setProductVoucherCode(productCode);
    setFreeshipVoucherCode(freeshipCode);
    
    console.log(`✅ Voucher system: ${selectedSystemVoucher?.code || "Không"}, freeship: ${selectedFreeshipVoucher?.code || "Không"}, store: ${selectedStoreVoucher?.code || "Không"}`);
    console.log(`✅ Discount: product ${productDiscount}₫, freeship ${freeshipDiscount}₫`);
  };

  // Handler cho việc mở/đóng voucher popup
  const handleOpenVoucherPopup = () => {
    setIsVoucherPopupOpen(true);
  };

  const handleCloseVoucherPopup = () => {
    setIsVoucherPopupOpen(false);
  };

  // Handler cho việc chọn voucher
  const handleSelectSystemVoucher = (voucher: AvailableVoucher | null) => {
    setSelectedSystemVoucher(voucher);
  };

  const handleSelectFreeshipVoucher = (voucher: AvailableVoucher | null) => {
    setSelectedFreeshipVoucher(voucher);
  };

  const handleSelectStoreVoucher = (voucher: AvailableVoucher | null) => {
    setSelectedStoreVoucher(voucher);
  };

  // Tính lại discount khi các voucher hoặc shippingFee thay đổi
  useEffect(() => {
    calculateVoucherDiscounts();
  }, [selectedSystemVoucher, selectedFreeshipVoucher, selectedStoreVoucher, shippingFee]);

  return (
    <div className="w-full py-4 sm:py-6 md:py-8 lg:py-12 px-4 sm:px-6">
      <div className="mb-4 sm:mb-6 md:mb-8 animate-fade-in-down">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 text-[#2F5FEB] flex items-center gap-2 sm:gap-3">
          <CreditCard className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
          Thanh toán
        </h1>
        <p className="text-gray-600 text-base sm:text-lg">
          Hoàn tất <span className="text-[#2F5FEB] font-semibold">đơn hàng của bạn</span>
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 animate-fade-in-up">
        {/* Cột trái */}
        <div className="flex-1 space-y-4 sm:space-y-6">
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
        <div className="w-full lg:w-1/3 space-y-4 sm:space-y-6">
          <div className="animate-fade-in-up delay-500">
            <VoucherBox 
              subtotal={cartSubtotal} 
              shippingFee={shippingFee} 
              selectedItems={selectedItemsIds}
              onOpenPopup={handleOpenVoucherPopup}
              selectedSystemVoucher={selectedSystemVoucher}
              selectedFreeshipVoucher={selectedFreeshipVoucher}
              selectedStoreVoucher={selectedStoreVoucher}
              onRemoveSystemVoucher={() => handleSelectSystemVoucher(null)}
              onRemoveFreeshipVoucher={() => handleSelectFreeshipVoucher(null)}
              onRemoveStoreVoucher={() => handleSelectStoreVoucher(null)}
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
        selectedSystemVoucher={selectedSystemVoucher}
        selectedFreeshipVoucher={selectedFreeshipVoucher}
        selectedStoreVoucher={selectedStoreVoucher}
        onSelectSystem={handleSelectSystemVoucher}
        onSelectFreeship={handleSelectFreeshipVoucher}
        onSelectStore={handleSelectStoreVoucher}
      />
    </div>
  );
};

export default CheckoutPage;
