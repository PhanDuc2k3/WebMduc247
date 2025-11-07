import axiosClient from "./axiosClient";

export interface Notification {
  _id: string;
  userId: string;
  type: "order" | "voucher" | "news" | "system";
  title: string;
  message: string;
  relatedId?: string;
  link?: string;
  isRead: boolean;
  icon?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

const notificationApi = {
  // Lấy tất cả notifications
  getNotifications: (params?: { limit?: number; unreadOnly?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.unreadOnly) queryParams.append("unreadOnly", "true");
    return axiosClient.get(`/api/notifications?${queryParams.toString()}`);
  },

  // Lấy số lượng notifications chưa đọc
  getUnreadCount: () => axiosClient.get("/api/notifications/unread-count"),

  // Đánh dấu notification là đã đọc
  markAsRead: (id: string) => axiosClient.put(`/api/notifications/${id}/read`),

  // Đánh dấu tất cả notifications là đã đọc
  markAllAsRead: () => axiosClient.put("/api/notifications/read-all"),

  // Xóa notification
  deleteNotification: (id: string) => axiosClient.delete(`/api/notifications/${id}`),
};

export default notificationApi;

