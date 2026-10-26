import { Dumbbell, House, Laptop, Shirt, Smartphone, Sparkles } from "lucide-react";
export const categoryPages = {
    phone: {
        slug: "phone", apiCategory: "electronics", eyebrow: "Kết nối mọi khoảnh khắc", title: "Điện thoại & Phụ kiện", description: "Khám phá smartphone, tai nghe, sạc và phụ kiện giúp bạn kết nối theo cách riêng.",
        image: "/category/phone-banner.png", imageAlt: "Điện thoại và tai nghe không dây", tone: "blue", icon: Smartphone,
        subcategories: ["Điện thoại", "Ốp lưng", "Tai nghe", "Sạc & Cáp", "Pin dự phòng", "Thiết bị đeo"], promoTitle: "Nâng cấp thiết bị, mở rộng trải nghiệm", promoDescription: "Khám phá tai nghe và phụ kiện đang bán từ các gian hàng công nghệ.",
    },
    electronics: {
        slug: "electronics", apiCategory: "electronics", eyebrow: "Công nghệ cho cuộc sống", title: "Điện tử & Công nghệ", description: "Thiết bị thông minh cho công việc, giải trí và không gian sống hiện đại.",
        image: "/home/shopping-hero.png", imageAlt: "Laptop và hộp quà công nghệ", tone: "cyan", icon: Laptop,
        subcategories: ["Laptop", "Máy tính bảng", "Âm thanh", "Màn hình", "Bàn phím", "Thiết bị mạng"], promoTitle: "Góc làm việc thông minh hơn", promoDescription: "Kết hợp thiết bị hiệu quả để học tập, sáng tạo và làm việc liền mạch.",
    },
    fashion: {
        slug: "fashion", apiCategory: "fashion", eyebrow: "Phong cách của riêng bạn", title: "Thời trang", description: "Làm mới tủ đồ với những thiết kế dễ mặc, hiện đại và đầy cảm hứng.",
        image: "/home/fashion-hero.png", imageAlt: "Túi tote vải canvas", tone: "purple", icon: Shirt,
        subcategories: ["Thời trang nữ", "Thời trang nam", "Giày dép", "Túi xách", "Phụ kiện", "Đồng hồ"], promoTitle: "Phối đồ mới cho mỗi ngày", promoDescription: "Khám phá các gợi ý dễ phối và sản phẩm đang được yêu thích.",
    },
    home: {
        slug: "home", apiCategory: "home", eyebrow: "Chăm chút tổ ấm", title: "Nhà cửa & Đời sống", description: "Những sản phẩm tiện nghi giúp căn nhà gọn gàng, ấm áp và nhiều cảm hứng hơn.",
        image: "/home/home-hero.png", imageAlt: "Đèn bàn LED", tone: "cyan", icon: House,
        subcategories: ["Đồ gia dụng", "Nhà bếp", "Trang trí", "Nội thất", "Chăn ga", "Dọn dẹp"], promoTitle: "Tiện ích nhỏ, thay đổi lớn", promoDescription: "Lựa chọn thông minh để tiết kiệm thời gian và tận hưởng căn nhà của bạn.",
    },
    beauty: {
        slug: "beauty", apiCategory: "beauty", eyebrow: "Rạng rỡ mỗi ngày", title: "Làm đẹp", description: "Chăm sóc bản thân với sản phẩm làm đẹp, dưỡng da và chăm sóc cá nhân được yêu thích.",
        image: "https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg?auto=compress&cs=tinysrgb&w=1100", imageAlt: "Sản phẩm mỹ phẩm và chăm sóc da", tone: "coral", icon: Sparkles,
        subcategories: ["Chăm sóc da", "Trang điểm", "Nước hoa", "Chăm sóc tóc", "Cơ thể", "Dụng cụ làm đẹp"], promoTitle: "Chu trình chăm sóc dành cho bạn", promoDescription: "Tìm sản phẩm phù hợp cho từng bước trong thói quen làm đẹp hằng ngày.",
    },
    sports: {
        slug: "sports", apiCategory: "sports", eyebrow: "Chuyển động tích cực", title: "Thể thao", description: "Trang phục, phụ kiện và thiết bị giúp bạn duy trì năng lượng mỗi ngày.",
        image: "https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=1100", imageAlt: "Người tập luyện thể thao", tone: "blue", icon: Dumbbell,
        subcategories: ["Gym & Fitness", "Chạy bộ", "Đạp xe", "Dã ngoại", "Thể thao đồng đội", "Phụ kiện"], promoTitle: "Sẵn sàng cho mục tiêu mới", promoDescription: "Trang bị phù hợp để mỗi buổi tập thoải mái và hiệu quả hơn.",
    },
};
