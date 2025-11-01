import React, { useState, useRef } from "react";
import userApi from "../../../api/userApi"
interface ProfileInfoDetailProps {
  isEditing: boolean;
  onCancel: () => void;
  onUpdated?: (newUser: any) => void;
  user: any; // nhận từ cha
}

const ProfileInfoDetail: React.FC<ProfileInfoDetailProps> = ({
  isEditing,
  onCancel,
  onUpdated,
  user,
}) => {
  const [formData, setFormData] = useState<any>(user);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(
    user?.avatarUrl || null
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

const handleUpdate = async () => {
  try {
    if (!formData) return;

    // Lấy file avatar nếu có
    const avatarFile = fileInputRef.current?.files?.[0];

    // Gọi API axios
    const res = await userApi.updateProfile(
      { fullName: formData.fullName, phone: formData.phone },
      avatarFile
    );

    // res.data.user là user mới trả về từ server
    if (onUpdated) onUpdated(res.data.user);

    window.dispatchEvent(new Event("userUpdated"));
  } catch (err) {
    console.error("❌ Lỗi cập nhật:", err);
  }
};


  const handleCancel = () => {
    setFormData(user);
    setPreviewAvatar(user?.avatarUrl || null);
    onCancel();
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6 lg:p-8 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">📝</span>
        <div className="text-2xl font-bold text-gray-900 gradient-text">Thông tin cá nhân</div>
      </div>

      {isEditing && (
        <div className="flex flex-col items-center mb-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur opacity-50 animate-pulse"></div>
            <img
              src={previewAvatar || "/default-avatar.png"}
              alt="avatar"
              className="relative w-32 h-32 rounded-full object-cover border-4 border-white shadow-2xl mb-3"
            />
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            hidden
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 text-base font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            📷 Chọn ảnh đại diện
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-sm font-semibold text-gray-600 mb-2 block">👤 Họ và tên</span>
            {isEditing ? (
              <input
                type="text"
                name="fullName"
                value={formData.fullName || ""}
                onChange={handleChange}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300"
              />
            ) : (
              <div className="text-lg font-bold text-gray-900">{user.fullName}</div>
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-sm font-semibold text-gray-600 mb-2 block">📧 Email</span>
            <div className="text-lg font-bold text-gray-900">{user.email}</div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-sm font-semibold text-gray-600 mb-2 block">📱 Số điện thoại</span>
            {isEditing ? (
              <input
                type="text"
                name="phone"
                value={formData.phone || ""}
                onChange={handleChange}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300"
              />
            ) : (
              <div className="text-lg font-bold text-gray-900">{user.phone || "Chưa cập nhật"}</div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <span className="text-sm font-semibold text-gray-600 mb-2 block">📅 Ngày tham gia</span>
            <div className="text-lg font-bold text-gray-900">
              {new Date(user.createdAt).toLocaleDateString("vi-VN")}
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
            <span className="text-sm font-semibold text-gray-600 mb-2 block">👥 Trạng thái tài khoản</span>
            {user.role && (
              <span className="inline-block px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-sm font-bold border-2 border-blue-300">
                {user.role === "buyer"
                  ? "👤 Người mua"
                  : user.role === "seller"
                  ? "🏪 Người bán"
                  : "👑 Admin"}
              </span>
            )}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="flex gap-4 mt-8 justify-center sm:justify-start">
          <button
            onClick={handleUpdate}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 text-base font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            ✅ Cập nhật
          </button>
          <button
            onClick={handleCancel}
            className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 text-base font-bold transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
          >
            ❌ Hủy
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileInfoDetail;
