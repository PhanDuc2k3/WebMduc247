import type { StoreType } from "../types/store";
import axiosClient from "./axiosClient";

const storeApi = {
  createStore: async (data: FormData | Partial<StoreType>) => {
    if (data instanceof FormData) {
      console.log("📦 [storeApi] FormData gửi lên:");

      // Duyệt qua toàn bộ key-value trong FormData để in ra console
      for (const pair of data.entries()) {
        console.log(`👉 ${pair[0]}:`, pair[1]);
      }
    } else {
      console.log("📦 [storeApi] JSON gửi lên:", data);
    }

    try {
      const res = await axiosClient.post("/api/stores", data);
      console.log("✅ [storeApi] Tạo cửa hàng thành công:", res.data);
      return res;
    } catch (err: any) {
      console.error("🔥 [storeApi] Lỗi khi tạo cửa hàng:", err.response?.data || err.message);
      throw err;
    }
  },

  getMyStore: () => axiosClient.get("/api/stores/me"),

  getStoreById: (id: string) => axiosClient.get(`/api/stores/${id}`),

  getAllActiveStores: () => axiosClient.get("/api/stores"),

  updateStore: (data: Partial<StoreType>) =>
    axiosClient.put("/api/stores", data),

  activateStore: () => axiosClient.patch("/api/stores/activate"),

  deactivateStore: () => axiosClient.patch("/api/stores/deactivate"),
};

export default storeApi;
