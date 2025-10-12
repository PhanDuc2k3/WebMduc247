import axiosClient from "./axiosClient";

export interface AddressType {
  _id?: string;           // MongoDB ObjectId
  user?: string;          // Tham chiếu User (ObjectId)
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;       // default: 'Vietnam'
  isDefault?: boolean;    // default: false
  createdAt?: string;
  updatedAt?: string;
}

const addressApi = {
  // Lấy tất cả địa chỉ của user
  getAddresses: () => axiosClient.get<AddressType[]>("/api/address"),

  // Lấy 1 địa chỉ theo ID
  getAddressById: (id: string) => axiosClient.get<AddressType>(`/api/address/${id}`),

  // Tạo địa chỉ mới
  createAddress: (data: AddressType) => axiosClient.post<AddressType>("/api/address", data),

  // Cập nhật địa chỉ
  updateAddress: (id: string, data: AddressType) => axiosClient.put<AddressType>(`/api/address/${id}`, data),

  // Xóa địa chỉ
  deleteAddress: (id: string) => axiosClient.delete<{ message: string }>(`/api/address/${id}`),
};

export default addressApi;
