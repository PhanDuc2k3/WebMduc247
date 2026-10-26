import axiosClient from "./axiosClient";
const addressApi = {
    // Lấy tất cả địa chỉ của user
    getAddresses: () => axiosClient.get("/api/address"),
    // Lấy 1 địa chỉ theo ID
    getAddressById: (id) => axiosClient.get(`/api/address/${id}`),
    // Tạo địa chỉ mới
    createAddress: (data) => axiosClient.post("/api/address", data),
    // Cập nhật địa chỉ
    updateAddress: (id, data) => axiosClient.put(`/api/address/${id}`, data),
    // Xóa địa chỉ
    deleteAddress: (id) => axiosClient.delete(`/api/address/${id}`),
};
export default addressApi;
