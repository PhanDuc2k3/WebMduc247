import React, { useEffect, useState } from "react";
import CartStoreGroup from "../../components/Cart/CartStoreGroup/CartStoreGroup";
import OrderSummary from "../../components/Cart/OrderSummary/OrderSummary";
import { useNavigate } from "react-router-dom";
import cartApi from "../../api/cartApi"; // ✅ dùng axiosClient

interface CartItem {
  _id: string;
  productId: string | { _id: string };
  storeId: string | { _id: string; name: string; logoUrl?: string };
  name: string;
  imageUrl?: string;
  price: number;
  salePrice?: number;
  quantity: number;
  subtotal: number;
}

interface Cart {
  _id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  total: number;
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const navigate = useNavigate();

  // Lấy giỏ hàng
  const fetchCart = async () => {
    try {
      const res = await cartApi.getCart();
      setCart(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy giỏ hàng:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  // Toggle chọn sản phẩm
  const toggleSelectItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // Cập nhật số lượng
  const updateQuantity = async (itemId: string, newQty: number) => {
    if (!cart || newQty < 1) return;
    try {
      const res = await cartApi.updateQuantity(itemId, newQty);
      setCart(res.data.cart);
    } catch (err) {
      console.error("Lỗi updateQuantity:", err);
    }
  };

  // Xóa sản phẩm
  const removeItem = async (itemId: string) => {
    if (!cart) return;
    try {
      const res = await cartApi.removeFromCart(itemId);
      setCart(res.data);
      setSelectedItems((prev) => prev.filter((id) => id !== itemId));
    } catch (err) {
      console.error("Lỗi removeItem:", err);
    }
  };

  // Tổng tiền các sản phẩm được chọn
  const selectedTotal =
    cart?.items.reduce((sum, i) => (selectedItems.includes(i._id) ? sum + i.subtotal : sum), 0) || 0;

  // Gom sản phẩm theo store
  const groupedByStore = cart?.items.reduce((acc: any, item) => {
    const storeKey = typeof item.storeId === "string" ? item.storeId : item.storeId._id;
    if (!acc[storeKey]) {
      acc[storeKey] = {
        store: typeof item.storeId === "string" ? { name: "Cửa hàng" } : item.storeId,
        items: [],
      };
    }
    acc[storeKey].items.push(item);
    return acc;
  }, {});

  // Checkout
  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      alert("Vui lòng chọn ít nhất 1 sản phẩm để thanh toán");
      return;
    }
    // Lưu toàn bộ sản phẩm được chọn thay vì chỉ ID
    const selectedProducts = cart?.items.filter((item) =>
      selectedItems.includes(item._id)
    ) || [];
    localStorage.setItem("checkoutItems", JSON.stringify(selectedProducts));
    navigate("/checkout");
  };

  if (loading) {
    return (
      <div className="w-full py-16 flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🛒</div>
          <p className="text-gray-600 text-lg font-medium">Đang tải giỏ hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-8 md:py-12">
      <div className="mb-8 animate-fade-in-down">
        <h1 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900 gradient-text flex items-center gap-3">
          <span>🛒</span> Giỏ hàng của tôi
        </h1>
        <p className="text-gray-600 text-lg">
          {cart?.items.length || 0} sản phẩm trong giỏ hàng
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left: Cart Items */}
        <div className="flex-1 space-y-6 animate-fade-in-up delay-200">
          {!cart || cart.items.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-12 text-center animate-fade-in">
              <div className="text-6xl mb-4">🛒</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h2>
              <p className="text-gray-500 mb-6">Hãy thêm sản phẩm vào giỏ hàng của bạn</p>
              <button
                onClick={() => navigate("/products")}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                🛍️ Mua sắm ngay
              </button>
            </div>
          ) : (
            Object.entries(groupedByStore || {}).map(([storeId, group]: any, index) => (
              <div
                key={storeId}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CartStoreGroup
                  store={group.store}
                  items={group.items}
                  selectedItems={selectedItems}
                  onSelect={toggleSelectItem}
                  onUpdateQty={updateQuantity}
                  onRemove={removeItem}
                />
              </div>
            ))
          )}
        </div>

        {/* Right: Order Summary - Sticky */}
        {cart && cart.items.length > 0 && (
          <div className="lg:w-[400px] space-y-4 animate-fade-in-right delay-300">
            <div className="sticky top-[180px]">
              <OrderSummary
                selectedItems={selectedItems}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
