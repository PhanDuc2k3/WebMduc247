// src/api/bannerApi.ts
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
  getAllBanners: () => axiosClient.get<Banner[]>("/banner"),

  // Lấy banner theo type: 'main' hoặc 'sub'
  getBannersByType: (type: "main" | "sub") =>
    axiosClient.get<Banner[]>(`/banner/type/${type}`),

  // Cập nhật banner (có thể upload file)
  updateBanner: (
    bannerId: string,
    data: { title: string; link?: string; imageFile?: File }
  ) => {
    const formData = new FormData();
    formData.append("title", data.title);
    if (data.link) formData.append("link", data.link);
    if (data.imageFile) formData.append("image", data.imageFile);

    return axiosClient.put<Banner>(`/banner/${bannerId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export default bannerApi;
