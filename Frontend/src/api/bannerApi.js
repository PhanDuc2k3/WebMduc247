import axiosClient from "./axiosClient";
const bannerApi = {
    // Lấy tất cả banner
    getAllBanners: () => axiosClient.get("/api/banner"),
    // Lấy banner theo type: 'main' hoặc 'sub'
    getBannersByType: (type) => axiosClient.get(`/api/banner/type/${type}`),
    // Cập nhật banner (có thể upload file)
    updateBanner: (bannerId, data) => {
        const formData = new FormData();
        formData.append("title", data.title);
        if (data.link)
            formData.append("link", data.link);
        if (data.imageFile)
            formData.append("image", data.imageFile);
        return axiosClient.put(`/api/banner/${bannerId}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },
    // Tạo banner mới
    createBanner: (data) => {
        const formData = new FormData();
        formData.append("title", data.title);
        if (data.link)
            formData.append("link", data.link);
        formData.append("type", data.type);
        if (data.imageFile)
            formData.append("image", data.imageFile);
        return axiosClient.post("/api/banner", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },
    // Xóa banner
    deleteBanner: (bannerId) => axiosClient.delete(`/api/banner/${bannerId}`),
};
export default bannerApi;
