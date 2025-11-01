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
  storeId: string;
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
}

interface Order {
  _id: string;
  orderCode: string;
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
  const [loading, setLoading] = useState(true);

  let userRole: string = "buyer";
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const parsedUser = JSON.parse(userStr);
      userRole = parsedUser.role || "buyer";
    } catch (err) {
      console.error("Lỗi parse user từ localStorage:", err);
    }
  }

  const isSeller = userRole === "seller";

  useEffect(() => {
    const fetchMyStore = async () => {
      if (!isSeller) return;
      try {
        const res = await axiosClient.get("/api/stores/me");
        setMyStoreId(res.data.store._id);
      } catch (err) {
        console.error("Lỗi fetch store:", err);
        setMyStoreId(null);
      }
    };
    fetchMyStore();
  }, [isSeller]);

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

        if (!isSeller && mappedOrder.items.length > 0) {
          const storeId = mappedOrder.items[0].storeId;
          const storeRes = await axiosClient.get(`/api/stores/${storeId}`);
          setStoreInfo({
            name: storeRes.data.store.name,
            email: storeRes.data.store.owner?.email || "",
            phone: storeRes.data.store.owner?.phone || "",
            logoUrl: storeRes.data.store.logoUrl || "/avatar.png",
          });
        }
      } catch (err) {
        console.error("Lỗi fetch order:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, isSeller]);

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

  const displayedUser = isSeller
    ? {
        fullName: order.userInfo.fullName,
        email: order.userInfo.email,
        phone: order.userInfo.phone,
        role: "Khách hàng",
        avatarUrl: order.userInfo.avatarUrl || "/avatar.png",
      }
    : {
        fullName: storeInfo?.name || "Cửa hàng",
        email: storeInfo?.email || "",
        phone: storeInfo?.phone || "",
        role: "Chủ cửa hàng",
        avatarUrl: storeInfo?.logoUrl || "/avatar.png",
      };

  const isOwnerSeller =
    isSeller &&
    myStoreId &&
    order.items[0]?.storeId?.toString() === myStoreId.toString();

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
