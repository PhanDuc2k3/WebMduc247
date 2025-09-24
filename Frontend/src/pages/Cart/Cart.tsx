import React, { useEffect, useState } from "react";
import CartStoreGroup from "../../components/Cart/CartStoreGroup/CartStoreGroup";
import VoucherBox from "../../components/Cart/VoucherBox/VoucherBox";
import OrderSummary from "../../components/Cart/OrderSummary/OrderSummary";

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
  couponCode?: string;
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [tempDiscount, setTempDiscount] = useState(0);
  const [voucherCode, setVoucherCode] = useState("");

  // Lấy giỏ hàng
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/cart", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!res.ok) throw new Error("Không thể lấy giỏ hàng");
        const data: Cart = await res.json();
        setCart(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCart();
  }, []);

  // Toggle chọn sản phẩm
  const toggleSelectItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // Update số lượng
  const updateQuantity = async (itemId: string, newQty: number) => {
    if (!cart || newQty < 1) return;
    try {
      const res = await fetch("http://localhost:5000/api/cart/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ itemId, quantity: newQty }),
      });
      if (!res.ok) throw new Error("Lỗi khi cập nhật số lượng");
      const data: Cart = await res.json();
      setCart(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Xóa sản phẩm
  const removeItem = async (itemId: string) => {
    if (!cart) return;
    try {
      const res = await fetch(`http://localhost:5000/api/cart/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) throw new Error("Lỗi khi xóa sản phẩm");
      const data: Cart = await res.json();
      setCart(data);
      setSelectedItems((prev) => prev.filter((id) => id !== itemId));
    } catch (err) {
      console.error(err);
    }
  };

  // Tính tổng sản phẩm được chọn
  const selectedTotal =
    cart?.items.reduce((sum, i) => (selectedItems.includes(i._id) ? sum + i.subtotal : sum), 0) || 0;

  // Preview voucher (tạm thời)
  const handlePreviewVoucher = (discount: number, code: string) => {
    setTempDiscount(discount);
    setVoucherCode(code);
  };

  // Thanh toán / apply voucher thật sự
  const handleCheckout = async () => {
    if (!voucherCode || !cart) {
      alert("Vui lòng chọn voucher trước khi thanh toán!");
      return;
    }
    try {
      const res = await fetch("http://localhost:5000/api/cart/apply-voucher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ code: voucherCode, items: selectedItems }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCart(data.cart);
      alert("✅ Voucher đã áp dụng thành công khi thanh toán!");
      setTempDiscount(0);
      setVoucherCode("");
    } catch (err) {
      console.error(err);
      alert("❌ " + (err as Error).message);
    }
  };

  if (loading) return <div className="p-6">Đang tải giỏ hàng...</div>;

  // Gom theo store
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
              <div className="bg-white rounded-lg shadow p-6 text-gray-600">
                Giỏ hàng trống
              </div>
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

        {/* Right: Voucher + Order Summary */}
        <div className="w-[350px] space-y-4">
          {cart && (
            <>
<VoucherBox 
  subtotal={selectedTotal} 
  onPreview={handlePreviewVoucher} 
/>

              <OrderSummary
                subtotal={selectedTotal}
                discount={tempDiscount}
                shippingFee={cart.shippingFee}
                total={selectedTotal - tempDiscount + cart.shippingFee}
              />


            </>
          )}
        </div>
      </div>
    </div>
  );
}
