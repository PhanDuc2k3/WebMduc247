import React, { useEffect, useState } from "react";
import { ArrowLeft, CheckSquare2, Loader2, RotateCcw, ShieldCheck, ShoppingBag, ShoppingCart, Star, TicketPercent, Trash2, Truck } from "lucide-react";
import CartStoreGroup from "../../components/Cart/CartStoreGroup/CartStoreGroup";
import OrderSummary from "../../components/Cart/OrderSummary/OrderSummary";
import { useNavigate } from "react-router-dom";
import cartApi from "../../api/cartApi"; // ✅ dùng axiosClient
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Cart.css";
import productApi from "../../api/productApi";
import { showImageFallback } from "../../utils/imageFallback";

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

interface CartGroup {
  store: { _id?: string; name: string; logoUrl?: string };
  items: CartItem[];
}

interface RecommendedProduct {
  _id: string;
  name: string;
  price: number;
  salePrice?: number;
  images?: string[];
  rating?: number;
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [recommended, setRecommended] = useState<RecommendedProduct[]>([]);
  const navigate = useNavigate();

  // Lấy giỏ hàng
  const fetchCart = async () => {
    try {
      const res = await cartApi.getCart();
      setCart(res.data);
      setSelectedItems(res.data.items?.map((item: CartItem) => item._id) || []);
    } catch (err) {
      console.error("Lỗi khi lấy giỏ hàng:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
    productApi.getRecommendedProducts().then((res) => {
      const payload = res.data as { data?: RecommendedProduct[]; products?: RecommendedProduct[] } | RecommendedProduct[];
      const products = Array.isArray(payload) ? payload : payload.data || payload.products || [];
      setRecommended(products.slice(0, 4));
    }).catch(() => setRecommended([]));
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

  // Gom sản phẩm theo store
  const groupedByStore = cart?.items.reduce<Record<string, CartGroup>>((acc, item) => {
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
  const allSelected = Boolean(cart?.items.length) && selectedItems.length === cart?.items.length;
  const selectedSubtotal = cart?.items.reduce((sum, item) => selectedItems.includes(item._id) ? sum + item.subtotal : sum, 0) || 0;
  const discount = appliedCoupon === "MDUC10" ? Math.round(selectedSubtotal * 0.1) : appliedCoupon === "MDUC50" ? Math.min(50000, selectedSubtotal) : 0;

  const toggleSelectAll = () => setSelectedItems(allSelected ? [] : cart?.items.map((item) => item._id) || []);
  const removeSelected = async () => {
    if (!selectedItems.length) return;
    for (const itemId of selectedItems) await cartApi.removeFromCart(itemId);
    await fetchCart();
  };
  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!["MDUC10", "MDUC50"].includes(code)) {
      toast.error("Mã giảm giá không hợp lệ", { containerId: "general-toast" });
      return;
    }
    setAppliedCoupon(code);
    toast.success(`Đã áp dụng mã ${code}`, { containerId: "general-toast" });
  };

  if (loading) {
    return (
      <div className="w-full py-16 flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Loader2 className="w-16 h-16 sm:w-20 sm:h-20 text-[#4B5563] animate-spin" />
          </div>
          <p className="text-gray-600 text-base sm:text-lg font-medium">Đang tải giỏ hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-page__header animate-fade-in-down">
        <nav className="cart-page__breadcrumb"><button type="button" onClick={() => navigate("/")}>Trang chủ</button><span>/</span><strong>Giỏ hàng</strong></nav>
      </div>

      <div className="cart-page__layout">
        {/* Left: Cart Items */}
        <div className="cart-page__list animate-fade-in-up delay-200">
          {cart && cart.items.length > 0 && <div className="cart-page__toolbar"><button type="button" onClick={toggleSelectAll}><CheckSquare2 /> <strong>{allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}</strong><span>({selectedItems.length} đã chọn)</span></button><div><button type="button" className="is-danger" onClick={removeSelected} disabled={!selectedItems.length}><Trash2 /> Xóa sản phẩm đã chọn</button><button type="button" onClick={() => navigate("/products")}><ArrowLeft /> Tiếp tục mua sắm</button></div></div>}
          {!cart || cart.items.length === 0 ? (
            <div className="cart-page__empty animate-fade-in">
              <div className="flex justify-center mb-4 sm:mb-6">
                <ShoppingCart className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-gray-300" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">Giỏ hàng trống</h2>
              <p className="text-gray-500 text-sm sm:text-base mb-6 sm:mb-8">Hãy thêm sản phẩm vào giỏ hàng của bạn</p>
              <button
                onClick={() => navigate("/products")}
                className="px-6 sm:px-8 py-2.5 sm:py-3 bg-[#4B5563] text-white rounded-lg md:rounded-xl font-bold text-sm sm:text-base hover:bg-[#374151] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 touch-manipulation flex items-center gap-2 mx-auto"
              >
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Mua sắm ngay</span>
              </button>
            </div>
          ) : (
            Object.entries(groupedByStore || {}).map(([storeId, group], index) => (
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

          {cart && cart.items.length > 0 && <section className="cart-coupon"><h2><TicketPercent /> Mã giảm giá</h2><div className="cart-coupon__form"><input value={couponInput} onChange={(event) => setCouponInput(event.target.value)} placeholder="NHẬP MÃ GIẢM GIÁ" /><button type="button" onClick={applyCoupon}>Áp dụng</button></div><div className="cart-coupon__suggestions"><span>Thử mã:</span>{["MDUC10", "MDUC50"].map((code) => <button type="button" key={code} onClick={() => setCouponInput(code)}>{code}</button>)}</div>{appliedCoupon && <p>Mã {appliedCoupon} đã được áp dụng cho đơn hàng.</p>}</section>}

          <section className="cart-benefits"><article><Truck /><span><strong>Phí vận chuyển rõ ràng</strong><small>Kiểm tra trước khi đặt hàng</small></span></article><article><ShieldCheck /><span><strong>Thanh toán an toàn</strong><small>An tâm trong từng bước</small></span></article><article><RotateCcw /><span><strong>Hỗ trợ đổi trả</strong><small>Xem điều kiện tại trung tâm trợ giúp</small></span></article></section>
        </div>

        {/* Right: Order Summary - Sticky */}
        {cart && cart.items.length > 0 && (
          <aside className="cart-page__aside animate-fade-in-right delay-300">
            <div className="sticky top-[150px]">
              <OrderSummary
                selectedItems={selectedItems}
                cart={cart}
                discount={discount}
              />
            </div>
          </aside>
        )}
      </div>

      {recommended.length > 0 && <section className="cart-recommendations"><header><h2>Có thể bạn cũng thích</h2><span>Khám phá thêm từ MDUC247</span></header><div>{recommended.map((product) => <button type="button" key={product._id} onClick={() => navigate(`/products/${product._id}`)}><img src={product.images?.[0] || "/visual-placeholder.svg"} alt={product.name} onError={showImageFallback} /><span><strong>{product.name}</strong><em>{(product.salePrice || product.price).toLocaleString("vi-VN")}₫</em><small><Star /> {typeof product.rating === "number" ? product.rating.toFixed(1) : "Chưa có đánh giá"}</small></span></button>)}</div></section>}
    </div>
  );
}
