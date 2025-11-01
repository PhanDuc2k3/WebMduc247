import React, { useEffect, useState } from "react";
import ProfileInfo from "../../components/Profile/ProfileInfo/ProfileInfo";
import ProfileTabs from "../../components/Profile/ProfileTabs/ProfileTabs";
import ProfileOrders from "../../components/Profile/ProfileOrders/ProfileOrders";
import ProfileFavorites from "../../components/Profile/ProfileFavorite/ProfileFavorites";
import ProfileSettings from "../../components/Profile/ProfileSettings/ProfileSetting";
import ProfileInfoDetail from "../../components/Profile/ProfileInfoDetail/ProfileInfoDetail";
import ProductReview from "../Review/Review";
import userApi from "../../api/userApi";
import orderApi from "../../api/orderApi";

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

  // 📦 Lấy danh sách đơn hàng
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      setLoadingOrders(true);

      try {
        const res = await orderApi.getMyOrders();
        console.log("📦 Orders mua:", res.data);

        const mappedOrders: Order[] = res.data.map((order: any) => ({
          _id: order._id,
          date: new Date(order.createdAt).toLocaleDateString("vi-VN"),
          total: order.total?.toLocaleString("vi-VN", {
            style: "currency",
            currency: "VND",
          }),
          items:
            order.items?.map((item: any) => ({
              name: item.name,
              qty: item.quantity,
              price: item.price?.toLocaleString("vi-VN", {
                style: "currency",
                currency: "VND",
              }),
              imgUrl: item.imageUrl,
              productId:
                typeof item.productId === "object"
                  ? item.productId._id
                  : item.productId,
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

  if (!user) {
    return (
      <div className="w-full py-16 flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">👤</div>
          <p className="text-gray-600 text-lg font-medium">
            Đang tải thông tin người dùng...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-8 md:py-12">
      <div className="mb-8 animate-fade-in-down">
        <h1 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900 gradient-text flex items-center gap-3">
          <span>👤</span> Trang cá nhân
        </h1>
        <p className="text-gray-600 text-lg">
          Quản lý thông tin và đơn hàng của bạn
        </p>
      </div>

      {/* 🧍 Thông tin user */}
      <div className="mb-6 animate-fade-in-up delay-100">
        <ProfileInfo user={user} onEdit={() => setIsEditing(true)} />
      </div>

      {/* 🧭 Tabs điều hướng */}
      <div className="mb-6 animate-fade-in-up delay-200">
        <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      <div className="animate-fade-in-up delay-300">
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

      {/* 🔹 Modal đánh giá sản phẩm */}
      {reviewProductId && reviewOrderId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-8 relative shadow-2xl animate-scale-in">
            <button
              onClick={() => {
                setReviewProductId(null);
                setReviewOrderId(null);
              }}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-gray-500 font-bold text-xl transition-all duration-300 transform hover:scale-110"
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
