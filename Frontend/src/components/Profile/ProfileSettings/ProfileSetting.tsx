import React, { useState, useEffect } from "react";
import { Mail, Lock, MapPin, X } from "lucide-react";
import userApi from "../../../api/userApi";
import { toast } from "react-toastify";
import Address from "../../Payment/Adress/Address";

interface ProfileSettingsProps {
  onChangePassword: () => void;
  user?: {
    emailNotifications?: boolean;
  };
  onUserUpdate?: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  onChangePassword,
  user,
  onUserUpdate
}) => {
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [loadingEmailNotif, setLoadingEmailNotif] = useState(false);
  const [showAddressManagement, setShowAddressManagement] = useState(false);

  // Load user preferences
  useEffect(() => {
    if (user) {
      setEmailNotifications(user.emailNotifications ?? true);
    }
  }, [user]);

  const handleToggleEmailNotifications = async () => {
    const newValue = !emailNotifications;
    setLoadingEmailNotif(true);
    try {
      await userApi.updateEmailNotifications({ emailNotifications: newValue });
      setEmailNotifications(newValue);
      toast.success(newValue ? "Đã bật thông báo email" : "Đã tắt thông báo email");
    } catch (error: any) {
      const message = error.response?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
      toast.error(message);
    } finally {
      setLoadingEmailNotif(false);
    }
  };

  const handleAddressSelect = (id: string) => {
    // Address selection handled by Address component
    console.log("Selected address:", id);
  };

  if (showAddressManagement) {
    return (
      <div className="bg-white rounded-xl md:rounded-2xl shadow-lg border-2 border-gray-100 p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h3 className="font-semibold text-lg sm:text-xl text-[#2F5FEB]">Quản lý địa chỉ</h3>
          <button
            onClick={() => setShowAddressManagement(false)}
            className="text-gray-400 hover:text-[#2F5FEB] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <Address onSelect={handleAddressSelect} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-lg border-2 border-gray-100 p-4 md:p-6 lg:p-8">
      <h3 className="font-semibold text-lg sm:text-xl mb-4 md:mb-6 text-[#2F5FEB]">Cài đặt tài khoản</h3>
      <div className="space-y-3 md:space-y-4 lg:space-y-6">
        {/* Email Notifications */}
        <div className="border-2 border-[#2F5FEB]/15 rounded-lg md:rounded-xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-sm sm:text-base md:text-lg font-medium mb-1 flex items-center gap-2">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-[#2F5FEB]" />
              Thông báo email
            </div>
            <div className="text-xs sm:text-sm md:text-base text-gray-500">
              Nhận thông báo về đơn hàng và khuyến mãi qua email
            </div>
          </div>
          <button
            onClick={handleToggleEmailNotifications}
            disabled={loadingEmailNotif}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${emailNotifications ? "bg-[#2F5FEB]" : "bg-gray-300"
              } ${loadingEmailNotif ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailNotifications ? "translate-x-6" : "translate-x-1"
                }`}
            />
          </button>
        </div>

        {/* Change Password */}
        <div className="border-2 border-[#2F5FEB]/15 rounded-lg md:rounded-xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-sm sm:text-base md:text-lg font-medium mb-1 flex items-center gap-2">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-[#2F5FEB]" />
              Đổi mật khẩu
            </div>
            <div className="text-xs sm:text-sm md:text-base text-gray-500">
              Thay đổi mật khẩu tài khoản của bạn
            </div>
          </div>
          <button
            onClick={onChangePassword}
            className="bg-[#2F5FEB] text-white px-4 py-2 md:px-6 md:py-2.5 rounded-lg md:rounded-xl text-xs sm:text-sm md:text-base font-semibold hover:bg-[#244ACC] transition-all duration-300 shadow-md hover:shadow-lg flex-shrink-0 w-full sm:w-auto"
          >
            Đổi mật khẩu
          </button>
        </div>

        {/* Address Management */}
        <div className="border-2 border-[#2F5FEB]/15 rounded-lg md:rounded-xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-sm sm:text-base md:text-lg font-medium mb-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-[#2F5FEB]" />
              Địa chỉ giao hàng
            </div>
            <div className="text-xs sm:text-sm md:text-base text-gray-500">
              Quản lý địa chỉ nhận hàng khi mua sắm
            </div>
          </div>
          <button
            onClick={() => setShowAddressManagement(true)}
            className="px-4 py-2 md:px-6 md:py-2.5 rounded-lg md:rounded-xl text-xs sm:text-sm md:text-base font-semibold border-2 border-[#2F5FEB]/60 text-[#2F5FEB] bg-white hover:bg-[#2F5FEB]/5 transition-all duration-300 flex-shrink-0 w-full sm:w-auto"
          >
            Quản lý
          </button>
        </div>
      </div>
    </div>
  );
};
export default ProfileSettings;
