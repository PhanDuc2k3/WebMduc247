import React, { useEffect, useState } from "react";
import { Package } from "lucide-react";
import StoreRegisterForm from "../../components/StoreRegisterForm/StoreRegisterForm";

const MyStore: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const token = localStorage.getItem("token");

  // Lấy profile user từ BE
  const fetchProfile = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/users/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
      }
    } catch (error) {
      console.error("Lỗi khi lấy profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) return <div>Đang tải...</div>;

  // Nếu user đã có cửa hàng được approve
  if (user?.role === "seller" && user?.sellerRequest?.status === "approved") {
    return <div>Thông tin cửa hàng của bạn...</div>;
  }

  // Nếu user đã gửi request nhưng đang chờ duyệt
  if (user?.sellerRequest?.status === "pending") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-yellow-100 rounded-full w-32 h-32 flex items-center justify-center mb-6">
          <Package size={64} className="text-yellow-600" />
        </div>
        <h2 className="font-bold text-2xl mb-2">Yêu cầu đã được gửi!</h2>
        <p className="text-gray-600">
          Vui lòng chờ admin duyệt cửa hàng của bạn. Chúng tôi sẽ thông báo sớm nhất.
        </p>
      </div>
    );
  }

  // Nếu user chưa từng gửi request
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      {!showForm ? (
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 rounded-full w-32 h-32 flex items-center justify-center">
              <Package size={64} className="text-gray-400" />
            </div>
          </div>

          <h2 className="font-bold text-2xl mb-2">Bạn chưa có cửa hàng</h2>
          <p className="text-gray-500 mb-6">
            Đăng ký mở cửa hàng để bắt đầu bán hàng
          </p>

          <button
            onClick={() => setShowForm(true)}
            className="bg-black text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 mx-auto hover:bg-gray-800 transition-colors"
          >
            <span className="text-xl">+</span> Đăng ký mở cửa hàng
          </button>
        </div>
      ) : (
        <StoreRegisterForm
          onClose={() => setShowForm(false)}
          onSuccess={() => fetchProfile()} // ✅ gọi lại API để cập nhật trạng thái
        />
      )}
    </div>
  );
};

export default MyStore;
