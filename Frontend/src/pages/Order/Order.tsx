import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { Star, Package, FileText, X, XCircle, CheckCircle, ArrowRight } from "lucide-react";
import { toast } from "react-toastify";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import OrderStatus from "../../components/Order/OrderStatus/OrderStatus";
import OrderProduct from "../../components/Order/OrderProduct/OrderProduct";
import PaymentInfo from "../../components/Order/PaymentInfo/PaymentInfo";
import CustomerInfo from "../../components/Order/CustomerInfo/CustomerInfo";
import ShippingInfo from "../../components/Order/ShippingInfo/ShippingInfo";
import OrderUpdate from "../../components/Order/OrderUpdate/OrderUpdate";
import BuyerConfirmDelivery from "../../components/Order/BuyerConfirmDelivery/BuyerConfirmDelivery";
import ReturnRequest from "../../components/Order/ReturnRequest/ReturnRequest";
import ProductReview from "../Review/Review";
import orderApi from "../../api/orderApi";
import axiosClient from "../../api/axiosClient";

interface Variation {
  color?: string;
  size?: string;
  additionalPrice?: number;
}

interface OrderItem {
  _id: string;
  productId?: string | { _id: string } | any; // productId có thể là string hoặc object
  name: string;
  imageUrl?: string;
  price: number;
  salePrice?: number;
  quantity: number;
  subtotal: number;
  variation?: Variation;
  storeId: string | { _id: string } | any; // storeId có thể là string hoặc object
}

interface PaymentInfoType {
  method: string;
  status: string;
}

interface ShippingInfoType {
  method: string;
  estimatedDelivery: number;
  trackingNumber: string;
}

interface ShippingAddressType {
  fullName: string;
  phone: string;
  address: string;
  email?: string;
}

interface UserInfoType {
  _id?: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  avatarUrl?: string;
}

interface StoreInfoType {
  name: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  ownerId?: string;
}

interface Order {
  _id: string;
  orderCode: string;
  userId?: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  paymentInfo: PaymentInfoType;
  shippingInfo: ShippingInfoType;
  shippingAddress: ShippingAddressType;
  userInfo: UserInfoType;
  statusHistory: { status: string; note?: string; timestamp: string }[];
}

export default function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [storeInfo, setStoreInfo] = useState<StoreInfoType | null>(null);
  const [myStoreId, setMyStoreId] = useState<string | null>(null);
  const [isSeller, setIsSeller] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewProductId, setReviewProductId] = useState<string | null>(null);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false); // ✅ Popup thông tin thanh toán
  const [paymentInfo, setPaymentInfo] = useState<any>(null); // ✅ Thông tin thanh toán

  // Fetch user profile từ API để lấy role và store info chính xác
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await axiosClient.get("/api/users/profile");
        const profile = res.data.user || res.data;
        
        // Kiểm tra role
        const userRole = profile.role || "buyer";
        setIsSeller(userRole === "seller");
        
        // Nếu là seller, fetch store info
        if (userRole === "seller") {
          try {
            const storeRes = await axiosClient.get("/api/stores/me");
            setMyStoreId(storeRes.data.store?._id || null);
          } catch (storeErr) {
            console.error("Lỗi fetch store:", storeErr);
            setMyStoreId(null);
          }
        }
      } catch (err) {
        console.error("Lỗi fetch user profile:", err);
        setIsSeller(false);
      }
    };
    
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const { data } = await orderApi.getOrderById(orderId);
        const estimatedDelivery =
          typeof data.shippingInfo?.estimatedDelivery === "number"
            ? data.shippingInfo.estimatedDelivery
            : data.shippingInfo?.estimatedDelivery?.$date?.$numberLong
            ? parseInt(data.shippingInfo.estimatedDelivery.$date.$numberLong)
            : Date.now();

        const mappedOrder: Order = {
          ...data,
          shippingInfo: {
            method: data.shippingInfo?.method || "Chưa xác định",
            estimatedDelivery,
            trackingNumber: data.shippingInfo?.trackingNumber || "",
          },
        };
        setOrder(mappedOrder);

        // Lấy thông tin store
        if (mappedOrder.items.length > 0) {
          const storeId = mappedOrder.items[0].storeId;
          // storeId có thể là string hoặc object có _id
          const storeIdString = typeof storeId === 'string' 
            ? storeId 
            : ((storeId as any)?._id || storeId);
          
          // Nếu là người mua → luôn lấy thông tin store để hiển thị
          // Nếu là seller → cũng cần để so sánh xem có phải chủ hàng không
          if (storeIdString) {
            try {
              const storeRes = await axiosClient.get(`/api/stores/${storeIdString}`);
              const owner = storeRes.data.store.owner;
              setStoreInfo({
                name: storeRes.data.store.name,
                email: owner?.email || storeRes.data.store.contactEmail || "",
                phone: owner?.phone || storeRes.data.store.contactPhone || "",
                logoUrl: storeRes.data.store.logoUrl || "/avatar.png",
                ownerId: owner?._id || owner?.id || null, // Lưu ownerId để nhắn tin
              });
            } catch (err) {
              console.error("Lỗi fetch store info:", err);
            }
          }
        }
      } catch (err) {
        console.error("Lỗi fetch order:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, isSeller, myStoreId]);

  // ✅ Kiểm tra và hiển thị popup thông tin thanh toán tự động
  useEffect(() => {
    if (!orderId || loading || !order) return;
    
    const paymentSuccessData = localStorage.getItem("walletPaymentSuccess");
    if (paymentSuccessData) {
      try {
        const paymentData = JSON.parse(paymentSuccessData);
        // Kiểm tra xem có phải đơn hàng này không và thời gian không quá 5 phút
        const timeDiff = Date.now() - (paymentData.timestamp || 0);
        if (paymentData.orderCode === order.orderCode && timeDiff < 5 * 60 * 1000) {
          setPaymentInfo(paymentData);
          setShowPaymentSuccess(true);
          // Xóa localStorage sau khi hiển thị
          localStorage.removeItem("walletPaymentSuccess");
        } else {
          // Xóa nếu không khớp hoặc quá cũ
          localStorage.removeItem("walletPaymentSuccess");
        }
      } catch (err) {
        console.error("Lỗi parse payment success data:", err);
        localStorage.removeItem("walletPaymentSuccess");
      }
    }
  }, [orderId, order, loading]);

  if (loading) {
    return (
      <div className="w-full py-12 sm:py-16 flex items-center justify-center animate-fade-in px-4">
        <div className="text-center">
          <Package className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 animate-pulse text-gray-400" />
          <p className="text-gray-600 text-base sm:text-lg font-medium">Đang tải thông tin đơn hàng...</p>
        </div>
      </div>
    );
  }
  
  if (!order) {
    return (
      <div className="w-full py-12 sm:py-16 flex items-center justify-center animate-fade-in px-4">
        <div className="text-center bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-200 p-8 sm:p-12 max-w-md w-full">
          <X className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 text-red-500" />
          <p className="text-red-500 text-base sm:text-lg font-medium">Không lấy được thông tin đơn hàng</p>
        </div>
      </div>
    );
  }

  const currentStatus = order.statusHistory[order.statusHistory.length - 1].status;

  // Kiểm tra xem có phải là chủ hàng của order này không
  const orderStoreIdRaw = order.items[0]?.storeId;
  // storeId có thể là string hoặc object có _id
  const orderStoreId = typeof orderStoreIdRaw === 'string' 
    ? orderStoreIdRaw 
    : ((orderStoreIdRaw as any)?._id || orderStoreIdRaw);
  
  const isOwnerSeller =
    isSeller &&
    myStoreId &&
    orderStoreId &&
    String(orderStoreId) === String(myStoreId);

  // Kiểm tra xem có thể hủy đơn không (chỉ khi status là pending, confirmed, packed)
  const canCancelOrder = !isOwnerSeller && ["pending", "confirmed", "packed"].includes(currentStatus);

  // Xử lý hủy đơn hàng
  const handleCancelOrderClick = () => {
    setShowCancelConfirm(true);
  };

  const handleCancelOrder = async () => {
    setShowCancelConfirm(false);
    try {
      await orderApi.cancelOrder(order._id, "Khách hàng yêu cầu hủy đơn hàng");
      toast.success(
        <div className="flex items-center gap-2">
          <XCircle className="text-green-500" size={18} />
          <span>Đơn hàng đã được hủy thành công!</span>
        </div>
      );
      // Reload order sau khi hủy
      const res = await orderApi.getOrderById(order._id);
      const data = res.data;
      const estimatedDelivery =
        typeof data.shippingInfo?.estimatedDelivery === "number"
          ? data.shippingInfo.estimatedDelivery
          : data.shippingInfo?.estimatedDelivery?.$date?.$numberLong
          ? parseInt(data.shippingInfo.estimatedDelivery.$date.$numberLong)
          : Date.now();
      const mappedOrder: Order = {
        ...data,
        shippingInfo: {
          method: data.shippingInfo?.method || "Chưa xác định",
          estimatedDelivery,
          trackingNumber: data.shippingInfo?.trackingNumber || "",
        },
      };
      setOrder(mappedOrder);
    } catch (err: any) {
      console.error("Lỗi hủy đơn hàng:", err);
      const errorMessage = err.response?.data?.message 
        || err.message 
        || "Lỗi khi hủy đơn hàng!";
      toast.error(
        <div className="flex items-center gap-2">
          <XCircle className="text-red-500" size={18} />
          <span>{errorMessage}</span>
        </div>
      );
    }
  };

  // Debug log để kiểm tra
  console.log("🔍 Debug Order Info:", {
    isSeller,
    myStoreId,
    orderStoreId,
    orderStoreIdRaw,
    isOwnerSeller,
    hasStoreInfo: !!storeInfo,
    hasUserInfo: !!order.userInfo,
    comparison: orderStoreId && myStoreId ? String(orderStoreId) === String(myStoreId) : false,
    userInfo: order.userInfo,
  });

  // Logic hiển thị thông tin:
  // - Nếu là chủ hàng (isOwnerSeller) → hiển thị thông tin người mua (order.userInfo)
  // - Nếu là người mua (không phải seller) → hiển thị thông tin người bán (storeInfo)
  const displayedUser = isOwnerSeller
    ? {
        // Chủ hàng xem thông tin người mua
        fullName: order.userInfo?.fullName || "Khách hàng",
        email: order.userInfo?.email || "",
        phone: order.userInfo?.phone || "",
        role: "Khách hàng",
        avatarUrl: order.userInfo?.avatarUrl || "/avatar.png",
        userId: order.userInfo?._id || order.userId || "", // ID người mua để nhắn tin
      }
    : {
        // Người mua xem thông tin người bán (store)
        fullName: storeInfo?.name || "Cửa hàng",
        email: storeInfo?.email || "",
        phone: storeInfo?.phone || "",
        role: "Chủ cửa hàng",
        avatarUrl: storeInfo?.logoUrl || "/avatar.png",
        userId: storeInfo?.ownerId || "", // ID chủ cửa hàng để nhắn tin
      };

  return (
    <div className="w-full py-4 sm:py-6 md:py-8 lg:py-12 px-4 sm:px-6 bg-gray-50 min-h-screen">
      <div className="mb-4 sm:mb-6 md:mb-8 animate-fade-in-down">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 text-[#2F5FEB] flex items-center gap-2 sm:gap-3">
          <Package className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
          Chi tiết đơn hàng
        </h1>
        <p className="text-gray-600 text-base sm:text-lg flex items-center gap-2">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          Mã đơn hàng: <span className="font-bold text-[#2F5FEB] break-all">{order.orderCode}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[68%_32%] gap-4 sm:gap-6 animate-fade-in-up">
        {/* Cột trái */}
        <div className="space-y-4 sm:space-y-6">
          <OrderStatus statusHistory={order.statusHistory} />
          <OrderProduct items={order.items} />
          <PaymentInfo 
            order={order} 
            onPaymentSuccess={async () => {
              // Reload order sau khi thanh toán thành công
              const res = await orderApi.getOrderById(order._id);
              const data = res.data;
              const estimatedDelivery =
                typeof data.shippingInfo?.estimatedDelivery === "number"
                  ? data.shippingInfo.estimatedDelivery
                  : data.shippingInfo?.estimatedDelivery?.$date?.$numberLong
                  ? parseInt(data.shippingInfo.estimatedDelivery.$date.$numberLong)
                  : Date.now();
              const mappedOrder: Order = {
                ...data,
                shippingInfo: {
                  method: data.shippingInfo?.method || "Chưa xác định",
                  estimatedDelivery,
                  trackingNumber: data.shippingInfo?.trackingNumber || "",
                },
              };
              setOrder(mappedOrder);
            }}
          />
        </div>

        {/* Cột phải */}
        <div className="space-y-4 sm:space-y-6">
          <CustomerInfo customer={displayedUser} />
          <ShippingInfo
            shippingAddress={order.shippingAddress}
            shippingInfo={order.shippingInfo}
            orderCode={order.orderCode}
            ownerId={!isOwnerSeller ? storeInfo?.ownerId : undefined}
            order={!isOwnerSeller ? order : undefined}
            storeName={storeInfo?.name}
          />
          {isOwnerSeller && (
            <OrderUpdate orderId={order._id} currentStatus={currentStatus} />
          )}
          {canCancelOrder && (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-red-100 overflow-hidden animate-fade-in-up">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 sm:p-6 border-b-2 border-red-200">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                  <XCircle size={20} className="sm:w-6 sm:h-6 text-red-600" />
                  Hủy đơn hàng
                </h2>
                <p className="text-gray-600 text-xs sm:text-sm mt-1">Bạn có thể hủy đơn hàng khi đơn hàng chưa được vận chuyển</p>
              </div>
              <div className="p-4 sm:p-6">
                <button
                  onClick={handleCancelOrder}
                  className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <XCircle size={18} className="sm:w-5 sm:h-5" />
                  <span>Hủy đơn hàng</span>
                </button>
              </div>
            </div>
          )}
          {!isOwnerSeller && currentStatus === "delivered" && (
            <BuyerConfirmDelivery orderId={order._id} onConfirm={async () => {
              // Reload order sau khi confirm
              const res = await orderApi.getOrderById(order._id);
              const data = res.data;
              const estimatedDelivery =
                typeof data.shippingInfo?.estimatedDelivery === "number"
                  ? data.shippingInfo.estimatedDelivery
                  : data.shippingInfo?.estimatedDelivery?.$date?.$numberLong
                  ? parseInt(data.shippingInfo.estimatedDelivery.$date.$numberLong)
                  : Date.now();
              const mappedOrder: Order = {
                ...data,
                shippingInfo: {
                  method: data.shippingInfo?.method || "Chưa xác định",
                  estimatedDelivery,
                  trackingNumber: data.shippingInfo?.trackingNumber || "",
                },
              };
              setOrder(mappedOrder);
            }} />
          )}
          {!isOwnerSeller && currentStatus === "received" && (
            <>
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 sm:p-6 border-b-2 border-gray-200">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                    <Star size={20} className="sm:w-6 sm:h-6 text-purple-600" />
                    Đánh giá sản phẩm
                  </h2>
                  <p className="text-gray-600 text-xs sm:text-sm mt-1">Bạn đã nhận được hàng. Hãy chia sẻ đánh giá của bạn!</p>
                </div>
                <div className="p-4 sm:p-6 space-y-2 sm:space-y-3">
                  {order.items.map((item, idx) => {
                    // Get productId from item - could be string or object with _id
                    let actualProductId = '';
                    if (item.productId) {
                      if (typeof item.productId === 'string') {
                        actualProductId = item.productId;
                      } else if (typeof item.productId === 'object' && item.productId._id) {
                        actualProductId = item.productId._id;
                      } else {
                        actualProductId = String(item.productId);
                      }
                    }
                    
                    if (!actualProductId) return null;
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setReviewProductId(actualProductId);
                          setReviewOrderId(order._id);
                        }}
                        className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                      >
                        <Star size={18} className="sm:w-5 sm:h-5" />
                        <span className="break-words">Đánh giá {item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <ReturnRequest
                orderId={order._id}
                order={order}
                onRequestSuccess={async () => {
                  // Reload order sau khi yêu cầu trả lại thành công
                  const res = await orderApi.getOrderById(order._id);
                  const data = res.data;
                  const estimatedDelivery =
                    typeof data.shippingInfo?.estimatedDelivery === "number"
                      ? data.shippingInfo.estimatedDelivery
                      : data.shippingInfo?.estimatedDelivery?.$date?.$numberLong
                      ? parseInt(data.shippingInfo.estimatedDelivery.$date.$numberLong)
                      : Date.now();
                  const mappedOrder: Order = {
                    ...data,
                    shippingInfo: {
                      method: data.shippingInfo?.method || "Chưa xác định",
                      estimatedDelivery,
                      trackingNumber: data.shippingInfo?.trackingNumber || "",
                    },
                  };
                  setOrder(mappedOrder);
                }}
              />
            </>
          )}
        </div>
      </div>
      
      {/* Modal đánh giá sản phẩm */}
      {reviewProductId && reviewOrderId && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-0 sm:p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <ProductReview
            productId={reviewProductId}
            orderId={reviewOrderId}
            onClose={() => {
              setReviewProductId(null);
              setReviewOrderId(null);
            }}
          />
        </div>
      )}

      <ConfirmDialog
        open={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancelOrder}
        title="Xác nhận hủy đơn hàng"
        message="Bạn có chắc chắn muốn hủy đơn hàng này? Hành động này không thể hoàn tác."
        type="danger"
        confirmText="Hủy đơn hàng"
      />

      {/* ✅ Popup thông tin thanh toán thành công */}
      {showPaymentSuccess && paymentInfo && createPortal(
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[10000] p-4 animate-fade-in"
          onClick={() => {
            setShowPaymentSuccess(false);
            setPaymentInfo(null);
          }}
        >
          <div
            className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-t-xl sm:rounded-t-2xl">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white text-center">
                Thanh toán thành công!
              </h2>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Mã đơn hàng:</span>
                  <span className="font-bold text-gray-900">{paymentInfo.orderCode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Số tiền thanh toán:</span>
                  <span className="font-bold text-green-600 text-lg">
                    {paymentInfo.amount.toLocaleString("vi-VN")}₫
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Phương thức:</span>
                  <span className="font-semibold text-gray-900">{paymentInfo.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Số dư ví còn lại:</span>
                  <span className="font-semibold text-blue-600">
                    {paymentInfo.balance.toLocaleString("vi-VN")}₫
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 text-center">
                  Đơn hàng của bạn đã được thanh toán thành công. Vui lòng chờ seller xác nhận đơn hàng.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowPaymentSuccess(false);
                  setPaymentInfo(null);
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#2F5FEB] to-[#244ACC] text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <span>Đã hiểu</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
