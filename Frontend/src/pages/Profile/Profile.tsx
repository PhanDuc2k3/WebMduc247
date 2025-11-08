import React, { useEffect, useState } from "react";
import { User, Lock, X } from "lucide-react";
import ProfileInfo from "../../components/Profile/ProfileInfo/ProfileInfo";
import ProfileTabs from "../../components/Profile/ProfileTabs/ProfileTabs";
import ProfileOrders from "../../components/Profile/ProfileOrders/ProfileOrders";
import ProfileFavorites from "../../components/Profile/ProfileFavorite/ProfileFavorites";
import ProfileSettings from "../../components/Profile/ProfileSettings/ProfileSetting";
import ProfileInfoDetail from "../../components/Profile/ProfileInfoDetail/ProfileInfoDetail";
import ProductReview from "../Review/Review";
import userApi from "../../api/userApi";
import orderApi from "../../api/orderApi";
import { toast } from "react-toastify";

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
  emailNotifications?: boolean;
}

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState("info");
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [reviewProductId, setReviewProductId] = useState<string | null>(null);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);

  // Change password states
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);

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
      <div className="w-full py-8 md:py-16 flex items-center justify-center animate-fade-in p-4">
        <div className="text-center">
          <User size={48} className="mx-auto mb-3 md:mb-4 animate-pulse text-gray-400" />
          <p className="text-gray-600 text-sm md:text-lg font-medium">
            Đang tải thông tin người dùng...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-3 md:p-4 lg:p-6 xl:p-8">
      <div className="mb-4 md:mb-6 lg:mb-8 animate-fade-in-down">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 md:mb-3 text-gray-900 gradient-text flex items-center gap-2 md:gap-3">
          <User size={24} className="text-gray-700" />
          Trang cá nhân
        </h1>
        <p className="text-gray-600 text-sm md:text-base lg:text-lg">
          Quản lý thông tin và đơn hàng của bạn
        </p>
      </div>

      {/* Thông tin user */}
      <div className="mb-4 md:mb-6 animate-fade-in-up delay-100">
        <ProfileInfo 
          user={user} 
          onEdit={() => setIsEditing(true)}
        />
      </div>

      {/* Tabs điều hướng */}
      <div className="mb-4 md:mb-6 animate-fade-in-up delay-200">
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
        {activeTab === "settings" && (
          <ProfileSettings 
            onChangePassword={() => setShowChangePassword(true)}
            user={user}
            onUserUpdate={async () => {
              // Refresh user data after 2FA changes
              try {
                const res = await userApi.getProfile();
                setUser(res.data.user);
              } catch (error) {
                console.error("Error refreshing user data:", error);
              }
            }}
          />
        )}
      </div>

      {/* Modal đánh giá sản phẩm */}
      {reviewProductId && reviewOrderId && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}>
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

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 relative animate-fade-in-up my-auto">
            <button
              onClick={() => {
                setShowChangePassword(false);
                setOldPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <h2 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6 text-gray-900">
              Đổi mật khẩu
            </h2>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                
                if (newPassword !== confirmPassword) {
                  toast.error("Mật khẩu xác nhận không khớp.");
                  return;
                }

                if (newPassword.length < 6) {
                  toast.error("Mật khẩu mới phải có ít nhất 6 ký tự.");
                  return;
                }

                setLoadingPassword(true);
                try {
                  const res = await userApi.changePassword({ oldPassword, newPassword });
                  if (res.status === 200) {
                    toast.success(res.data.message || "Đổi mật khẩu thành công!");
                    setShowChangePassword(false);
                    setOldPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }
                } catch (err: any) {
                  const message = err.response?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
                  toast.error(message);
                } finally {
                  setLoadingPassword(false);
                }
              }} 
              className="space-y-4 sm:space-y-5"
            >
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Mật khẩu cũ
                </label>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
                  <input
                    type="password"
                    className="relative w-full px-3 py-2.5 sm:px-4 sm:py-3 pl-10 sm:pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300 text-sm sm:text-base"
                    placeholder="Nhập mật khẩu cũ"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                  <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
                  <input
                    type="password"
                    className="relative w-full px-3 py-2.5 sm:px-4 sm:py-3 pl-10 sm:pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300 text-sm sm:text-base"
                    placeholder="Nhập mật khẩu mới"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
                  <input
                    type="password"
                    className="relative w-full px-3 py-2.5 sm:px-4 sm:py-3 pl-10 sm:pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300 text-sm sm:text-base"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">Mật khẩu xác nhận không khớp</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loadingPassword || newPassword !== confirmPassword || newPassword.length < 6}
                className="relative w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 sm:py-3.5 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loadingPassword ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Đang xử lý...
                  </span>
                ) : (
                  "Đổi mật khẩu"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
