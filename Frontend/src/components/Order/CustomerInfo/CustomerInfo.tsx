import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Phone, Mail, MessageCircle, AlertTriangle, XCircle } from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";

interface CustomerInfoProps {
  customer: {
    fullName: string;
    role: string;
    phone: string;
    email: string;
    avatarUrl?: string;
    userId?: string; // ID của người cần nhắn tin (ownerId hoặc userId)
  };
}

const CustomerInfo: React.FC<CustomerInfoProps> = ({ customer }) => {
  const navigate = useNavigate();

  const handleMessage = async () => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) {
        toast.warning(
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-yellow-500" size={18} />
            <span>Vui lòng đăng nhập để nhắn tin</span>
          </div>
        );
        return;
      }

      const currentUser = JSON.parse(stored);
      const senderId = currentUser._id || currentUser.id;
      const receiverId = customer.userId;

      if (!senderId || !receiverId) {
        toast.error(
          <div className="flex items-center gap-2">
            <XCircle className="text-red-500" size={18} />
            <span>Không tìm thấy ID người dùng</span>
          </div>
        );
        return;
      }

      // Tạo hoặc lấy conversation
      const res = await axiosClient.post("/api/messages/conversation", {
        senderId,
        receiverId,
      });

      const conversation = res.data.conversation || res.data;

      // Xây chatUser
      const chatUser = {
        _id: receiverId,
        name: customer.fullName,
        avatar: customer.avatarUrl || "/default-avatar.png",
      };

      // Lấy tin nhắn ban đầu
      const msgRes = await axiosClient.get(`/api/messages/${conversation._id}`);
      const initialMessages = msgRes.data || [];

      // Điều hướng đến trang chat
      navigate(`/messages/${conversation._id}`, {
        state: {
          chatUser,
          initialMessages,
        },
      });
    } catch (err: any) {
      console.error("Lỗi khi mở chat:", err);
      toast.error(
        <div className="flex items-center gap-2">
          <XCircle className="text-red-500" size={18} />
          <span>{err.response?.data?.message || "Không thể mở cuộc trò chuyện. Vui lòng thử lại."}</span>
        </div>
      );
    }
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 sm:p-6 border-b-2 border-gray-200">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
          <User className="w-5 h-5 sm:w-6 sm:h-6" />
          Thông tin {customer.role === "Khách hàng" ? "khách hàng" : "cửa hàng"}
        </h2>
        <p className="text-gray-600 text-xs sm:text-sm mt-1">Liên hệ và thông tin liên lạc</p>
      </div>
      <div className="p-4 sm:p-6">
        <div className="flex items-start space-x-3 sm:space-x-4 mb-4 sm:mb-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <img
              src={customer.avatarUrl || "/avatar.png"}
              alt="Avatar"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-3 sm:border-4 border-blue-300 shadow-lg"
            />
            <span className="absolute bottom-0 right-0 w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full border-2 border-white"></span>
          </div>

          {/* Customer details */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-1 break-words">{customer.fullName}</h3>
            <p className="text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full inline-block mb-2 sm:mb-3">
              {customer.role}
            </p>
            <div className="space-y-1.5 sm:space-y-2">
              {customer.phone && (
                <p className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2 break-words">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>{customer.phone}</span>
                </p>
              )}
              {customer.email && (
                <p className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2 break-words">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="break-all">{customer.email}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-2">
          <button
            onClick={handleMessage}
            className="w-full px-4 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            Nhắn tin
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerInfo;
