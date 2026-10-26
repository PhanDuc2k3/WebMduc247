import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { catalogMockProducts, catalogMockStores, type CatalogMockProduct } from "./catalogData";

type JsonRecord = Record<string, unknown>;

const now = new Date();
const iso = now.toISOString();
const day = 24 * 60 * 60 * 1000;

export const mockUser = {
  _id: "mock-user-1",
  id: "mock-user-1",
  email: "demo@mduc247.local",
  fullName: "Nguyễn Minh Anh",
  phone: "0987654321",
  role: "buyer",
  avatarUrl: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=300",
  status: "active",
  online: true,
  lastSeen: iso,
  emailNotifications: true,
  isVerified: true,
};

export const mockProducts = catalogMockProducts;
export const mockStores = catalogMockStores;

const mockPromotions = [
  { _id: "promo-1", title: "Đại tiệc mua sắm MDUC247", description: "Ưu đãi cho nhiều sản phẩm nổi bật.", content: "Khám phá ưu đãi theo từng ngành hàng và nhận thêm voucher vận chuyển.", category: "Sale lớn", tags: ["Ưu đãi", "Nổi bật"], imageUrl: "https://images.pexels.com/photos/5868722/pexels-photo-5868722.jpeg?auto=compress&cs=tinysrgb&w=1000", startDate: new Date(now.getTime() - day).toISOString(), endDate: new Date(now.getTime() + 14 * day).toISOString(), views: 12840, isActive: true },
  { _id: "promo-2", title: "Freeship cho thành viên mới", description: "Miễn phí vận chuyển cho đơn hàng đầu tiên.", content: "Đăng nhập và chọn voucher freeship tại trang thanh toán.", category: "Tân thủ", tags: ["Freeship", "Thành viên mới"], imageUrl: "https://images.pexels.com/photos/3943746/pexels-photo-3943746.jpeg?auto=compress&cs=tinysrgb&w=1000", startDate: iso, endDate: new Date(now.getTime() + 30 * day).toISOString(), views: 5210, isActive: true },
];

const mockVouchers = [
  { _id: "voucher-1", code: "WELCOME50", title: "Chào thành viên mới", description: "Giảm tối đa 50.000₫", condition: "Đơn từ 299.000₫", voucherType: "product", discountType: "fixed", discountValue: 50000, minOrderValue: 299000, maxDiscount: 50000, usageLimit: 1000, usedCount: 128, startDate: iso, endDate: new Date(now.getTime() + 30 * day).toISOString(), isActive: true, global: true },
  { _id: "voucher-2", code: "FREESHIP", title: "Miễn phí vận chuyển", description: "Giảm phí vận chuyển tối đa 30.000₫", condition: "Đơn từ 199.000₫", voucherType: "freeship", discountType: "fixed", discountValue: 30000, minOrderValue: 199000, maxDiscount: 30000, usageLimit: 500, usedCount: 75, startDate: iso, endDate: new Date(now.getTime() + 20 * day).toISOString(), isActive: true, global: true },
];

const mockNotifications = [
  { _id: "notification-1", userId: mockUser._id, type: "voucher", title: "Voucher mới dành cho bạn", message: "WELCOME50 đã sẵn sàng trong kho voucher.", isRead: false, link: "/voucher", createdAt: iso },
  { _id: "notification-2", userId: mockUser._id, type: "news", title: "Flash Sale đang diễn ra", message: "Khám phá những sản phẩm đang giảm giá hôm nay.", isRead: true, link: "/flash-sale", createdAt: new Date(now.getTime() - day).toISOString() },
];

const mockTransactions = [
  { _id: "tx-1", type: "deposit", amount: 1000000, method: "vietqr", description: "Nạp tiền vào ví", status: "completed", createdAt: iso },
  { _id: "tx-2", type: "payment", amount: 389000, method: "wallet", orderCode: "ORD-MOCK-001", description: "Thanh toán đơn hàng", status: "completed", createdAt: new Date(now.getTime() - day).toISOString() },
];

const mockAddresses = [{ _id: "address-1", user: mockUser._id, fullName: mockUser.fullName, phone: mockUser.phone, street: "29 Liễu Giai", city: "Hà Nội", country: "Vietnam", isDefault: true, createdAt: iso }];
const mockBanners = [{ _id: "banner-1", title: "MDUC247 Shopping Festival", imageUrl: "https://images.pexels.com/photos/5624999/pexels-photo-5624999.jpeg?auto=compress&cs=tinysrgb&w=1400", type: "main", order: 1 }];
interface MockCartItem extends JsonRecord {
  _id: string;
  productId: string;
  storeId: { _id: string; name: string; logoUrl?: string };
  name: string;
  imageUrl: string;
  price: number;
  salePrice?: number;
  quantity: number;
  subtotal: number;
  variation?: { color?: string; size?: string; additionalPrice?: number; variationId?: string; optionId?: string };
}

const MOCK_CART_KEY = "mduc247_mock_cart";
const cartItemFromProduct = (product: CatalogMockProduct, quantity = 1, variationIndex = 0, optionIndex = 0): MockCartItem => {
  const variations = product.variations as Array<{ _id: string; color: string; options: Array<{ _id: string; name: string; additionalPrice: number }> }>;
  const variation = variations[variationIndex] || variations[0];
  const option = variation.options[optionIndex] || variation.options[0];
  const currentPrice = product.salePrice ?? product.price;
  return {
    _id: `cart-${product._id}-${variation._id}-${option._id}`,
    productId: product._id,
    storeId: { _id: product.store._id, name: product.store.name, logoUrl: product.store.logoUrl },
    name: product.name,
    imageUrl: product.images[0],
    price: product.price,
    salePrice: product.salePrice,
    quantity,
    subtotal: (currentPrice + option.additionalPrice) * quantity,
    variation: { color: variation.color, size: option.name, additionalPrice: option.additionalPrice, variationId: variation._id, optionId: option._id },
  };
};

const defaultCartItems = (): MockCartItem[] => [cartItemFromProduct(mockProducts[0], 1), cartItemFromProduct(mockProducts[1], 1, 1, 0)];
const readCartItems = (): MockCartItem[] => {
  try {
    const saved = localStorage.getItem(MOCK_CART_KEY);
    if (saved) return JSON.parse(saved) as MockCartItem[];
  } catch { /* localStorage không khả dụng */ }
  const items = defaultCartItems();
  try { localStorage.setItem(MOCK_CART_KEY, JSON.stringify(items)); } catch { /* localStorage không khả dụng */ }
  return items;
};
const writeCartItems = (items: MockCartItem[]) => {
  try { localStorage.setItem(MOCK_CART_KEY, JSON.stringify(items)); } catch { /* localStorage không khả dụng */ }
};
const buildCart = (items = readCartItems()) => {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  return { _id: "mock-cart-1", userId: mockUser._id, items, subtotal, total: subtotal };
};

const parseBody = (data: unknown): JsonRecord => {
  if (typeof data === "string") {
    try { return JSON.parse(data) as JsonRecord; } catch { return {}; }
  }
  return typeof data === "object" && data !== null ? data as JsonRecord : {};
};

const makeToken = () => `mock.${btoa(JSON.stringify({ userId: mockUser._id, role: mockUser.role, exp: Math.floor(Date.now() / 1000) + 86400 }))}.signature`;
const chart = () => Array.from({ length: 7 }, (_, index) => ({ date: new Date(now.getTime() - (6 - index) * day).toISOString().slice(0, 10), count: 8 + index * 3 }));

const response = <T,>(config: InternalAxiosRequestConfig, data: T, status = 200): AxiosResponse<T> => ({ data, status, statusText: status === 201 ? "Created" : "OK", headers: {}, config });

export const mockAdapter: AxiosAdapter = async (config) => {
  await new Promise((resolve) => setTimeout(resolve, 120));
  const url = new URL(config.url || "/", "http://mock.local");
  const path = url.pathname;
  const method = (config.method || "get").toLowerCase();
  const body = parseBody(config.data);
  const params = (config.params || {}) as Record<string, string>;

  if (path === "/api/users/login" && method === "post") return response(config, { message: "Đăng nhập mock thành công", token: makeToken(), refreshToken: "mock-refresh-token", user: mockUser });
  if (path === "/api/users/register" && method === "post") return response(config, { message: "Đăng ký mock thành công", email: body.email || mockUser.email }, 201);
  if (path === "/api/users/profile") return response(config, { user: mockUser, store: null });
  if (path === "/api/users/all") return response(config, { users: [mockUser, { ...mockUser, _id: "seller-1", email: "seller@mduc247.local", fullName: "Trần Quốc Việt", role: "seller" }] });
  if (path === "/api/users/seller-requests") return response(config, { requests: [] });
  if (path.startsWith("/api/users/") && method === "get") return response(config, { user: mockUser });
  if (path.startsWith("/api/users/")) return response(config, { message: "Thao tác tài khoản mock thành công", user: mockUser });

  if (path === "/api/products/search") {
    const keyword = (url.searchParams.get("keyword") || "").toLowerCase();
    const products = mockProducts.filter((item) =>
      `${item.name} ${item.brand} ${item.category} ${item.subCategory}`.toLowerCase().includes(keyword));
    const limit = Math.max(1, Number(url.searchParams.get("limit")) || products.length);
    return response(config, { products: products.slice(0, limit), total: products.length });
  }
  if (path === "/api/products/featured") return response(config, mockProducts.filter((item) => item.isFeatured).slice(0, 8));
  if (path === "/api/products/sale") return response(config, mockProducts.filter((item) => item.salePrice && item.salePrice < item.price).slice(0, Math.max(1, Number(url.searchParams.get("limit")) || 5)));
  if (path === "/api/products/count-by-category") return response(config, mockProducts.reduce<Record<string, number>>((counts, item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
    return counts;
  }, {}));
  if (path === "/api/products/views-stats") return response(config, chart());
  if (/^\/api\/products\/store\/[^/]+\/products$/.test(path)) {
    const storeId = path.split("/")[4];
    return response(config, { products: mockProducts.filter((item) => item.store._id === storeId) });
  }
  if ((path === "/api/products" || path === "/api/products/my-products") && method === "get") {
    const category = String(params.category || url.searchParams.get("category") || "").toLowerCase();
    const products = category ? mockProducts.filter((item) => String(item.category).toLowerCase() === category) : mockProducts;
    const limit = Math.max(1, Number(params.limit || url.searchParams.get("limit")) || products.length);
    const page = Math.max(1, Number(params.page || url.searchParams.get("page")) || 1);
    const pageItems = products.slice((page - 1) * limit, page * limit);
    return response(config, { data: pageItems, products: pageItems, total: products.length, pagination: { page, pages: Math.ceil(products.length / limit), total: products.length } });
  }
  if (/^\/api\/products\/[^/]+$/.test(path) && method === "get") {
    const product = mockProducts.find((item) => item._id === path.split("/").pop()) || mockProducts[0];
    return response(config, { ...product, data: product, product });
  }
  if (path.startsWith("/api/products")) return response(config, { message: "Thao tác sản phẩm mock thành công", product: mockProducts[0] });

  if (path === "/api/stores/search") {
    const keyword = (url.searchParams.get("keyword") || "").toLowerCase();
    const stores = mockStores.filter((item) => `${item.name} ${item.customCategory || ""} ${item.storeAddress}`.toLowerCase().includes(keyword));
    const limit = Math.max(1, Number(url.searchParams.get("limit")) || stores.length);
    return response(config, { stores: stores.slice(0, limit), total: stores.length });
  }
  if (path === "/api/stores" && method === "get") return response(config, { stores: mockStores });
  if (path === "/api/stores/me" || path === "/api/stores/owner") return response(config, { ...mockStores[0], store: mockStores[0] });
  if (/^\/api\/stores\/[^/]+$/.test(path) && method === "get") {
    const store = mockStores.find((item) => item._id === path.split("/").pop()) || mockStores[0];
    return response(config, { ...store, store });
  }
  if (path.includes("/categories") && method === "get") {
    const storeId = path.split("/")[3];
    const storeProducts = mockProducts.filter((item) => item.store._id === storeId);
    const categories = [...new Set(storeProducts.map((item) => item.subCategory))].map((name, index) => ({
      _id: `category-${storeId}-${index}`,
      name,
      products: storeProducts.filter((item) => item.subCategory === name).map((item) => item._id),
    }));
    const categoryId = path.split("/")[5];
    const selected = categories.find((item) => item._id === categoryId);
    const products = selected ? storeProducts.filter((item) => selected.products.includes(item._id)) : storeProducts;
    return response(config, { categories, products });
  }
  if (path.startsWith("/api/stores")) return response(config, { message: "Thao tác cửa hàng mock thành công", store: mockStores[0] });

  if (path === "/api/promotions" && method === "get") {
    const category = String(params.category || "");
    return response(config, category ? mockPromotions.filter((item) => item.category === category) : mockPromotions);
  }
  if (/^\/api\/promotions\/[^/]+$/.test(path) && method === "get") return response(config, mockPromotions.find((item) => item._id === path.split("/").pop()) || mockPromotions[0]);
  if (path.startsWith("/api/promotions")) return response(config, { message: "Thao tác khuyến mãi mock thành công", promotion: mockPromotions[0], views: 12841 });

  if ((path === "/api/banner" || path.startsWith("/api/banner/type/")) && method === "get") return response(config, mockBanners);
  if (path.startsWith("/api/banner")) return response(config, { message: "Thao tác banner mock thành công", banner: mockBanners[0] });

  if (path === "/api/cart" && method === "get") return response(config, buildCart());
  if (path === "/api/cart/add" && method === "post") {
    const product = mockProducts.find((item) => item._id === body.productId) || mockProducts[0];
    const variations = product.variations as Array<{ _id: string; options: Array<{ _id: string }> }>;
    const variationIndex = Math.max(0, variations.findIndex((item) => item._id === body.variationId));
    const optionIndex = Math.max(0, variations[variationIndex].options.findIndex((item) => item._id === body.optionId));
    const incoming = cartItemFromProduct(product, Number(body.quantity) || 1, variationIndex, optionIndex);
    const items = readCartItems();
    const existing = items.find((item) => item._id === incoming._id);
    if (existing) {
      existing.quantity += incoming.quantity;
      existing.subtotal = (existing.salePrice ?? existing.price) * existing.quantity + (existing.variation?.additionalPrice || 0) * existing.quantity;
    } else items.push(incoming);
    writeCartItems(items);
    return response(config, { message: "Đã thêm sản phẩm vào giỏ mock", cart: buildCart(items) });
  }
  if (path === "/api/cart/update" && method === "put") {
    const items = readCartItems();
    const item = items.find((cartItem) => cartItem._id === body.itemId);
    if (item) {
      item.quantity = Math.max(1, Number(body.quantity) || 1);
      item.subtotal = ((item.salePrice ?? item.price) + (item.variation?.additionalPrice || 0)) * item.quantity;
    }
    writeCartItems(items);
    return response(config, { message: "Đã cập nhật số lượng mock", cart: buildCart(items) });
  }
  if (/^\/api\/cart\/[^/]+$/.test(path) && method === "delete") {
    const itemId = path.split("/").pop();
    const items = readCartItems().filter((item) => item._id !== itemId);
    writeCartItems(items);
    return response(config, buildCart(items));
  }
  if (path.startsWith("/api/cart")) return response(config, { message: "Giỏ hàng mock đã cập nhật", cart: buildCart() });

  if ((path === "/api/vouchers" || path === "/api/vouchers/all" || path === "/api/vouchers/my-store") && method === "get") return response(config, mockVouchers);
  if (path === "/api/vouchers/checkout") return response(config, { productVouchers: mockVouchers.filter((item) => item.voucherType === "product"), freeshipVouchers: mockVouchers.filter((item) => item.voucherType === "freeship"), storeVouchers: [] });
  if (path.startsWith("/api/vouchers")) return response(config, { message: "Voucher mock hợp lệ", voucher: mockVouchers[0], discount: 50000, shippingDiscount: 0, finalTotal: 349000 });

  if (path === "/api/address" && method === "get") return response(config, mockAddresses);
  if (/^\/api\/address\/[^/]+$/.test(path) && method === "get") return response(config, mockAddresses[0]);
  if (path.startsWith("/api/address")) return response(config, { ...mockAddresses[0], ...body, message: "Địa chỉ mock đã cập nhật" });

  if (path === "/api/wallet") return response(config, { wallet: { _id: "wallet-1", userId: mockUser._id, balance: 1611000, transactionCount: mockTransactions.length } });
  if (path === "/api/wallet/transactions") return response(config, { transactions: mockTransactions, total: mockTransactions.length, page: 1, totalPages: 1 });
  if (path.startsWith("/api/wallet")) return response(config, { message: "Thao tác ví mock thành công", wallet: { balance: 1611000, transaction: mockTransactions[0] }, order: { orderCode: "ORD-MOCK-001", paymentStatus: "paid" } });

  if (path === "/api/notifications/unread-count") return response(config, { count: mockNotifications.filter((item) => !item.isRead).length });
  if (path === "/api/notifications" && method === "get") return response(config, { notifications: mockNotifications, total: mockNotifications.length });
  if (path.startsWith("/api/notifications")) return response(config, { message: "Thông báo mock đã cập nhật" });

  if (path.includes("/favorites/check/")) return response(config, { isFavorite: false });
  if (path.includes("/favorites/count/")) return response(config, { count: 24 });
  if (path === "/api/favorites/my") return response(config, { products: mockProducts.slice(0, 3), stores: mockStores.slice(0, 2), favorites: [] });
  if (path.startsWith("/api/favorites")) return response(config, { message: "Danh sách yêu thích mock đã cập nhật" });

  if (path.startsWith("/api/messages/conversations/")) return response(config, []);
  if (path === "/api/messages/conversation") return response(config, { conversation: { _id: "conversation-1", participants: [mockUser._id, "seller-1"], lastMessage: "Xin chào từ dữ liệu mock", updatedAt: iso } });
  if (/^\/api\/messages\/[^/]+$/.test(path) && method === "get") return response(config, []);
  if (path.startsWith("/api/messages")) return response(config, { message: "Tin nhắn mock đã gửi", data: { _id: `message-${Date.now()}`, text: body.text || "Tin nhắn mock", sender: mockUser._id, createdAt: iso } });

  const mockOrder = { _id: "order-1", orderCode: "ORD-MOCK-001", userId: mockUser._id, userInfo: mockUser, items: [{ productId: mockProducts[0], storeId: mockStores[0]._id, name: mockProducts[0].name, imageUrl: mockProducts[0].images[0], price: mockProducts[0].price, salePrice: mockProducts[0].salePrice, quantity: 1, subtotal: 389000 }], shippingAddress: { fullName: mockUser.fullName, phone: mockUser.phone, address: "29 Liễu Giai, Hà Nội" }, paymentInfo: { method: "COD", status: "pending" }, statusHistory: [{ status: "confirmed", note: "Đơn hàng mock đã xác nhận", timestamp: iso }], subtotal: 389000, shippingFee: 30000, platformFee: 38900, discount: 50000, total: 407900, createdAt: iso };
  if ((path === "/api/orders/my" || path === "/api/orders/seller" || path === "/api/orders") && method === "get") return response(config, [mockOrder]);
  if (path.startsWith("/api/orders/by-code/") || /^\/api\/orders\/[^/]+$/.test(path)) return response(config, mockOrder);
  if (path.startsWith("/api/orders")) return response(config, { message: "Đơn hàng mock đã cập nhật", order: mockOrder, cart: buildCart() });

  if (path.startsWith("/api/review/product/")) return response(config, [{ _id: "review-1", productId: mockProducts[0]._id, orderId: mockOrder._id, userId: mockUser._id, userInfo: { fullName: mockUser.fullName, avatarUrl: mockUser.avatarUrl }, rating: 5, comment: "Sản phẩm mock rất tốt", images: [], createdAt: iso }]);
  if (path.startsWith("/api/review")) return response(config, { message: "Đánh giá mock đã lưu", review: { _id: "review-1", rating: 5, comment: "Sản phẩm mock rất tốt" } });

  if (path === "/api/admin/statistics/stats") return response(config, { totalUsers: mockStores.length + 1, totalOrders: 1, totalStores: mockStores.length, totalProducts: mockProducts.length, totalVouchers: mockVouchers.length });
  if (path.startsWith("/api/admin/statistics/charts/")) return response(config, chart());
  if (path.startsWith("/api/statistics/")) return response(config, path.endsWith("top-products") ? mockProducts.slice(0, 5) : chart());

  if (path.startsWith("/api/payment")) return response(config, { message: "Thanh toán mock đã được tạo", payUrl: "/payment-success?mock=true", qrCode: "https://img.vietqr.io/image/970422-0000000000-compact2.png?amount=100000", orderId: "order-1" });

  return response(config, { message: `Mock response: ${method.toUpperCase()} ${path}` });
};

export const mockChatResponse = (message: string) => ({ reply: `Mình đang chạy ở chế độ mock. Bạn vừa hỏi: “${message}”. Hãy thử xem các sản phẩm nổi bật bên dưới nhé!`, products: mockProducts.slice(0, 3), stores: mockStores.slice(0, 2) });
