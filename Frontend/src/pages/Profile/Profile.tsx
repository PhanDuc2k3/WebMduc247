import React, { useEffect, useState } from "react";
import ProfileInfo from "../../components/Profile/ProfileInfo/ProfileInfo";
import ProfileTabs from "../../components/Profile/ProfileTabs/ProfileTabs";
import ProfileOrders from "../../components/Profile/ProfileOrders/ProfileOrders";
import ProfileFavorites from "../../components/Profile/ProfileFavorite/ProfileFavorites";
import ProfileSettings from "../../components/Profile/ProfileSettings/ProfileSetting";
import ProfileInfoDetail from "../../components/Profile/ProfileInfoDetail/ProfileInfoDetail";

// Types
interface OrderItem {
  name: string;
  qty: number;
  price: string;
  imgUrl: string;
}

interface Order {
  id: string;
  date: string;
  status: string;
  total: string;
  items: OrderItem[];
}

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState("info");
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const token = localStorage.getItem("token");
  const serverHost = "http://localhost:5000";

  // Fetch user info
  useEffect(() => {
    if (!token) return;

    fetch(`${serverHost}/api/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch((err) => console.error("Lỗi fetch user:", err));
  }, [token]);

  // Fetch orders of current user
  useEffect(() => {
    if (!token) return;

    const fetchOrders = async () => {
      try {
        const res = await fetch(`${serverHost}/api/orders/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Không lấy được đơn hàng");
        const data = await res.json();

        const mappedOrders: Order[] = data.map((order: any) => ({
          id: order.orderCode,
          date: new Date(order.createdAt).toLocaleDateString("vi-VN"),
          status:
            order.paymentInfo?.status === "pending" ? "Chưa thanh toán" : "Đã giao",
          total: order.total.toLocaleString("vi-VN", { style: "currency", currency: "VND" }),
          items: order.items.map((item: any) => ({
            name: item.name,
            qty: item.quantity,
            price: item.price.toLocaleString("vi-VN", { style: "currency", currency: "VND" }),
            imgUrl: item.imageUrl,
          })),
        }));

        setOrders(mappedOrders);
      } catch (err) {
        console.error("🔥 Lỗi fetch orders:", err);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [token]);

  if (!user) return <div>Đang tải...</div>;

  return (
    <div className="bg-[#f8f9fb] min-h-screen py-8">
      <div className="max-w-4xl mx-auto">
        <ProfileInfo user={user} onEdit={() => setIsEditing(true)} />
        <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="mt-6">
          {activeTab === "info" && (
            <ProfileInfoDetail
              isEditing={isEditing}
              onCancel={() => setIsEditing(false)}
              onUpdated={(newUser) => {
                setUser(newUser);
                setIsEditing(false);
              }}
              user={user}
            />
          )}
          {activeTab === "orders" && (
            <ProfileOrders orders={orders} loading={loadingOrders} />
          )}
          {activeTab === "favorites" && <ProfileFavorites />}
          {activeTab === "settings" && <ProfileSettings />}
        </div>
      </div>
    </div>
  );
};

export default Profile;
