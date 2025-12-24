import React, { useState, useRef } from "react";
import { FileText, Camera, Calendar, Users, User, Store, Crown, Check, X, Mail, Phone } from "lucide-react";
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
    console.error("Lỗi cập nhật:", err);
  }
};


  const handleCancel = () => {
    setFormData(user);
    setPreviewAvatar(user?.avatarUrl || null);
    onCancel();
  };

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-lg border-2 border-gray-100 p-4 md:p-6 lg:p-8 animate-fade-in-up">
      <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <FileText size={20} className="text-gray-700" />
        <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 gradient-text">Thông tin cá nhân</div>
      </div>

      {isEditing && (
        <div className="flex flex-col items-center mb-6 md:mb-8 p-4 md:p-6 bg-[#F3F6FF] rounded-lg md:rounded-xl border border-[#E5E7EB]">
          <div className="relative mb-3 md:mb-4">
            <img
              src={previewAvatar || "/default-avatar.png"}
              alt="avatar"
              className="w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full object-cover border-2 md:border-4 border-white shadow-2xl mb-2 md:mb-3"
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
            className="px-4 py-2 md:px-6 md:py-2.5 bg-[#2F5FEB] text-white rounded-lg md:rounded-xl hover:bg-[#244ACC] text-xs sm:text-sm md:text-base font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-1.5 md:gap-2"
          >
            <Camera size={14} /> Chọn ảnh đại diện
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
        <div className="space-y-4 md:space-y-6">
          <div className="p-3 md:p-4 bg-gray-50 rounded-lg md:rounded-xl border border-gray-200">
            <span className="text-xs md:text-sm font-semibold text-gray-600 mb-1.5 md:mb-2 block flex items-center gap-1.5 md:gap-2">
              <User size={14} className="md:w-4 md:h-4" /> Họ và tên
            </span>
            {isEditing ? (
              <input
                type="text"
                name="fullName"
                value={formData.fullName || ""}
                onChange={handleChange}
                className="w-full border-2 border-gray-300 rounded-lg md:rounded-xl px-3 py-2 md:px-4 md:py-3 text-sm md:text-base lg:text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300"
              />
            ) : (
              <div className="text-sm md:text-base lg:text-lg font-bold text-gray-900">{user.fullName}</div>
            )}
          </div>

          <div className="p-3 md:p-4 bg-gray-50 rounded-lg md:rounded-xl border border-gray-200">
            <span className="text-xs md:text-sm font-semibold text-gray-600 mb-1.5 md:mb-2 block flex items-center gap-1.5 md:gap-2">
              <Mail size={14} className="md:w-4 md:h-4" /> Email
            </span>
            <div className="text-sm md:text-base lg:text-lg font-bold text-gray-900 break-words">{user.email}</div>
          </div>

          <div className="p-3 md:p-4 bg-gray-50 rounded-lg md:rounded-xl border border-gray-200">
            <span className="text-xs md:text-sm font-semibold text-gray-600 mb-1.5 md:mb-2 block flex items-center gap-1.5 md:gap-2">
              <Phone size={14} className="md:w-4 md:h-4" /> Số điện thoại
            </span>
            {isEditing ? (
              <input
                type="text"
                name="phone"
                value={formData.phone || ""}
                onChange={handleChange}
                className="w-full border-2 border-gray-300 rounded-lg md:rounded-xl px-3 py-2 md:px-4 md:py-3 text-sm md:text-base lg:text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300"
              />
            ) : (
              <div className="text-sm md:text-base lg:text-lg font-bold text-gray-900">{user.phone || "Chưa cập nhật"}</div>
            )}
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          <div className="p-3 md:p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg md:rounded-xl border border-green-200">
            <span className="text-xs md:text-sm font-semibold text-gray-600 mb-1.5 md:mb-2 block flex items-center gap-1.5 md:gap-2">
              <Calendar size={14} className="md:w-4 md:h-4" /> Ngày tham gia
            </span>
            <div className="text-sm md:text-base lg:text-lg font-bold text-gray-900">
              {new Date(user.createdAt).toLocaleDateString("vi-VN")}
            </div>
          </div>

          <div className="p-3 md:p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg md:rounded-xl border border-purple-200">
            <span className="text-xs md:text-sm font-semibold text-gray-600 mb-1.5 md:mb-2 block flex items-center gap-1.5 md:gap-2">
              <Users size={14} className="md:w-4 md:h-4" /> Trạng thái tài khoản
            </span>
            {user.role && (
              <span className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-xs md:text-sm font-bold border-2 border-blue-300">
                {user.role === "buyer" ? (
                  <>
                    <User size={12} className="md:w-3.5 md:h-3.5" /> Người mua
                  </>
                ) : user.role === "seller" ? (
                  <>
                    <Store size={12} className="md:w-3.5 md:h-3.5" /> Người bán
                  </>
                ) : (
                  <>
                    <Crown size={12} className="md:w-3.5 md:h-3.5" /> Admin
                  </>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-6 md:mt-8 justify-center sm:justify-start">
          <button
            onClick={handleUpdate}
            className="px-6 md:px-8 py-2.5 md:py-3 bg-[#2F5FEB] text-white rounded-lg md:rounded-xl hover:bg-[#244ACC] text-xs sm:text-sm md:text-base font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2"
          >
            <Check size={14} className="md:w-4 md:h-4" /> Cập nhật
          </button>
          <button
            onClick={handleCancel}
            className="px-6 md:px-8 py-2.5 md:py-3 border-2 border-gray-300 text-gray-700 rounded-lg md:rounded-xl hover:bg-gray-50 hover:border-gray-400 text-xs sm:text-sm md:text-base font-bold transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2"
          >
            <X size={14} className="md:w-4 md:h-4" /> Hủy
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileInfoDetail;
