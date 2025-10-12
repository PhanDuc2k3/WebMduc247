import axiosClient from "./axiosClient";

interface CartItem {
  productId: string;
  quantity: number;
  variation?: {
    color?: string;
    size?: string;
    additionalPrice?: number;
  };
}

const cartApi = {
  // Lấy giỏ hàng hiện tại
  getCart: () => axiosClient.get("/api/cart"),

  // Thêm sản phẩm vào giỏ
  addToCart: (item: CartItem) =>
    axiosClient.post("/api/cart/add", item),

  // Cập nhật số lượng sản phẩm trong giỏ
  updateQuantity: (itemId: string, quantity: number) =>
    axiosClient.put("/api/cart/update", { itemId, quantity }),

  // Xóa sản phẩm khỏi giỏ
  removeFromCart: (itemId: string) =>
    axiosClient.delete(`/api/cart/${itemId}`),
};

export default cartApi;
