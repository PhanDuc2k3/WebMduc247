import React, { useEffect, useState } from "react";
import ProfileInfo from "../../components/Profile/ProfileInfo/ProfileInfo";
import ProfileTabs from "../../components/Profile/ProfileTabs/ProfileTabs";
import ProfileOrders from "../../components/Profile/ProfileOrders/ProfileOrders";
import ProfileFavorites from "../../components/Profile/ProfileFavorite/ProfileFavorites";
import ProfileSettings from "../../components/Profile/ProfileSettings/ProfileSetting";
import ProfileInfoDetail from "../../components/Profile/ProfileInfoDetail/ProfileInfoDetail";
import ProductReview from "../Review/Review";
import userApi from "../../api/userApi";
import orderApi from "../../api/orderApi"
interface OrderItem {
  name: string;
  qty: number;
  price: string;
  imgUrl: string;
  productId: string;
}

interface StatusHistory {
  status: string;
  note?: string;
  timestamp: string;
}

interface Order {
  _id: string;
  date: string;
  total: string;
  items: OrderItem[];
  statusHistory: StatusHistory[];
}

interface User {
  id?: string;
  email: string;
  fullName: string;
  phone?: string;
  role?: string;
  avatarUrl?: string;
}

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState("info");
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [reviewProductId, setReviewProductId] = useState<string | null>(null);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);

  // 🧩 Lấy thông tin user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await userApi.getProfile();
        setUser(res.data.user);
      } catch (error) {
        console.error("❌ Lỗi fetch user:", error);
      }
    };
    fetchUser();
  }, []);

  // 📦 Lấy danh sách đơn hàng tùy theo role
useEffect(() => {
  const fetchOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);

    try {
      // Lấy tất cả đơn hàng mà user này mua
      const res = await orderApi.getMyOrders();

      console.log("📦 Orders mua:", res.data);

      const mappedOrders: Order[] = res.data.map((order: any) => ({
        _id: order._id,
        date: new Date(order.createdAt).toLocaleDateString("vi-VN"),
        total: order.total?.toLocaleString("vi-VN", {
          style: "currency",
          currency: "VND",
        }),
        items: order.items?.map((item: any) => ({
          name: item.name,
          qty: item.quantity,
          price: item.price?.toLocaleString("vi-VN", {
            style: "currency",
            currency: "VND",
          }),
          imgUrl: item.imageUrl,
          productId:
            typeof item.productId === "object" ? item.productId._id : item.productId,
        })) || [],
        statusHistory: order.statusHistory || [],
      }));

      setOrders(mappedOrders);
    } catch (err) {
      console.error("🔥 Lỗi fetch orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  fetchOrders();
}, [user]);


  if (!user) return <div className="p-8 text-center">Đang tải thông tin người dùng...</div>;

  return (
    <div className="bg-[#f8f9fb] min-h-screen py-8">
      <div className="max-w-6xl mx-auto">
        {/* 🧍 Thông tin user */}
        <ProfileInfo user={user} onEdit={() => setIsEditing(true)} />

        {/* 🧭 Tabs điều hướng */}
        <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="mt-6">
          {/* Thông tin cá nhân */}
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

          {/* Đơn hàng */}
          {activeTab === "orders" && (
            <ProfileOrders
              orders={orders}
              
              loading={loadingOrders}
              onReview={(productId, orderId) => {
                setReviewProductId(productId);
                setReviewOrderId(orderId);
              }}
              
            />
          )}

          {/* Yêu thích */}
          {activeTab === "favorites" && <ProfileFavorites />}

          {/* Cài đặt */}
          {activeTab === "settings" && <ProfileSettings />}
        </div>
      </div>

      {/* 🔹 Modal đánh giá sản phẩm */}
      {reviewProductId && reviewOrderId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 relative">
            <button
              onClick={() => {
                setReviewProductId(null);
                setReviewOrderId(null);
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 font-bold text-lg"
            >
              ✕
            </button>

            <ProductReview
              productId={reviewProductId}
              orderId={reviewOrderId}
              onClose={() => {
                setReviewProductId(null);
                setReviewOrderId(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
