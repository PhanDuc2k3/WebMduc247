const photoUrl = (photo, width = 900) => photo.startsWith("/") ? photo : `https://images.pexels.com/photos/${photo}/pexels-photo-${photo}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
const storeSeeds = [
    { _id: "store-nova", name: "Nova Tech", description: "Thiết bị công nghệ và phụ kiện cho công việc mỗi ngày.", storeAddress: "Ba Đình, Hà Nội", category: "electronics", customCategory: "Điện tử", rating: 4.9, photo: "8858287", banner: "/macbook.jfif" },
    { _id: "store-pixel", name: "Pixel Hub", description: "Không gian dành cho người yêu máy tính và thiết bị số.", storeAddress: "Đà Nẵng", category: "electronics", customCategory: "Điện tử", rating: 4.7, photo: "17895080", banner: "5624999" },
    { _id: "store-may", name: "Mây Studio", description: "Thời trang tối giản, dễ phối cho mọi ngày.", storeAddress: "Quận 1, TP. Hồ Chí Minh", category: "fashion", customCategory: "Thời trang", rating: 4.8, photo: "9327156", banner: "994523" },
    { _id: "store-urban", name: "Urban Mode", description: "Giày, túi và trang phục mang cảm hứng thành thị.", storeAddress: "Cần Thơ", category: "fashion", customCategory: "Thời trang", rating: 4.6, photo: "27204251", banner: "9327156" },
    { _id: "store-home", name: "Mộc Home", description: "Đồ gia dụng và trang trí cho tổ ấm.", storeAddress: "Long Biên, Hà Nội", category: "home", customCategory: "Gia dụng", rating: 4.7, photo: "7439754", banner: "1643383" },
    { _id: "store-kitchen", name: "Bếp Nhà", description: "Dụng cụ bếp gọn gàng cho những bữa ăn vui.", storeAddress: "Huế", category: "home", customCategory: "Gia dụng", rating: 4.8, photo: "27861734", banner: "4816265" },
    { _id: "store-lumi", name: "Lumi Beauty", description: "Chăm sóc da và làm đẹp theo thói quen của bạn.", storeAddress: "Hải Châu, Đà Nẵng", category: "other", customCategory: "Mỹ phẩm", rating: 4.9, photo: "8101534", banner: "3373736" },
    { _id: "store-trek", name: "Trek & Go", description: "Phụ kiện vận động và đồ dùng cho chuyến đi.", storeAddress: "Quận 3, TP. Hồ Chí Minh", category: "other", customCategory: "Thể thao", rating: 4.8, photo: "30469934", banner: "2529148" },
    { _id: "store-fresh", name: "Fresh Market", description: "Thực phẩm đóng gói và thức uống dùng hằng ngày.", storeAddress: "Ninh Kiều, Cần Thơ", category: "other", customCategory: "Thực phẩm", rating: 4.7, photo: "302899", banner: "4816265" },
    { _id: "store-books", name: "Sách Mở", description: "Sách và sổ tay cho những giờ đọc thư thái.", storeAddress: "Ba Đình, Hà Nội", category: "books", customCategory: "Sách", rating: 4.9, photo: "159711", banner: "256541" },
];
const productSeeds = [
    { id: "p-earbuds", name: "Tai nghe Bluetooth Air Mini", price: 599000, salePrice: 389000, category: "electronics", subCategory: "Âm thanh", storeId: "store-nova", brand: "Nova", photo: "7417547" },
    { id: "p-watch", name: "Đồng hồ thông minh Active", price: 899000, salePrice: 599000, category: "electronics", subCategory: "Thiết bị đeo", storeId: "store-nova", brand: "Nova", photo: "3646165" },
    { id: "p-keyboard", name: "Bàn phím cơ RGB Compact", price: 1090000, salePrice: 899000, category: "electronics", subCategory: "Phụ kiện máy tính", storeId: "store-pixel", brand: "Pixel", photo: "17895080" },
    { id: "p-speaker", name: "Loa Bluetooth Mini Beat", price: 529000, salePrice: 429000, category: "electronics", subCategory: "Âm thanh", storeId: "store-nova", brand: "Nova", photo: "11764413" },
    { id: "p-headphones", name: "Tai nghe chụp tai Wave Pro", price: 1290000, salePrice: 1090000, category: "electronics", subCategory: "Âm thanh", storeId: "store-pixel", brand: "Pixel", photo: "8858287" },
    { id: "p-laptop", name: "Laptop văn phòng UrbanBook 14", price: 15990000, salePrice: 14490000, category: "electronics", subCategory: "Laptop", storeId: "store-pixel", brand: "UrbanBook", photo: "/macbook.jfif" },
    { id: "p-webcam", name: "Webcam họp trực tuyến ClearView", price: 790000, category: "electronics", subCategory: "Phụ kiện máy tính", storeId: "store-pixel", brand: "Pixel", photo: "5624999" },
    { id: "p-mouse", name: "Chuột không dây Silent Click", price: 390000, salePrice: 319000, category: "electronics", subCategory: "Phụ kiện máy tính", storeId: "store-nova", brand: "Nova", photo: "17895080" },
    { id: "p-monitor", name: "Màn hình 24 inch sắc nét", price: 3290000, salePrice: 2990000, category: "electronics", subCategory: "Màn hình", storeId: "store-pixel", brand: "Pixel", photo: "/visual-placeholder.svg" },
    { id: "p-charger", name: "Sạc nhanh USB-C 65W", price: 490000, category: "electronics", subCategory: "Phụ kiện điện thoại", storeId: "store-nova", brand: "Nova", photo: "5624999" },
    { id: "p-sneaker", name: "Sneaker trắng Everyday", price: 1190000, salePrice: 890000, category: "fashion", subCategory: "Giày", storeId: "store-may", brand: "Mây", photo: "27204251" },
    { id: "p-backpack", name: "Balo laptop Urban Pack", price: 799000, salePrice: 679000, category: "fashion", subCategory: "Balo", storeId: "store-urban", brand: "Urban Mode", photo: "15059375" },
    { id: "p-tote", name: "Túi tote Canvas Everyday", price: 199000, salePrice: 159000, category: "fashion", subCategory: "Túi xách", storeId: "store-may", brand: "Mây", photo: "9869067" },
    { id: "p-runners", name: "Giày chạy bộ Run Flex", price: 829000, category: "fashion", subCategory: "Giày", storeId: "store-urban", brand: "Urban Mode", photo: "2529148" },
    { id: "p-shirt", name: "Áo sơ mi Linen nhẹ", price: 459000, salePrice: 379000, category: "fashion", subCategory: "Áo", storeId: "store-may", brand: "Mây", photo: "9327156" },
    { id: "p-jacket", name: "Áo khoác gió City Move", price: 690000, category: "fashion", subCategory: "Áo khoác", storeId: "store-urban", brand: "Urban Mode", photo: "9327156" },
    { id: "p-jeans", name: "Quần jeans dáng suông", price: 590000, salePrice: 499000, category: "fashion", subCategory: "Quần", storeId: "store-may", brand: "Mây", photo: "994523" },
    { id: "p-cap", name: "Mũ lưỡi trai Weekend", price: 219000, category: "fashion", subCategory: "Phụ kiện", storeId: "store-urban", brand: "Urban Mode", photo: "9869067" },
    { id: "p-blender", name: "Máy xay mini FreshGo", price: 499000, salePrice: 399000, category: "home", subCategory: "Đồ bếp", storeId: "store-kitchen", brand: "Bếp Nhà", photo: "27861734" },
    { id: "p-lamp", name: "Đèn bàn thông minh Minimal", price: 590000, salePrice: 459000, category: "home", subCategory: "Đèn", storeId: "store-home", brand: "Mộc Home", photo: "7439754" },
    { id: "p-airfryer", name: "Nồi chiên không dầu HomeChef", price: 1890000, salePrice: 1490000, category: "home", subCategory: "Đồ bếp", storeId: "store-kitchen", brand: "Bếp Nhà", photo: "29461935" },
    { id: "p-kettle", name: "Ấm đun nước thủy tinh 1,7 lít", price: 699000, category: "home", subCategory: "Đồ bếp", storeId: "store-kitchen", brand: "Bếp Nhà", photo: "4816265" },
    { id: "p-organizer", name: "Hộp sắp xếp bàn làm việc", price: 259000, salePrice: 199000, category: "home", subCategory: "Lưu trữ", storeId: "store-home", brand: "Mộc Home", photo: "1643383" },
    { id: "p-pan", name: "Chảo chống dính Everyday 26cm", price: 620000, category: "home", subCategory: "Đồ bếp", storeId: "store-kitchen", brand: "Bếp Nhà", photo: "27861734" },
    { id: "p-cushion", name: "Gối tựa sofa Soft Home", price: 349000, salePrice: 289000, category: "home", subCategory: "Trang trí", storeId: "store-home", brand: "Mộc Home", photo: "1643383" },
    { id: "p-serum", name: "Serum dưỡng da Glow Daily", price: 459000, salePrice: 329000, category: "beauty", subCategory: "Chăm sóc da", storeId: "store-lumi", brand: "Lumi", photo: "8101534" },
    { id: "p-sunscreen", name: "Kem chống nắng Daily SPF50", price: 389000, category: "beauty", subCategory: "Chống nắng", storeId: "store-lumi", brand: "Lumi", photo: "3373736" },
    { id: "p-cleanser", name: "Sữa rửa mặt dịu nhẹ Pure Clean", price: 269000, salePrice: 229000, category: "beauty", subCategory: "Làm sạch", storeId: "store-lumi", brand: "Lumi", photo: "8101534" },
    { id: "p-lipstick", name: "Son màu Rose Soft", price: 329000, category: "beauty", subCategory: "Trang điểm", storeId: "store-lumi", brand: "Lumi", photo: "3373736" },
    { id: "p-moisturizer", name: "Kem dưỡng ẩm Calm Skin", price: 429000, salePrice: 359000, category: "beauty", subCategory: "Chăm sóc da", storeId: "store-lumi", brand: "Lumi", photo: "8101534" },
    { id: "p-thermos", name: "Bình giữ nhiệt Trek 600ml", price: 349000, salePrice: 289000, category: "sports", subCategory: "Phụ kiện", storeId: "store-trek", brand: "Trek", photo: "30469934" },
    { id: "p-yogamat", name: "Thảm tập yoga Balance", price: 459000, category: "sports", subCategory: "Tập luyện", storeId: "store-trek", brand: "Trek", photo: "2529148" },
    { id: "p-dumbbell", name: "Tạ tay bọc cao su 2kg", price: 299000, salePrice: 249000, category: "sports", subCategory: "Tập luyện", storeId: "store-trek", brand: "Trek", photo: "30469934" },
    { id: "p-bottle", name: "Bình nước thể thao 750ml", price: 189000, category: "sports", subCategory: "Phụ kiện", storeId: "store-trek", brand: "Trek", photo: "30469934" },
    { id: "p-helmet", name: "Mũ bảo hiểm xe đạp Trail", price: 790000, salePrice: 690000, category: "sports", subCategory: "Ngoài trời", storeId: "store-trek", brand: "Trek", photo: "2529148" },
    { id: "p-coffee", name: "Cà phê rang xay Buổi Sáng 250g", price: 169000, category: "food", subCategory: "Đồ uống", storeId: "store-fresh", brand: "Fresh", photo: "302899" },
    { id: "p-granola", name: "Ngũ cốc Granola hạt 400g", price: 199000, salePrice: 169000, category: "food", subCategory: "Ăn sáng", storeId: "store-fresh", brand: "Fresh", photo: "302899" },
    { id: "p-tea", name: "Trà hoa cúc dịu nhẹ 100g", price: 139000, category: "food", subCategory: "Đồ uống", storeId: "store-fresh", brand: "Fresh", photo: "302899" },
    { id: "p-nuts", name: "Hạt điều rang mộc 300g", price: 229000, salePrice: 189000, category: "food", subCategory: "Đồ ăn nhẹ", storeId: "store-fresh", brand: "Fresh", photo: "302899" },
    { id: "p-book-habits", name: "Sách Thói quen mỗi ngày", price: 189000, salePrice: 159000, category: "books", subCategory: "Kỹ năng", storeId: "store-books", brand: "Sách Mở", photo: "159711" },
    { id: "p-book-space", name: "Sách Góc nhỏ bình yên", price: 169000, category: "books", subCategory: "Văn học", storeId: "store-books", brand: "Sách Mở", photo: "256541" },
    { id: "p-notebook", name: "Sổ tay bìa cứng A5", price: 99000, salePrice: 79000, category: "books", subCategory: "Văn phòng phẩm", storeId: "store-books", brand: "Sách Mở", photo: "256541" },
];
const mockTimestamp = new Date("2026-10-01T09:00:00+07:00").toISOString();
export const catalogMockStores = storeSeeds.map((seed, index) => ({
    _id: seed._id,
    name: seed.name,
    description: seed.description,
    storeAddress: seed.storeAddress,
    category: seed.category,
    customCategory: seed.customCategory,
    logoUrl: photoUrl(seed.photo, 400),
    bannerUrl: photoUrl(seed.banner, 1200),
    rating: seed.rating,
    owner: { _id: `seller-${index + 1}` },
    isActive: true,
    products: productSeeds.filter((product) => product.storeId === seed._id).length,
    followers: 420 + index * 173,
    reviewsCount: 160 + index * 31,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    joinDate: mockTimestamp,
}));
const makeVariations = (id, category, price) => {
    const isFashion = category === "fashion";
    const isFood = category === "food";
    const isBook = category === "books";
    const colors = isFood ? ["Đóng gói tiêu chuẩn"] : isBook ? ["Bản tiêu chuẩn"] : ["Đen", "Xanh"];
    const sizes = isFashion ? ["M", "L"] : isFood ? ["Gói nhỏ", "Gói lớn"] : isBook ? ["Bìa mềm", "Bìa cứng"] : ["Tiêu chuẩn", "Cao cấp"];
    return colors.map((color, colorIndex) => ({
        _id: `variation-${id}-${colorIndex}`,
        color,
        options: sizes.map((name, optionIndex) => ({
            _id: `option-${id}-${colorIndex}-${optionIndex}`,
            name,
            stock: 12 + (colorIndex + optionIndex) * 8,
            additionalPrice: optionIndex === 0 ? 0 : Math.max(20000, Math.round(price * .12 / 10000) * 10000),
        })),
    }));
};
export const catalogMockProducts = productSeeds.map((seed, index) => {
    const store = catalogMockStores.find((item) => item._id === seed.storeId);
    const rating = Math.min(5, Number((4.5 + (index % 5) * .1).toFixed(1)));
    const description = seed.description || `${seed.name} từ ${store.name}, phù hợp với nhu cầu sử dụng hằng ngày.`;
    return {
        _id: seed.id,
        name: seed.name,
        description,
        price: seed.price,
        ...(seed.salePrice ? { salePrice: seed.salePrice } : {}),
        brand: seed.brand,
        category: seed.category,
        subCategory: seed.subCategory,
        quantity: 24 + index % 20,
        soldCount: 85 + index * 37,
        model: `MD-${String(index + 1).padStart(3, "0")}`,
        sku: `MDUC-${String(index + 1).padStart(4, "0")}`,
        variations: makeVariations(seed.id, seed.category, seed.price),
        images: [photoUrl(seed.photo)],
        specifications: [{ key: "Danh mục", value: seed.subCategory }, { key: "Cửa hàng", value: store.name }],
        rating,
        reviewsCount: 18 + index * 4,
        tags: seed.salePrice ? ["Ưu đãi", seed.subCategory] : [seed.subCategory],
        seoTitle: seed.name,
        seoDescription: description,
        keywords: [seed.name, seed.brand, seed.subCategory],
        isFeatured: index % 3 === 0,
        viewsCount: 230 + index * 51,
        isActive: true,
        store: { _id: store._id, name: store.name, logoUrl: store.logoUrl, storeAddress: store.storeAddress },
        features: [description],
        createdAt: mockTimestamp,
    };
});
