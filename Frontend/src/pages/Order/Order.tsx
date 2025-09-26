import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import OrderStatus from "../../components/Order/OrderStatus/OrderStatus";
import OrderProduct from "../../components/Order/OrderProduct/OrderProduct";
import PaymentInfo from "../../components/Order/PaymentInfo/PaymentInfo";
import CustomerInfo from "../../components/Order/CustomerInfo/CustomerInfo";
import ShippingInfo from "../../components/Order/ShippingInfo/ShippingInfo";
import OrderUpdate from "../../components/Order/OrderUpdate/OrderUpdate";

// Types
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
}

interface PaymentInfoType {
  method: string;
  status: string;
}

interface ShippingInfoType {
  method: string;
  estimatedDelivery: number; // timestamp
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
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const serverHost = "http://localhost:5000";

  useEffect(() => {
    if (!orderId || !token) return;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`${serverHost}/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Không lấy được đơn hàng");

        const data = await res.json();

        // Parse estimatedDelivery từ MongoDB
        const estimatedDelivery = data.shippingInfo?.estimatedDelivery?.$date?.$numberLong
          ? parseInt(data.shippingInfo.estimatedDelivery.$date.$numberLong)
          : Date.now();

        const mappedOrder: Order = {
          ...data,
          shippingInfo: {
            method: data.shippingInfo.method,
            estimatedDelivery,
            trackingNumber: data.shippingInfo.trackingNumber || "",
          },
        };

        setOrder(mappedOrder);
      } catch (err) {
        console.error("🔥 Lỗi fetch order:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, token]);

  if (loading) return <div className="p-6">Đang tải đơn hàng...</div>;
  if (!order) return <div className="p-6 text-red-500">Không lấy được thông tin đơn hàng</div>;

  return (
    <main className="min-h-screen bg-[#F5F7FE]">
      <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] bg-white">
        {/* Left column */}
        <div className="space-y-6">
          <OrderStatus statusHistory={order.statusHistory} />
          <OrderProduct items={order.items} />
          <PaymentInfo order={order} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <CustomerInfo customer={order.userInfo} />
          <ShippingInfo
            shippingAddress={order.shippingAddress}
            shippingInfo={order.shippingInfo}
            orderCode={order.orderCode}
          />
          <OrderUpdate orderId={order._id} currentStatus={order.statusHistory[order.statusHistory.length - 1].status} />
        </div>
      </div>
    </main>
  );
}
