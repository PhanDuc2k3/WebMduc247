import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import OrderStatus from "../../components/Order/OrderStatus/OrderStatus";
import OrderProduct from "../../components/Order/OrderProduct/OrderProduct";
import PaymentInfo from "../../components/Order/PaymentInfo/PaymentInfo";
import CustomerInfo from "../../components/Order/CustomerInfo/CustomerInfo";
import ShippingInfo from "../../components/Order/ShippingInfo/ShippingInfo";
import OrderUpdate from "../../components/Order/OrderUpdate/OrderUpdate";
import orderApi from "../../api/orderApi";
import axiosClient from "../../api/axiosClient";

interface Variation {
  color?: string;
  size?: string;
  additionalPrice?: number;
}

interface OrderItem {
  _id: string;
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

  if (loading) {
    return (
      <div className="w-full py-16 flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">📦</div>
          <p className="text-gray-600 text-lg font-medium">Đang tải thông tin đơn hàng...</p>
        </div>
      </div>
    );
  }
  
  if (!order) {
    return (
      <div className="w-full py-16 flex items-center justify-center animate-fade-in">
        <div className="text-center bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-12 max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-red-500 text-lg font-medium">Không lấy được thông tin đơn hàng</p>
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
    <div className="w-full py-8 md:py-12">
      <div className="mb-8 animate-fade-in-down">
        <h1 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900 gradient-text flex items-center gap-3">
          <span>📦</span> Chi tiết đơn hàng
        </h1>
        <p className="text-gray-600 text-lg flex items-center gap-2">
          <span>📋</span> Mã đơn hàng: <span className="font-bold text-blue-600">{order.orderCode}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[68%_32%] gap-6 animate-fade-in-up">
        {/* Cột trái */}
        <div className="space-y-6">
          <OrderStatus statusHistory={order.statusHistory} />
          <OrderProduct items={order.items} />
          <PaymentInfo order={order} />
        </div>

        {/* Cột phải */}
        <div className="space-y-6">
          <CustomerInfo customer={displayedUser} />
          <ShippingInfo
            shippingAddress={order.shippingAddress}
            shippingInfo={order.shippingInfo}
            orderCode={order.orderCode}
          />
          {isOwnerSeller && (
            <OrderUpdate orderId={order._id} currentStatus={currentStatus} />
          )}
        </div>
      </div>
    </div>
  );
}
