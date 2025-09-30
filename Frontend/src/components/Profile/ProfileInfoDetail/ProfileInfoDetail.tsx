import React, { useState, useRef } from "react";

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
        setPreviewAvatar(reader.result as string); // chỉ để preview
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const formDataToSend = new FormData();
    formDataToSend.append("fullName", formData.fullName || "");
    formDataToSend.append("phone", formData.phone || "");

    if (fileInputRef.current?.files?.[0]) {
      formDataToSend.append("avatar", fileInputRef.current.files[0]);
    }

    fetch("http://localhost:5000/api/users/profile", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formDataToSend,
    })
      .then((res) => res.json())
      .then((data) => {
        if (onUpdated) onUpdated(data.user); // báo về cha
          window.dispatchEvent(new Event("userUpdated"));

      })
      .catch((err) => console.error("Lỗi cập nhật:", err));
  };

  const handleCancel = () => {
    setFormData(user);
    setPreviewAvatar(user?.avatarUrl || null);
    onCancel();
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 mb-6">
      <div className="font-semibold mb-4">Thông tin cá nhân</div>

      {isEditing && (
        <div className="flex flex-col items-center mb-6">
          <img
            src={previewAvatar || "/default-avatar.png"}
            alt="avatar"
            className="w-24 h-24 rounded-full object-cover border mb-2"
          />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            hidden
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm font-medium"
          >
            Chọn ảnh
          </button>
        </div>
      )}

      {/* Các field khác */}
      <div className="grid grid-cols-2 gap-8">
        <div>
          <div className="mb-2">
            <span className="text-gray-500">Họ và tên</span>
            {isEditing ? (
              <input
                type="text"
                name="fullName"
                value={formData.fullName || ""}
                onChange={handleChange}
                className="border rounded px-2 py-1 w-full"
              />
            ) : (
              <div className="font-medium">{user.fullName}</div>
            )}
          </div>
          <div className="mb-2">
            <span className="text-gray-500">Email</span>
            <div className="font-medium">{user.email}</div>
          </div>
          <div>
            <span className="text-gray-500">Số điện thoại</span>
            {isEditing ? (
              <input
                type="text"
                name="phone"
                value={formData.phone || ""}
                onChange={handleChange}
                className="border rounded px-2 py-1 w-full"
              />
            ) : (
              <div className="font-medium">{user.phone}</div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2">
            <span className="text-gray-500">Ngày tham gia</span>
            <div className="font-medium">
              {new Date(user.createdAt).toLocaleDateString("vi-VN")}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Trạng thái tài khoản</span>
            <div>
              {user.role && (
                <span className="bg-black text-white px-3 py-1 rounded text-xs font-medium inline-block mt-1">
                  {user.role === "buyer"
                    ? "Người mua"
                    : user.role === "seller"
                    ? "Người bán"
                    : "Admin"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleUpdate}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Cập nhật
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Hủy
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileInfoDetail;
