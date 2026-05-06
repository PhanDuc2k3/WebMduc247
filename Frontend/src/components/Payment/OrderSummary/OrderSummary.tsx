import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, XCircle, CheckCircle, Wallet } from "lucide-react";
import Subtotal from "./Subtotal";
import CartDiscount from "./CartDiscount";
import ShippingFee from "./ShippingFee";
import PlatformFee from "./PlatformFee";
import TotalAmount from "./TotalAmount";

import cartApi from "../../../api/cartApi";
import addressApi from "../../../api/addressApi";
import type { AddressType } from "../../../api/addressApi";
import orderApi from "../../../api/orderApi";
import type { CreateOrderData } from "../../../api/orderApi";
import paymentApi from "../../../api/paymentApi";
import walletApi from "../../../api/walletApi";
import productApi from "../../../api/productApi";
import { toast } from "react-toastify";

interface OrderSummaryProps {
  shippingFee: number;
  paymentMethod: "cod" | "momo" | "vietqr" | "wallet";
  addressId: string | null;
  discount: number;
  shippingDiscount?: number;
  productVoucherCode?: string | null;
  freeshipVoucherCode?: string | null;
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
  shippingDiscount,
  productVoucherCode,
  freeshipVoucherCode,
}) => {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<AddressType | null>(null);
  const [selectedCartSubtotal, setSelectedCartSubtotal] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false); // Chống double click

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
            const subtotal = products.reduce((sum: number, item: any) => {
              // Nếu có subtotal sẵn thì dùng, nếu không thì tính lại
              if (item.subtotal) {
                return sum + item.subtotal;
              }
              // Tính lại subtotal: (salePrice || price + additionalPrice) * quantity
              const basePrice = item.salePrice || item.price || 0;
              const additionalPrice = item.variation?.additionalPrice || 0;
              const quantity = item.quantity || 0;
              const itemSubtotal = (basePrice + additionalPrice) * quantity;
              return sum + itemSubtotal;
            }, 0);
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

  // Tính phí sàn 10% trên subtotal
  const platformFee = Math.round(selectedCartSubtotal * 0.1);
  
  // Tổng tiền = subtotal + phí sàn - discount + shipping fee - shipping discount
  const total = Math.max(0, selectedCartSubtotal + platformFee - discount + shippingFee - (shippingDiscount || 0));

const handleCheckout = async () => {
  // Chống double click - nếu đang xử lý thì return ngay
  if (isProcessing) {
    return;
  }

  if (!selectedAddress) {
    toast.warning(
      <div className="flex items-center gap-2">
        <AlertTriangle className="text-yellow-500" size={18} />
        <span>Vui lòng chọn địa chỉ giao hàng!</span>
      </div>
    );
    return;
  }

  const selectedItemsSaved = localStorage.getItem("checkoutItems");
  if (!selectedItemsSaved) {
    toast.error(
      <div className="flex items-center gap-2">
        <XCircle className="text-red-500" size={18} />
        <span>Không có sản phẩm nào để thanh toán</span>
      </div>
    );
    return;
  }

  // Set processing = true ngay đầu để chặn double click
  setIsProcessing(true);

  try {
    const parsed = JSON.parse(selectedItemsSaved);
    let itemsForOrder: CreateOrderData["items"] = [];

    // Kiểm tra nếu là mảng ID (format cũ) hoặc mảng objects (format mới)
    if (Array.isArray(parsed) && parsed.length > 0) {
      if (typeof parsed[0] === "string") {
        // Format cũ: mảng ID, cần lấy từ cart
        const selectedItemIds: string[] = parsed;
        if (!cart?.items) {
          toast.error(
            <div className="flex items-center gap-2">
              <XCircle className="text-red-500" size={18} />
              <span>Không lấy được dữ liệu giỏ hàng</span>
            </div>
          );
          return;
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
      toast.error(
        "Không có sản phẩm nào để thanh toán",
        { containerId: "general-toast" }
      );
      return;
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
    shippingFee: shippingFee, // Thêm phí vận chuyển vào payload
    productVoucherCode: productVoucherCode || undefined,
    freeshipVoucherCode: freeshipVoucherCode || undefined,
  };




    // === CONSOLE LOG để debug ===
    console.log("=== Payload gửi lên API createOrder ===");
    console.log(orderPayload);
    console.log("=== Selected Items ===");
    console.log(itemsForOrder);
    console.log("=== Shipping Address ===");
    console.log(selectedAddress);

    // ✅ Kiểm tra stock TRƯỚC KHI tạo đơn hàng
    try {
      const stockErrors: string[] = [];
      
      for (const item of itemsForOrder) {
        try {
          const productRes = await productApi.getProductById(item.productId);
          const product = productRes.data.data || productRes.data;
          
          if (!product) {
            stockErrors.push(`Không tìm thấy sản phẩm với ID: ${item.productId}`);
            continue;
          }

          // Kiểm tra sản phẩm có đang active không
          if (!product.isActive) {
            stockErrors.push(`Sản phẩm "${product.name}" đã ngừng bán`);
            continue;
          }

          // Kiểm tra stock cho sản phẩm có variation
          if (item.variation?.variationId && item.variation?.optionId) {
            const variationId = typeof item.variation.variationId === 'string' 
              ? item.variation.variationId 
              : item.variation.variationId.toString();
            const optionId = typeof item.variation.optionId === 'string'
              ? item.variation.optionId
              : item.variation.optionId.toString();

            const variation = product.variations?.find((v: any) => 
              v._id && v._id.toString() === variationId
            );

            if (!variation) {
              stockErrors.push(`Không tìm thấy biến thể cho sản phẩm "${product.name}"`);
              continue;
            }

            const option = variation.options?.find((o: any) => 
              o._id && o._id.toString() === optionId
            );

            if (!option) {
              stockErrors.push(`Không tìm thấy tùy chọn cho sản phẩm "${product.name}"`);
              continue;
            }

            const currentStock = option.stock || 0;
            if (currentStock < item.quantity) {
              stockErrors.push(
                `Sản phẩm "${product.name}" (${variation.color || ''} - ${option.name || ''}) chỉ còn ${currentStock} sản phẩm trong kho. Bạn yêu cầu ${item.quantity} sản phẩm.`
              );
            }
          } else {
            // Kiểm tra stock cho sản phẩm không có variation
            const currentStock = product.quantity || 0;
            if (currentStock < item.quantity) {
              stockErrors.push(
                `Sản phẩm "${product.name}" chỉ còn ${currentStock} sản phẩm trong kho. Bạn yêu cầu ${item.quantity} sản phẩm.`
              );
            }
          }
        } catch (err: any) {
          console.error(`Lỗi kiểm tra stock cho sản phẩm ${item.productId}:`, err);
          stockErrors.push(`Không thể kiểm tra tồn kho cho sản phẩm. Vui lòng thử lại.`);
        }
      }

      // Nếu có lỗi stock, hiển thị và không cho tạo đơn
      if (stockErrors.length > 0) {
        toast.error(
          <div className="space-y-2">
            <div className="font-bold text-red-600">Không đủ số lượng sản phẩm trong kho:</div>
            {stockErrors.map((error, index) => (
              <div key={index} className="text-sm">• {error}</div>
            ))}
            <div className="text-sm mt-2">Vui lòng cập nhật giỏ hàng và thử lại.</div>
          </div>,
          {
            containerId: "general-toast",
            autoClose: 5000,
          }
        );
        setIsProcessing(false);
        return; // Dừng lại, không tạo đơn hàng
      }
    } catch (err: any) {
      console.error("=== Lỗi kiểm tra stock ===", err);
      toast.error(
        "Không thể kiểm tra tồn kho. Vui lòng thử lại sau.",
        { containerId: "general-toast" }
      );
      setIsProcessing(false);
      return; // Dừng lại, không tạo đơn hàng
    }

    // Kiểm tra số dư ví TRƯỚC KHI tạo đơn hàng (nếu thanh toán bằng ví)
    if (paymentMethod === "wallet") {
      try {
        const walletRes = await walletApi.getWallet();
        const walletBalance = walletRes.data.wallet.balance;
        const estimatedTotal = total; // Sử dụng total đã tính
        
        if (walletBalance < estimatedTotal) {
          toast.warning(
            `Số dư ví không đủ! Số dư hiện tại: ${walletBalance.toLocaleString('vi-VN')}₫. Vui lòng nạp thêm tiền vào ví.`,
            { containerId: "general-toast" }
          );
          navigate('/wallet');
          setIsProcessing(false);
          return; // Dừng lại, không tạo đơn hàng
        }
      } catch (err: any) {
        console.error("=== Lỗi kiểm tra số dư ví ===", err);
        toast.error(
          "Không thể kiểm tra số dư ví. Vui lòng thử lại sau.",
          { containerId: "general-toast" }
        );
        setIsProcessing(false);
        return; // Dừng lại, không tạo đơn hàng
      }
    }

    // Tạo đơn hàng
    const orderRes = await orderApi.createOrder(orderPayload);
    const orderData = orderRes.data;

    console.log("=== Response từ API createOrder ===");
    console.log(orderData);

    // Lưu order info vào localStorage (chỉ lưu khi đơn hàng được tạo thành công)
    localStorage.setItem("lastOrderId", orderData.order._id);
    localStorage.setItem("lastOrderCode", orderData.order.orderCode);

    // Xử lý thanh toán theo phương thức
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
        
        // Chỉ xóa checkoutItems khi thanh toán được tạo thành công
        localStorage.removeItem("checkoutItems");
        
        // Chuyển hướng đến trang thanh toán MoMo
        window.location.href = payData.payUrl;
        return;
      } catch (err: any) {
        console.error("=== Lỗi tạo thanh toán MoMo ===", err);
        toast.error(
          "Không thể tạo thanh toán MoMo. Vui lòng thử lại sau.",
          { containerId: "general-toast" }
        );
        // Không xóa checkoutItems, giữ lại để người dùng có thể thử lại
        return; // Dừng lại, không điều hướng
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
        
        // Chỉ xóa checkoutItems khi QR code được tạo thành công
        localStorage.removeItem("checkoutItems");
        
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
        toast.error(
          "Không thể tạo thanh toán VietQR. Vui lòng thử lại sau.",
          { containerId: "general-toast" }
        );
        // Không xóa checkoutItems, giữ lại để người dùng có thể thử lại
        return; // Dừng lại, không điều hướng
      }
    }

    if (paymentMethod === "wallet") {
      // Với ví, tạo order và chuyển sang trang order để nhập mã xác thực
      // Không thanh toán ngay, để người dùng nhập mã trên trang order
      localStorage.removeItem("checkoutItems");
      
      // ✅ Lưu flag để tự động mở PaymentModal trên trang order
      localStorage.setItem("openWalletPayment", JSON.stringify({
        orderId: orderData.order._id,
        orderCode: orderData.order.orderCode,
        timestamp: Date.now(),
      }));
      
      toast.success(
        "Đơn hàng đã được tạo! Vui lòng nhập mã xác thực để thanh toán.",
        { containerId: "general-toast" }
      );
      
      // Chuyển sang trang order
      navigate(`/order/${orderData.order._id}`);
      setIsProcessing(false);
      return;
    }

    // COD - không cần thanh toán ngay, xóa checkoutItems ngay
    localStorage.removeItem("checkoutItems");
    
    toast.success(
      "Tạo đơn hàng thành công!",
      { containerId: "general-toast" }
    );
    navigate(`/order/${orderData.order._id}`);
  } catch (err) {
    console.error("=== Lỗi handleCheckout ===", err);
    toast.error(
      <div className="flex items-center gap-2">
        <XCircle className="text-red-500" size={18} />
        <span>Đã xảy ra lỗi khi tạo đơn hàng. Vui lòng thử lại sau.</span>
      </div>,
      { containerId: "general-toast" }
    );
  } finally {
    // Luôn set processing = false khi xong (thành công hoặc lỗi)
    setIsProcessing(false);
  }
};



  if (loading) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 p-4 sm:p-6 text-center animate-fade-in">
        <p className="text-gray-600 text-base sm:text-lg font-medium">Đang tải tóm tắt đơn hàng...</p>
      </div>
    );
  }
  
  if (!cart) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 p-4 sm:p-6 text-center animate-fade-in">
        <p className="text-red-500 text-base sm:text-lg font-medium">Không lấy được dữ liệu giỏ hàng</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden lg:sticky lg:top-6">
      <div className="bg-[#2F5FEB] p-4 sm:p-6 border-b-2 border-gray-200">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 sm:gap-3">
          Tóm tắt đơn hàng
        </h2>
        <p className="text-white/90 text-xs sm:text-sm mt-1">Kiểm tra thông tin trước khi thanh toán</p>
      </div>
      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 bg-gradient-to-br from-white to-gray-50">
        <Subtotal subtotal={selectedCartSubtotal} />
        <PlatformFee platformFee={platformFee} />
        {discount > 0 && <CartDiscount voucherDiscount={discount} />}
        <ShippingFee shippingFee={shippingFee} shippingDiscount={shippingDiscount || 0} />
        <div className="border-t-2 border-gray-300 pt-3 sm:pt-4 mt-3 sm:mt-4">
          <TotalAmount total={total} />
        </div>
        <button
          onClick={handleCheckout}
          disabled={isProcessing}
          className={`w-full mt-4 sm:mt-6 px-4 sm:px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg lg:text-xl transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${
            isProcessing
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-[#2F5FEB] text-white hover:bg-[#244ACC] hover:shadow-2xl transform hover:scale-105"
          }`}
        >
          {isProcessing ? (
            <>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Đang xử lý...</span>
            </>
          ) : (
            <span>Thanh toán ngay</span>
          )}
        </button>
        <div className="p-3 sm:p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg sm:rounded-xl mt-3 sm:mt-4">
          <p className="text-yellow-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
            Vui lòng kiểm tra kỹ thông tin đơn hàng trước khi xác nhận
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
