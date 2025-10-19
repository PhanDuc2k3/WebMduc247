import axiosClient from "./axiosClient";

export interface Banner {
  _id: string;
  title: string;
  link?: string;
  imageUrl: string;
  type: "main" | "sub";
}

const bannerApi = {
  // Lấy tất cả banner
  getAllBanners: () => axiosClient.get<Banner[]>("/api/banner"),

  // Lấy banner theo type: 'main' hoặc 'sub'
  getBannersByType: (type: "main" | "sub") =>
    axiosClient.get<Banner[]>(`/api/banner/type/${type}`),

  // Cập nhật banner (có thể upload file)
  updateBanner: (bannerId: string, data: { title: string; link?: string; imageFile?: File }) => {
    const formData = new FormData();
    formData.append("title", data.title);
    if (data.link) formData.append("link", data.link);
    if (data.imageFile) formData.append("image", data.imageFile);

    return axiosClient.put<Banner>(`/api/banner/${bannerId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Tạo banner mới
  createBanner: (data: { title: string; link?: string; type: "main" | "sub"; imageFile?: File }) => {
    const formData = new FormData();
    formData.append("title", data.title);
    if (data.link) formData.append("link", data.link);
    formData.append("type", data.type);
    if (data.imageFile) formData.append("image", data.imageFile);

    return axiosClient.post<Banner>("/api/banner", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Xóa banner
  deleteBanner: (bannerId: string) => axiosClient.delete(`/api/banner/${bannerId}`),
};

export default bannerApi;
