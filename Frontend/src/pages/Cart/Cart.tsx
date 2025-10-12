import React, { useEffect, useState } from "react";
import CartStoreGroup from "../../components/Cart/CartStoreGroup/CartStoreGroup";
import OrderSummary from "../../components/Cart/OrderSummary/OrderSummary";
import { useNavigate } from "react-router-dom";
import cartApi from "../../api/cartApi"; // ✅ dùng axiosClient

interface CartItem {
  _id: string;
  productId: string;
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
  discount: number;
  shippingFee: number;
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
    localStorage.setItem("checkoutItems", JSON.stringify(selectedItems));
    navigate("/checkout");
  };

  if (loading) return <div className="p-6">Đang tải giỏ hàng...</div>;

  return (
    <div className="bg-gray-100 min-h-screen py-8 font-sans">
      <div className="max-w-6xl mx-auto flex gap-6">
        {/* Left: Cart Items */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Giỏ hàng</h1>
            <span>{cart?.items.length || 0} sản phẩm</span>
          </div>

          <div className="space-y-6">
            {!cart || cart.items.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-gray-600">Giỏ hàng trống</div>
            ) : (
              Object.entries(groupedByStore || {}).map(([storeId, group]: any) => (
                <CartStoreGroup
                  key={storeId}
                  store={group.store}
                  items={group.items}
                  selectedItems={selectedItems}
                  onSelect={toggleSelectItem}
                  onUpdateQty={updateQuantity}
                  onRemove={removeItem}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="w-[350px] space-y-4">
          {cart && (
            <>
<OrderSummary
  subtotal={selectedTotal}
  discount={0}
  shippingFee={cart.shippingFee ?? 0} // fallback
  total={selectedTotal + (cart.shippingFee ?? 0)} // fallback
  selectedItems={selectedItems}
/>


            </>
          )}
        </div>
      </div>
    </div>
  );
}
