import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import OrderStatus from "../../components/Order/OrderStatus/OrderStatus";
import OrderProduct from "../../components/Order/OrderProduct/OrderProduct";
import PaymentInfo from "../../components/Order/PaymentInfo/PaymentInfo";
import CustomerInfo from "../../components/Order/CustomerInfo/CustomerInfo";
import ShippingInfo from "../../components/Order/ShippingInfo/ShippingInfo";
import OrderUpdate from "../../components/Order/OrderUpdate/OrderUpdate";

// ==================== Types ====================
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

// ==================== Component ====================
export default function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [storeInfo, setStoreInfo] = useState<StoreInfoType | null>(null);
  const [myStoreId, setMyStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  // ✅ Lấy role từ localStorage
  let userRole: string = "buyer";
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const parsedUser = JSON.parse(userStr);
      userRole = parsedUser.role || "buyer";
    } catch (err) {
      console.error("❗ Lỗi parse user từ localStorage:", err);
    }
  }

  console.log("🔎 [INIT] role in localStorage:", userRole);
  console.log("🔎 [INIT] token in localStorage:", token);

  const serverHost = "http://localhost:5000";

  // ==================== Lấy thông tin store của seller ====================
  useEffect(() => {
    if (userRole === "seller" && token) {
      console.log("🔵 Fetching my store info...");
      fetch(`${serverHost}/api/stores/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("🏪 My store data:", data);
          if (data.store) {
            const id =
              typeof data.store === "string" ? data.store : data.store._id;
            setMyStoreId(id);
          } else {
            setMyStoreId(null);
          }
        })
        .catch((err) => {
          console.error("❗ Lỗi fetch store của seller:", err);
          setMyStoreId(null);
        });
    }
  }, [userRole, token]);

  // ==================== Lấy thông tin đơn hàng ====================
  useEffect(() => {
    if (!orderId || !token) return;

    console.log("🔵 Fetching order with ID:", orderId);

    const fetchOrder = async () => {
      try {
        const res = await fetch(`${serverHost}/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Không lấy được đơn hàng");

        const data = await res.json();
        console.log("✅ Raw order data from API:", data);

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

        console.log("📦 Mapped order for FE:", mappedOrder);
        setOrder(mappedOrder);

        // ✅ Nếu là buyer thì lấy thêm thông tin store
        if (userRole === "buyer" && mappedOrder.items.length > 0) {
          const storeId = mappedOrder.items[0].storeId;
          console.log("🔵 Fetching store info with ID:", storeId);

          const storeRes = await fetch(`${serverHost}/api/stores/${storeId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (storeRes.ok) {
            const storeData = await storeRes.json();
            console.log("🏪 Store data:", storeData);
            setStoreInfo({
              name: storeData.store.name,
              email: storeData.store.owner?.email || "",
              phone: storeData.store.owner?.phone || "",
              logoUrl: storeData.store.logoUrl || "/avatar.png",
            });
          }
        }
      } catch (err) {
        console.error("🔥 Lỗi fetch order:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, token, userRole]);

  // ==================== UI ====================
  if (loading) return <div className="p-6">Đang tải đơn hàng...</div>;
  if (!order)
    return (
      <div className="p-6 text-red-500">
        Không lấy được thông tin đơn hàng
      </div>
    );

  const currentStatus =
    order.statusHistory[order.statusHistory.length - 1].status;
  console.log("📍 Current status:", currentStatus);

  // ✅ Hiển thị user info
  const displayedUser =
    userRole === "seller"
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

  console.log("👤 Displayed user info:", displayedUser);
  console.log("🔎 userRole:", userRole);
  console.log("🔎 myStoreId:", myStoreId);
  console.log("🔎 order storeId:", order.items[0]?.storeId);

  const isOwnerSeller =
    userRole === "seller" &&
    myStoreId &&
    order.items[0]?.storeId === myStoreId;

  console.log("✅ isOwnerSeller:", isOwnerSeller);

  // ==================== Render ====================
  return (
    <main className="min-h-screen bg-[#F5F7FE]">
      <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] bg-white">
        {/* Left */}
        <div className="space-y-6 p-6">
          <OrderStatus statusHistory={order.statusHistory} />
          <OrderProduct items={order.items} />
          <PaymentInfo order={order} />
        </div>

        {/* Right */}
        <div className="space-y-6 p-6">
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
    </main>
  );
}
