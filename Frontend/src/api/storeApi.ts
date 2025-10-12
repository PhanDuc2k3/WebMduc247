import axiosClient from "./axiosClient";
import type { StoreType } from "../types/store";

const storeApi = {
  createStore: (data: Partial<StoreType>) =>
    axiosClient.post("/api/stores", data),

  getMyStore: () => axiosClient.get("/api/stores/me"),

  getStoreById: (id: string) => axiosClient.get(`/api/stores/${id}`),

  getAllActiveStores: () => axiosClient.get("/api/stores"),

  updateStore: (data: Partial<StoreType>) =>
    axiosClient.put("/api/stores", data),

  activateStore: () => axiosClient.patch("/api/stores/activate"),

  deactivateStore: () => axiosClient.patch("/api/stores/deactivate"),
};

export default storeApi;
