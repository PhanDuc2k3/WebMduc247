import { Apple, BookOpen, Dumbbell, House, Laptop, Shirt, Sparkles, Tag } from "lucide-react";
import { catalogMockProducts, catalogMockStores } from "../../../mocks/catalogData";
export const heroSlides = [
    { kicker: "Mùa ưu đãi đã đến", title: "Đại tiệc mua sắm MDUC247", description: "Khám phá ưu đãi từ nhiều ngành hàng bạn yêu thích.", image: "https://images.pexels.com/photos/5624999/pexels-photo-5624999.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Máy tính xách tay và hộp quà trong bố cục mua sắm công nghệ", href: "#flash-sale", gradient: "linear-gradient(120deg, #4969d8, #a6a4ed)" },
    { kicker: "Phong cách mỗi ngày", title: "Chọn món đồ bạn yêu", description: "Thêm cảm hứng mới cho phong cách của riêng bạn.", image: "https://images.pexels.com/photos/9327156/pexels-photo-9327156.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Túi xách và giày trên nền sáng", href: "#suggestions", gradient: "linear-gradient(120deg, #6573d9, #c7a5db)" },
    { kicker: "Làm mới không gian", title: "Tiện ích cho tổ ấm", description: "Những lựa chọn nhỏ cho một không gian nhiều niềm vui.", image: "https://images.pexels.com/photos/4816265/pexels-photo-4816265.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Góc bếp tối giản với các thiết bị gia dụng", href: "#suggestions", gradient: "linear-gradient(120deg, #426eae, #9bb9dc)" },
];
export const homeCategories = [
    { name: "Điện tử", value: "electronics", href: "/category/electronics", icon: Laptop, tone: "blue" },
    { name: "Thời trang", value: "fashion", href: "/category/fashion", icon: Shirt, tone: "pink" },
    { name: "Gia dụng", value: "home", href: "/category/home", icon: House, tone: "green" },
    { name: "Làm đẹp", value: "beauty", href: "/category/beauty", icon: Sparkles, tone: "coral" },
    { name: "Thể thao", value: "sports", href: "/category/sports", icon: Dumbbell, tone: "purple" },
    { name: "Thực phẩm", value: "food", href: "/products?category=food", icon: Apple, tone: "yellow" },
    { name: "Sách", value: "books", href: "/products?category=books", icon: BookOpen, tone: "cyan" },
    { name: "Ưu đãi", value: "sale", href: "/products?sale=true", icon: Tag, tone: "navy" },
];
export const demoProducts = catalogMockProducts.map((product) => ({
    _id: product._id,
    name: product.name,
    price: product.price,
    salePrice: product.salePrice,
    images: product.images,
    rating: product.rating,
    reviewsCount: product.reviewsCount,
    soldCount: product.soldCount,
    quantity: product.quantity,
    category: product.category,
    isFeatured: product.isFeatured,
    createdAt: String(product.createdAt),
    demo: true,
}));
export const demoStores = catalogMockStores.map((store) => ({
    _id: store._id,
    name: store.name,
    logoUrl: store.logoUrl,
    category: store.customCategory || store.category,
    rating: store.rating,
    products: store.products,
    demo: true,
}));
