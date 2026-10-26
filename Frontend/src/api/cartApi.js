import axiosClient from "./axiosClient";
const cartApi = {
    // Lấy giỏ hàng hiện tại
    getCart: () => axiosClient.get("/api/cart"),
    // Thêm sản phẩm vào giỏ
    addToCart: (item) => axiosClient.post("/api/cart/add", item),
    // Cập nhật số lượng sản phẩm trong giỏ
    updateQuantity: (itemId, quantity) => axiosClient.put("/api/cart/update", { itemId, quantity }),
    // Xóa sản phẩm khỏi giỏ
    removeFromCart: (itemId) => axiosClient.delete(`/api/cart/${itemId}`),
};
export default cartApi;
