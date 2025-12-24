import React, { useEffect, useState } from "react";
import { ShoppingCart, Loader2, ShoppingBag, AlertTriangle } from "lucide-react";
import CartStoreGroup from "../../components/Cart/CartStoreGroup/CartStoreGroup";
import OrderSummary from "../../components/Cart/OrderSummary/OrderSummary";
import { useNavigate } from "react-router-dom";
import cartApi from "../../api/cartApi"; // ✅ dùng axiosClient
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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

  // ✅ Đồng bộ selectedItems khi cart thay đổi (đảm bảo không có item đã bị xóa)
  useEffect(() => {
    if (cart && cart.items) {
      setSelectedItems((prev) => 
        prev.filter((id) => cart.items.some((item: CartItem) => item._id === id))
      );
    }
  }, [cart]);

  // Lấy storeId của item
  const getStoreId = (item: CartItem): string => {
    return typeof item.storeId === "string" ? item.storeId : item.storeId._id;
  };

  // Toggle chọn sản phẩm - chỉ cho phép chọn từ 1 cửa hàng
  const toggleSelectItem = (itemId: string) => {
    // ✅ Đảm bảo itemId tồn tại trong cart trước khi toggle
    if (!cart || !cart.items.some((item) => item._id === itemId)) return;
    
    const targetItem = cart.items.find((item) => item._id === itemId);
    if (!targetItem) return;

    const targetStoreId = getStoreId(targetItem);
    
    setSelectedItems((prev) => {
      // Nếu đang bỏ chọn item này
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      }
      
      // Nếu đang chọn item mới
      // Kiểm tra xem đã có item từ cửa hàng khác được chọn chưa
      const selectedItemsFromOtherStores = prev.filter((id) => {
        const item = cart.items.find((i) => i._id === id);
        if (!item) return false;
        const itemStoreId = getStoreId(item);
        return itemStoreId !== targetStoreId;
      });

      // Nếu đã có item từ cửa hàng khác, bỏ chọn tất cả và chỉ chọn item mới
      if (selectedItemsFromOtherStores.length > 0) {
        toast.warning(
          "Chỉ có thể thanh toán sản phẩm từ cùng một cửa hàng. Đã bỏ chọn sản phẩm từ cửa hàng khác.",
          { containerId: "general-toast" }
        );
        // Bỏ chọn tất cả và chỉ chọn item mới
        return [itemId];
      }

      // Nếu chưa có item nào được chọn hoặc tất cả đều từ cùng cửa hàng, thêm item mới
      return [...prev, itemId];
    });
  };

  // Cập nhật số lượng
  const updateQuantity = async (itemId: string, newQty: number) => {
    if (!cart || newQty < 1) return;
    try {
      const res = await cartApi.updateQuantity(itemId, newQty);
      setCart(res.data.cart);
      // ✅ Đảm bảo selectedItems chỉ chứa các item còn tồn tại
      setSelectedItems((prev) => 
        prev.filter((id) => res.data.cart.items?.some((item: CartItem) => item._id === id))
      );
    } catch (err) {
      console.error("Lỗi updateQuantity:", err);
    }
  };

  // Xóa sản phẩm
  const removeItem = async (itemId: string) => {
    if (!cart) return;
    try {
      const res = await cartApi.removeFromCart(itemId);
      const updatedCart = res.data;
      setCart(updatedCart);
      // ✅ Xóa item khỏi selectedItems và đảm bảo chỉ giữ lại các item còn tồn tại
      setSelectedItems((prev) => {
        const filtered = prev.filter((id) => id !== itemId);
        // ✅ Đảm bảo chỉ giữ lại các item còn tồn tại trong cart mới
        return filtered.filter((id) => 
          updatedCart.items?.some((item: CartItem) => item._id === id)
        );
      });
    } catch (err) {
      console.error("Lỗi removeItem:", err);
      toast.error("Không thể xóa sản phẩm khỏi giỏ hàng");
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
      toast.warning(
        "Vui lòng chọn ít nhất 1 sản phẩm để thanh toán",
        { containerId: "general-toast" }
      );
      return;
    }
    
    // Lưu toàn bộ sản phẩm được chọn thay vì chỉ ID
    const selectedProducts = cart?.items.filter((item) =>
      selectedItems.includes(item._id)
    ) || [];
    
    // ✅ Kiểm tra tất cả sản phẩm phải từ cùng 1 cửa hàng
    const storeIds = new Set(selectedProducts.map((item) => getStoreId(item)));
    if (storeIds.size > 1) {
      toast.error(
        "Chỉ có thể thanh toán sản phẩm từ cùng một cửa hàng!",
        { containerId: "general-toast" }
      );
      return;
    }
    
    localStorage.setItem("checkoutItems", JSON.stringify(selectedProducts));
    navigate("/checkout");
  };

  if (loading) {
    return (
      <div className="w-full py-16 flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Loader2 className="w-16 h-16 sm:w-20 sm:h-20 text-[#2F5FEB] animate-spin" />
          </div>
          <p className="text-gray-600 text-base sm:text-lg font-medium">Đang tải giỏ hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-6 sm:py-8 md:py-12 px-4 sm:px-6">
      <div className="mb-6 sm:mb-8 animate-fade-in-down">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 text-[#2F5FEB] flex items-center gap-2 sm:gap-3">
          <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
          <span>Giỏ hàng của tôi</span>
        </h1>
        <p className="text-gray-600 text-sm sm:text-base md:text-lg">
          {cart?.items.length || 0} sản phẩm trong giỏ hàng
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left: Cart Items */}
        <div className="flex-1 space-y-4 sm:space-y-6 animate-fade-in-up delay-200">
          {!cart || cart.items.length === 0 ? (
            <div className="bg-white rounded-xl md:rounded-2xl shadow-lg border-2 border-gray-200 p-8 sm:p-12 text-center animate-fade-in">
              <div className="flex justify-center mb-4 sm:mb-6">
                <ShoppingCart className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-gray-300" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">Giỏ hàng trống</h2>
              <p className="text-gray-500 text-sm sm:text-base mb-6 sm:mb-8">Hãy thêm sản phẩm vào giỏ hàng của bạn</p>
              <button
                onClick={() => navigate("/products")}
                className="px-6 sm:px-8 py-2.5 sm:py-3 bg-[#2F5FEB] text-white rounded-lg md:rounded-xl font-bold text-sm sm:text-base hover:bg-[#244ACC] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 touch-manipulation flex items-center gap-2 mx-auto"
              >
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Mua sắm ngay</span>
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
                  cart={cart}
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
                cart={cart}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
