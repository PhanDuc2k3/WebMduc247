/**
 * Seed script: thêm 25 users, 10 stores, 100 products, reviews, orders
 * Chạy: node seed.js
 * TUYỆT ĐỐI KHÔNG xóa dữ liệu cũ
 */

const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');

// Models
const User = require('./models/Users');
const Store = require('./models/Store');
const Product = require('./models/Product');
const Review = require('./models/Review');
const Order = require('./models/Order');

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const CATEGORIES = ['electronics', 'fashion', 'home', 'books', 'other'];

// Ảnh sản phẩm tông xám từ Unsplash (mỗi category 10 ảnh)
const GRAY_IMAGES = {
  electronics: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=600&fit=crop&sat=-100&con=0.8',
  ],
  fashion: [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&h=600&fit=crop&sat=-100&con=0.8',
  ],
  home: [
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1503602642458-232111445657?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1550226891-ef816aed4a98?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600&h=600&fit=crop&sat=-100&con=0.8',
  ],
  books: [
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=600&h=600&fit=crop&sat=-100&con=0.8',
  ],
  other: [
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1589281214574-40c7c4bdf8c6?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1533563906091-fdfdcded5f86?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=600&h=600&fit=crop&sat=-100&con=0.8',
    'https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?w=600&h=600&fit=crop&sat=-100&con=0.8',
  ],
};

// Logo tông xám
const STORE_LOGOS = [
  'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200&h=200&fit=crop&sat=-100&con=0.8',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=200&h=200&fit=crop&sat=-100&con=0.8',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=200&h=200&fit=crop&sat=-100&con=0.8',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&h=200&fit=crop&sat=-100&con=0.8',
  'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=200&h=200&fit=crop&sat=-100&con=0.8',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=200&h=200&fit=crop&sat=-100&con=0.8',
  'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=200&h=200&fit=crop&sat=-100&con=0.8',
  'https://images.unsplash.com/photo-1542744094-24638eff58bb?w=200&h=200&fit=crop&sat=-100&con=0.8',
  'https://images.unsplash.com/photo-1561998338-13ad7883b20f?w=200&h=200&fit=crop&sat=-100&con=0.8',
  'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=200&h=200&fit=crop&sat=-100&con=0.8',
];

// ─── VARIATION OPTIONS ───────────────────────────────────────────────────────

// Màu sắc
const COLORS = ['Đen', 'Xanh', 'Trắng', 'Đỏ', 'Vàng', 'Hồng', 'Tím', 'Cam'];

// Size quần áo
const CLOTHING_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

// Size giày
const SHOE_SIZES = ['38', '39', '40', '41', '42', '43', '44'];

// GB điện thoại/thiết bị
const STORAGE_GB = ['128GB', '256GB', '512GB', '1TB'];

// Size nội thất/kích thước
const SIZES_SMALL = ['Nhỏ', 'Vừa', 'Lớn'];
const SIZES_DIMENSION = ['60x60cm', '80x80cm', '100x100cm', '120x120cm'];
const SIZES_BED = ['1m2', '1m5', '1m8', '2m'];

// Loại sách
const BOOK_TYPES = ['Bìa Mềm', 'Bìa Cứng'];

// Loại khác
const ITEM_TYPES = ['Loại 1', 'Loại 2', 'Loại 3'];

// ─── VARIATION GENERATORS ────────────────────────────────────────────────────

/**
 * Tạo variations dựa trên loại sản phẩm
 * variationType:
 * - 'color': chỉ màu sắc (VD: loa, túi xách)
 * - 'color-size': màu sắc + size quần áo (VD: áo thun, quần)
 * - 'color-storage': màu sắc + GB (VD: điện thoại, tai nghe)
 * - 'storage': chỉ GB (VD: ổ cứng)
 * - 'size': chỉ size (VD: nồi chiên, ga giường)
 * - 'type': chỉ loại (VD: sách)
 * - null: không có variations
 */
function generateVariations(variationType, basePrice) {
  switch (variationType) {
    case 'color': {
      // Chỉ màu sắc - mỗi màu có 1 option
      const numColors = randomBetween(2, 4);
      const selectedColors = shuffleArray([...COLORS]).slice(0, numColors);
      return selectedColors.map((color) => ({
        color,
        options: [{ name: 'Default', stock: randomBetween(5, 50), additionalPrice: 0 }],
      }));
    }

    case 'color-size': {
      // Màu sắc + Size (quần áo, giày)
      const numColors = randomBetween(2, 4);
      const selectedColors = shuffleArray([...COLORS]).slice(0, numColors);
      const sizes = variationType === 'color-size' && basePrice > 500000 
        ? [...SHOE_SIZES]  // Giày
        : [...CLOTHING_SIZES]; // Quần áo
      
      return selectedColors.map((color) => ({
        color,
        options: sizes.map((size, idx) => ({
          name: size,
          stock: randomBetween(3, 30),
          additionalPrice: idx * 50000, // Mỗi size tăng 50k
        })),
      }));
    }

    case 'color-storage': {
      // Màu sắc + GB (điện thoại, thiết bị)
      const numColors = randomBetween(2, 4);
      const selectedColors = shuffleArray([...COLORS]).slice(0, numColors);
      const numStorages = randomBetween(2, 4);
      const selectedStorages = STORAGE_GB.slice(0, numStorages);
      
      return selectedColors.map((color) => ({
        color,
        options: selectedStorages.map((storage, idx) => ({
          name: storage,
          stock: randomBetween(5, 30),
          additionalPrice: idx * 1000000, // Mỗi GB tăng 1M
        })),
      }));
    }

    case 'storage': {
      // Chỉ GB (ổ cứng)
      const numStorages = randomBetween(2, 4);
      const selectedStorages = STORAGE_GB.slice(0, numStorages);
      return [{
        color: 'Default',
        options: selectedStorages.map((storage, idx) => ({
          name: storage,
          stock: randomBetween(5, 40),
          additionalPrice: idx * 1500000,
        })),
      }];
    }

    case 'size': {
      // Chỉ size (nồi chiên, ga giường)
      return [{
        color: 'Default',
        options: SIZES_BED.map((size, idx) => ({
          name: size,
          stock: randomBetween(3, 20),
          additionalPrice: idx * 500000,
        })),
      }];
    }

    case 'type': {
      // Chỉ loại (sách)
      return [{
        color: 'Default',
        options: BOOK_TYPES.map((type, idx) => ({
          name: type,
          stock: randomBetween(10, 50),
          additionalPrice: idx * 50000,
        })),
      }];
    }

    default:
      return []; // Không có variations
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ─── DATA GENERATORS ─────────────────────────────────────────────────────────

const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generatePhone = () => {
  const prefixes = ['090', '091', '092', '093', '094', '095', '096', '097', '098', '099'];
  return randomElement(prefixes) + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
};

const generateSKU = (prefix) => `${prefix}-${Date.now()}-${randomBetween(1000, 9999)}`;

// ─── USERS DATA ─────────────────────────────────────────────────────────────

const SELLER_NAMES = [
  'Nguyễn Văn Minh', 'Trần Thị Lan', 'Lê Hoàng Nam', 'Phạm Thu Hà', 'Đặng Minh Tuấn',
];
const BUYER_NAMES = [
  'Hoàng Đức Anh', 'Vũ Thị Mai', 'Bùi Quang Hùng', 'Đào Minh Châu', 'Cao Thị Lan',
  'Ngô Văn Phong', 'Trịnh Thị Ngọc', 'Lý Minh Đức', 'Chu Thị Hương', 'Đinh Văn Tùng',
  'Hà Thị Bình', 'Võ Quang Minh', 'Trương Thị Hạnh', 'Lưu Đình Khoa', 'Phan Thị Lan',
  'Bạch Minh Tuấn', 'Nguyễn Thị Hoa', 'Trần Văn Hùng', 'Lê Thu Hà', 'Phạm Đình Nam',
];

const STORE_NAMES = [
  { name: 'TechZone Pro', category: 'electronics' },
  { name: 'Gadget Hub Store', category: 'electronics' },
  { name: 'Fashion Nova Hub', category: 'fashion' },
  { name: 'Style Street', category: 'fashion' },
  { name: 'Home Bliss Center', category: 'home' },
  { name: 'Living Space Store', category: 'home' },
  { name: 'Bookworm Paradise', category: 'books' },
  { name: 'Literary Corner', category: 'books' },
  { name: 'Lifestyle Essentials', category: 'other' },
  { name: 'Daily Needs Mart', category: 'other' },
];

// PRODUCT_DATA với variationType cho mỗi sản phẩm
const PRODUCT_DATA = {
  electronics: [
    { name: 'Tai Nghe Bluetooth ANC Pro', brand: 'SoundMax', price: 890000, salePrice: 699000, desc: 'Tai nghe không dây chống ồn chủ động, pin 30h, kết nối đa điểm.', variationType: 'color-storage' },
    { name: 'Đồng Hồ Thông Minh Series 5', brand: 'SmartGear', price: 2450000, salePrice: 1890000, desc: 'Màn hình AMOLED 1.4", theo dõi sức khỏe 24/7, chống nước 5ATM.', variationType: 'color' },
    { name: 'Loa Bluetooth Mini 360', brand: 'BassBox', price: 450000, salePrice: null, desc: 'Loa di động 360° bass enhancement, pin 12h, nhỏ gọn bỏ túi.', variationType: 'color' },
    { name: 'Sạc Dự Phòng 20000mAh', brand: 'PowerUp', price: 650000, salePrice: 520000, desc: 'Sạc nhanh 65W PD, 2 cổng USB-C, sạc laptop được.', variationType: null },
    { name: 'Bàn Phím Cơ RGB Gaming', brand: 'KeyMaster', price: 1650000, salePrice: 1290000, desc: 'Switch Cherry MX, RGB per-key, vỏ nhôm nguyên khối.', variationType: 'color' },
    { name: 'Chuột Không Dây Ergonomic', brand: 'ErgoMouse', price: 780000, salePrice: null, desc: 'Thiết kế ergonomic giảm mỏi tay, pin 6 tháng, độ phân giải 16000 DPI.', variationType: 'color' },
    { name: 'Ổ Cứng SSD 1TB Ngoài', brand: 'DataSpeed', price: 1350000, salePrice: 1090000, desc: 'Tốc độ đọc 1050MB/s, Type-C, nhỏ gọn, vỏ kim loại.', variationType: 'storage' },
    { name: 'Webcam 4K HDR AutoFocus', brand: 'VisionCam', price: 2100000, salePrice: 1690000, desc: '4K 30fps, HDR tự động, lấy nét nhanh, micro kép khử tiếng ồn.', variationType: null },
    { name: 'Máy Lọc Khí Mini', brand: 'AirPure', price: 1850000, salePrice: null, desc: 'HEPA H13, lọc PM2.5, hoạt động êm 25dB, phù hợp phòng 20m².', variationType: 'size' },
    { name: 'Máy Chiếu Mini Full HD', brand: 'CineBox', price: 4900000, salePrice: 3990000, desc: '1080p, Android TV tích hợp, keystone tự động, loa 2x5W.', variationType: null },
  ],
  fashion: [
    { name: 'Áo Thun Nam Cotton 180gsm', brand: 'Basics', price: 185000, salePrice: null, desc: 'Cotton 100% 180gsm, form regular, nhiều màu.', variationType: 'color-size' },
    { name: 'Quần Jeans Slim Fit Stretch', brand: 'DenimLab', price: 520000, salePrice: 399000, desc: 'Co giãn 4 chiều, wash xanh nhạt, form slim vừa.', variationType: 'color-size' },
    { name: 'Giày Sneaker Platform', brand: 'StepUp', price: 890000, salePrice: 690000, desc: 'Đế platform 5cm, da tổng hợp, đệm lót êm ái.', variationType: 'color-size' },
    { name: 'Áo Khoác Hoodie Unisex', brand: 'ChillWear', price: 420000, salePrice: null, desc: 'Nỉ bông 320gsm, hoodie có dây, túi trước rộng.', variationType: 'color-size' },
    { name: 'Váy Midi Wrap Pleated', brand: 'Elegance', price: 365000, salePrice: 289000, desc: 'Chất liệu chiffon nhẹ, xếp ly đều, phù hợp nhiều dịp.', variationType: 'color-size' },
    { name: 'Túi Đeo Chéo Minimalist', brand: 'PocketStyle', price: 680000, salePrice: null, desc: 'Da PU cao cấp, ngăn đựng laptop 14", dây đeo đệm vai.', variationType: 'color' },
    { name: 'Áo Sơ Mi Oxford Nam', brand: 'DressCode', price: 395000, salePrice: 299000, desc: 'Vải oxford cotton, cổ spread, phù hợp đi làm và dạo phố.', variationType: 'color-size' },
    { name: 'Quần Short Chino Cargo', brand: 'UrbanFit', price: 445000, salePrice: null, desc: 'Nhiều túi cargo thực dụng, chất vải thoáng mát, form relaxed.', variationType: 'color-size' },
    { name: 'Kính Mát Oversized', brand: 'ShadeVibe', price: 295000, salePrice: 199000, desc: 'Khung PC cao cấp, tròng UV400, form oversized thời trang.', variationType: 'color' },
    { name: 'Bông Tay Knitwear Premium', brand: 'WarmWear', price: 550000, salePrice: null, desc: 'Len Merino mềm mịn, nhiều màu trung tính, giữ ấm tốt.', variationType: 'color-size' },
  ],
  home: [
    { name: 'Gối Memory Foam Orthopedic', brand: 'SleepWell', price: 680000, salePrice: 520000, desc: 'Memory foam định hình, giảm đau cổ vai, bọc vải bamboo.', variationType: 'color-size' },
    { name: 'Ga Giường Tencel Sets', brand: 'BedNest', price: 890000, salePrice: null, desc: 'Tencel mềm mát, bộ 4 món (ga trải + 2 vỏ gối + chăn)', variationType: 'size' },
    { name: 'Đèn Bàn LED Cảm Ứng', brand: 'LumiDesk', price: 420000, salePrice: 299000, desc: '3 chế độ ánh sáng, sạc không dây tích hợp, cổng USB.', variationType: 'color' },
    { name: 'Bình Hoa Trang Trí Ceramic', brand: 'ArtVase', price: 285000, salePrice: null, desc: 'Gốm men trắng, thiết kế tối giản, phù hợp nhiều phong cách.', variationType: 'color' },
    { name: 'Kệ Sách 5 Tầng Minimalist', brand: 'ShelfCraft', price: 1250000, salePrice: 999000, desc: 'Gỗ MDF phủ sơn trắng, kích thước 80x160cm, lắp đặt dễ dàng.', variationType: 'size' },
    { name: 'Thảm Trải Sàn Shaggy', brand: 'SoftStep', price: 750000, salePrice: null, desc: 'Nhung shaggy cao 4cm, chống trượt đáy, kích thước 120x170cm.', variationType: 'size' },
    { name: 'Nến Thơm Natural Soy', brand: 'FlameCare', price: 195000, salePrice: 149000, desc: 'Sáp đậu nành tự nhiên, thời gian cháy 45h, 5 hương thơm.', variationType: 'color' },
    { name: 'Bộ Ly Sứ Den Bộ 6 Cái', brand: 'TableArt', price: 345000, salePrice: null, desc: 'Sứ trắng cao cấp, thiết kế đen sang trọng, đi kèm khay.', variationType: 'size' },
    { name: 'Gương Treo Tường Led', brand: 'MirrorLux', price: 980000, salePrice: 799000, desc: 'Khung nhôm, đèn LED viền, chống hơi nước, cảm ứng chạm.', variationType: 'size' },
    { name: 'Chậu Cây Trang Trí Set 3', brand: 'GreenHome', price: 265000, salePrice: null, desc: 'Nhựa PVC cao cấp, 3 kích cỡ, nhiều màu pastel.', variationType: 'color' },
  ],
  books: [
    { name: 'Tư Duy Nhanh Và Chậm', brand: 'NXB Tri Thức', price: 139000, salePrice: null, desc: 'Daniel Kahneman - Giải Nobel Kinh tế, về tâm lý ra quyết định.', variationType: 'type' },
    { name: 'Steve Jobs - Walter Isaacson', brand: 'NXB Trẻ', price: 199000, salePrice: 149000, desc: 'Tiểu sử đầy đủ nhất về Steve Jobs, CEO Apple.', variationType: 'type' },
    { name: 'Người giàu có thứ 5', brand: 'NXB Thế Giới', price: 99000, salePrice: null, desc: 'George S. Clason - Cách quản lý tài chính cá nhân qua ngụ ngôn.', variationType: 'type' },
    { name: 'Đắc Nhân Tâm', brand: 'NXB Văn Học', price: 79000, salePrice: 59000, desc: 'Dale Carnegie - Kỹ năng giao tiếp và thuyết phục người khác.', variationType: 'type' },
    { name: 'Không Diệt Không Sinh', brand: 'NXB Hồi Ân', price: 149000, salePrice: null, desc: 'Thích Nhất Hạnh - Thiền tập cho người bận rộn.', variationType: 'type' },
    { name: 'Clean Code', brand: "NXB O'Reilly", price: 295000, salePrice: 235000, desc: 'Robert C. Martin - Nguyên tắc viết code sạch, dễ bảo trì.', variationType: 'type' },
    { name: 'Bộ Sưu Tập Tranh Tô Màu', brand: 'NXB Mỹ Thuật', price: 125000, salePrice: null, desc: '50 trang giấy kraft, 6 cây màu sáp, cho người lớn giải stress.', variationType: 'type' },
    { name: 'Nhà Giả Kim', brand: 'NXB Thế Giới', price: 68000, salePrice: null, desc: 'Paulo Coelho - Cuốn sách về ước mơ và ý nghĩa cuộc sống.', variationType: 'type' },
    { name: 'Sapiens - Lược Sử Loài Người', brand: 'NXB Tri Thức', price: 249000, salePrice: 189000, desc: 'Yuval Noah Harari - Từ thuở hồng hoang đến kỷ nguyên AI.', variationType: 'type' },
    { name: 'Atomic Habits', brand: 'NXB First News', price: 169000, salePrice: null, desc: 'James Clear - Xây dựng thói quen tốt, phá vỡ thói quen xấu.', variationType: 'type' },
  ],
  other: [
    { name: 'Bộ Dụng Cụ Sửa Chữa 45 Chi Tiết', brand: 'ToolMaster', price: 420000, salePrice: 329000, desc: 'Tuốc-nơ-vít, kìm, búa, khoan mini, hộp đựng kim loại.', variationType: null },
    { name: 'Máy Xay Sinh Tố Cầm Tay', brand: 'BlendJet', price: 580000, salePrice: null, desc: 'Công suất 300W, 2 lưỡi thép không gỉ, dễ vệ sinh.', variationType: 'color' },
    { name: 'Bộ Bút Vẽ Kỹ Thuật 12 Màu', brand: 'ArtPen', price: 195000, salePrice: 149000, desc: 'Bút mực pigment chống phai, phù hợp sketch và illumination.', variationType: 'type' },
    { name: 'Nồi Chiên Không Dầu 5.5L', brand: 'CrispyPot', price: 1890000, salePrice: 1490000, desc: 'Công nghệ Rapid Air, nấu ăn không dầu, màn hình LCD.', variationType: 'size' },
    { name: 'Máy Lọc Nước Để Bàn', brand: 'AquaPure', price: 1350000, salePrice: null, desc: 'Màng lọc RO, công suất 180L/ngày, tự động rửa màng.', variationType: null },
    { name: 'Bộ Lego Classic 1000 Chi Tiết', brand: 'BuildBlock', price: 890000, salePrice: 699000, desc: '1000 khối đa màu, sáng tạo không giới hạn, phù hợp mọi lứa tuổi.', variationType: 'type' },
    { name: 'Kem Đánh Răng Điện Sonic', brand: 'FreshSmile', price: 650000, salePrice: null, desc: '10000 rung động/phút, 2 chế độ, sạc USB, 2 đầu chải.', variationType: 'color' },
    { name: 'Dây Đeo Apple Watch Sport', brand: 'BandFit', price: 165000, salePrice: 99000, desc: 'Silicone food-grade, nhiều màu, lắp nhanh, thoáng khí.', variationType: 'color-size' },
    { name: 'Bình Nước Giữ Lạnh 1.5L', brand: 'HydroCool', price: 285000, salePrice: null, desc: 'Thép không gỉ 18/8, giữ lạnh 24h, nắp chống tràn.', variationType: 'color' },
    { name: 'Máy Đo Huyết Áp Điện Tử', brand: 'HealthPlus', price: 750000, salePrice: 599000, desc: 'Đo nhịp tim, phát hiện loạn nhịp, bộ nhớ 120 lần đo.', variationType: null },
  ],
};

const REVIEWS_COMMENTS = [
  'Sản phẩm tốt, đóng gói cẩn thận, giao hàng nhanh. Rất hài lòng!',
  'Chất lượng vượt mong đợi, mình sẽ ủng hộ shop thường xuyên.',
  'Giao đúng mẫu, hàng như mô tả. Cảm ơn shop!',
  'Đáng tiền mua, dùng thử rồi mới biết. Sẽ giới thiệu bạn bè.',
  'Shop tư vấn nhiệt tình, giao hàng đúng hẹn.',
  'Hàng đẹp, chất lượng tốt. Mình sẽ mua lại lần sau.',
  'Mình dùng được 1 tuần rồi, ổn định, không có vấn đề gì.',
  'Tặng thêm quà nhỏ, shop chu đáo quá. 5 sao!',
  'So với giá thì chất lượng rất OK, không có gì phàn nàn.',
  'Đóng gói kỹ, không bị trầy xước. Nhận hàng rất vừa ý.',
  '',
  '',
  '',
];

// ─── SEED FUNCTIONS ─────────────────────────────────────────────────────────

async function seed() {
  console.log('🔄 Kết nối MongoDB...');
  await require('./config/db')();

  console.log('✅ Bắt đầu seed dữ liệu...\n');

  // 1. Tạo 25 users (5 seller + 20 buyer)
  console.log('👤 Tạo 25 users...');
  const passwordHash = await bcrypt.hash('123456', 10);
  const users = [];

  // 5 sellers
  for (let i = 0; i < 5; i++) {
    const email = `seller${i + 1}@seed.com`;
    const existing = await User.findOne({ email });
    if (!existing) {
      const user = await User.create({
        email,
        password: passwordHash,
        fullName: SELLER_NAMES[i],
        phone: generatePhone(),
        role: 'seller',
        status: 'active',
        isVerified: true,
        sellerRequest: { status: 'approved' },
      });
      users.push(user);
      console.log(`  ✅ Seller: ${SELLER_NAMES[i]} (${email})`);
    } else {
      users.push(existing);
      console.log(`  ⏭️  Seller đã tồn tại: ${existing.fullName}`);
    }
  }

  // 20 buyers
  for (let i = 0; i < 20; i++) {
    const email = `buyer${i + 1}@seed.com`;
    const existing = await User.findOne({ email });
    if (!existing) {
      const user = await User.create({
        email,
        password: passwordHash,
        fullName: BUYER_NAMES[i],
        phone: generatePhone(),
        role: 'buyer',
        status: 'active',
        isVerified: true,
      });
      users.push(user);
      console.log(`  ✅ Buyer: ${BUYER_NAMES[i]} (${email})`);
    } else {
      users.push(existing);
      console.log(`  ⏭️  Buyer đã tồn tại: ${existing.fullName}`);
    }
  }

  const allUsers = await User.find({});
  console.log(`\n📊 Tổng users trong DB: ${allUsers.length}\n`);

  // 2. Tạo 10 stores (2 per category)
  console.log('🏪 Tạo 10 stores...');
  const stores = [];
  for (let i = 0; i < STORE_NAMES.length; i++) {
    const storeData = STORE_NAMES[i];
    const owner = users[i]; // seller 0-4 sở hữu stores
    const existing = await Store.findOne({ name: storeData.name });
    if (!existing) {
      const store = await Store.create({
        name: storeData.name,
        description: `Cửa hàng ${storeData.name} - Chuyên cung cấp các sản phẩm ${storeData.category} chất lượng cao với giá cả hợp lý. Cam kết 100% chính hãng, bảo hành 12 tháng.`,
        storeAddress: `${randomBetween(1, 999)} Đường Nguyễn Trãi, Quận ${randomBetween(1, 12)}, TP.HCM`,
        logoUrl: STORE_LOGOS[i],
        bannerUrl: `https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=400&fit=crop&sat=-100&con=0.8`,
        contactPhone: generatePhone(),
        contactEmail: `contact@${storeData.name.toLowerCase().replace(/\s/g, '')}.com`,
        category: storeData.category,
        rating: (3.5 + Math.random() * 1.5).toFixed(1),
        owner: owner._id,
        isActive: true,
      });
      // Gán store cho seller
      owner.store = store._id;
      owner.sellerRequest.status = 'approved';
      await owner.save();
      stores.push(store);
      console.log(`  ✅ Store: ${storeData.name} (${storeData.category}) - Owner: ${owner.fullName}`);
    } else {
      stores.push(existing);
      console.log(`  ⏭️  Store đã tồn tại: ${existing.name}`);
    }
  }

  const allStores = await Store.find({});
  console.log(`\n📊 Tổng stores trong DB: ${allStores.length}\n`);

  // 3. Tạo 100 products (10 per category × 2 stores per category)
  console.log('📦 Tạo 100 sản phẩm...');
  let productCount = 0;

  for (const category of CATEGORIES) {
    const categoryStores = stores.filter(s => s.category === category);
    const productsForCategory = PRODUCT_DATA[category];
    const images = GRAY_IMAGES[category];

    for (let i = 0; i < productsForCategory.length; i++) {
      const productInfo = productsForCategory[i];
      const store = categoryStores[i % categoryStores.length];
      const image = images[i];

      // Check by name + store to avoid duplicates
      const existingByName = await Product.findOne({ name: productInfo.name, store: store._id });

      if (!existingByName) {
        // Generate variations dựa trên loại sản phẩm
        const variations = generateVariations(productInfo.variationType, productInfo.price);

        await Product.create({
          name: productInfo.name,
          description: productInfo.desc,
          price: productInfo.price,
          salePrice: productInfo.salePrice || null,
          brand: productInfo.brand,
          category,
          subCategory: category,
          categories: [category],
          quantity: randomBetween(10, 500),
          soldCount: randomBetween(5, 100),
          model: `${productInfo.brand} ${new Date().getFullYear()}`,
          sku: generateSKU(category.toUpperCase().substring(0, 3)),
          images: [image, images[(i + 1) % images.length], images[(i + 2) % images.length]],
          variations,
          specifications: [
            { key: 'Thương hiệu', value: productInfo.brand },
            { key: 'Bảo hành', value: '12 tháng' },
            { key: 'Xuất xứ', value: 'Việt Nam' },
            { key: 'Màu sắc', value: variations[0]?.color || 'Đen' },
          ],
          features: [
            'Hàng chính hãng',
            'Bảo hành 12 tháng',
            'Giao hàng nhanh',
            'Đổi trả trong 7 ngày',
          ],
          rating: (3.5 + Math.random() * 1.5).toFixed(1),
          reviewsCount: randomBetween(0, 50),
          tags: [category, productInfo.brand.toLowerCase()],
          seoTitle: `${productInfo.name} - ${productInfo.brand} chính hãng`,
          seoDescription: productInfo.desc,
          keywords: [category, productInfo.brand.toLowerCase(), productInfo.name.toLowerCase()],
          isFeatured: Math.random() > 0.7,
          isActive: true,
          viewsCount: randomBetween(50, 2000),
          store: store._id,
        });
        productCount++;
        if (productCount % 10 === 0) {
          process.stdout.write(`  ${productCount}/100 `);
          process.stdout.write('▓'.repeat(productCount / 2) + '\r');
        }
      } else if (!existingByName.variations || existingByName.variations.length === 0) {
        // Sản phẩm đã tồn tại nhưng chưa có variations → CẬP NHẬT
        const variations = generateVariations(productInfo.variationType, productInfo.price);
        await Product.findByIdAndUpdate(existingByName._id, {
          variations,
          specifications: [
            { key: 'Thương hiệu', value: productInfo.brand },
            { key: 'Bảo hành', value: '12 tháng' },
            { key: 'Xuất xứ', value: 'Việt Nam' },
            { key: 'Màu sắc', value: variations[0]?.color || 'Đen' },
          ],
        });
        productCount++;
        console.log(`  🔄 Cập nhật variations: ${productInfo.name}`);
      }
    }
  }

  const allProducts = await Product.find({}).populate('store');
  console.log(`\n📊 Tổng products trong DB: ${allProducts.length}\n`);

  // 4. Tạo reviews cho mỗi product
  console.log('⭐ Tạo reviews...');
  const buyers = allUsers.filter(u => u.role === 'buyer');

  for (const product of allProducts) {
    const reviewCount = randomBetween(2, 8); // 2-8 reviews mỗi product
    let totalRating = 0;
    const reviewedOrders = [];

    for (let r = 0; r < reviewCount; r++) {
      const buyer = buyers[randomBetween(0, buyers.length - 1)];
      const rating = randomBetween(3, 5);
      totalRating += rating;
      const comment = randomElement(REVIEWS_COMMENTS);

      // Create a dummy order for the review
      const orderCode = `ORD-${Date.now()}-${r}`;
      let order = await Order.findOne({ orderCode });
      if (!order) {
        order = await Order.create({
          orderCode,
          userId: buyer._id,
          userInfo: {
            fullName: buyer.fullName,
            email: buyer.email,
            phone: buyer.phone,
            role: buyer.role,
            avatarUrl: buyer.avatarUrl,
          },
          items: [{
            productId: product._id,
            storeId: product.store._id,
            name: product.name,
            imageUrl: product.images[0],
            price: product.price,
            salePrice: product.salePrice || undefined,
            quantity: 1,
            subtotal: product.salePrice || product.price,
          }],
          shippingAddress: {
            fullName: buyer.fullName,
            phone: buyer.phone,
            address: `${randomBetween(1, 999)} Đường ABC, Quận 1, TP.HCM`,
          },
          shippingInfo: {
            method: 'Giao hàng nhanh',
            estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          },
          paymentInfo: { method: 'COD', status: 'paid' },
          statusHistory: [
            { status: 'pending', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            { status: 'confirmed', timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
            { status: 'packed', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
            { status: 'shipped', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
            { status: 'delivered', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
            { status: 'received', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
          ],
          subtotal: product.salePrice || product.price,
          platformFee: Math.round((product.salePrice || product.price) * 0.1),
          shippingFee: 25000,
          total: (product.salePrice || product.price) + 25000,
        });
      }
      reviewedOrders.push(order._id);

      const existingReview = await Review.findOne({ productId: product._id, userId: buyer._id });
      if (!existingReview) {
        await Review.create({
          productId: product._id,
          orderId: order._id,
          userId: buyer._id,
          userInfo: {
            fullName: buyer.fullName,
            avatarUrl: buyer.avatarUrl,
          },
          rating,
          comment,
          images: [],
        });
      }
    }

    // Update product rating
    const avgRating = totalRating / reviewCount;
    const actualReviewsCount = await Review.countDocuments({ productId: product._id });
    await Product.findByIdAndUpdate(product._id, {
      rating: Math.round(avgRating * 10) / 10,
      reviewsCount: actualReviewsCount,
    });
  }

  const allReviews = await Review.find({});
  console.log(`📊 Tổng reviews trong DB: ${allReviews.length}\n`);

  // 5. Tạo orders cho mỗi store (để soldCount tỉ lệ thuận)
  console.log('🛒 Tạo orders để cập nhật soldCount...');
  let orderCount = 0;

  // Tính base orders cho mỗi store (để soldCount store tỉ lệ với orders)
  const storeOrderBase = {};
  for (const store of allStores) {
    storeOrderBase[store._id.toString()] = randomBetween(15, 60);
  }

  for (const store of allStores) {
    const storeProducts = allProducts.filter(p => p.store._id.toString() === store._id.toString());
    const baseOrders = storeOrderBase[store._id.toString()];

    // Phân bổ orders cho các product của store
    const sortedProducts = [...storeProducts].sort(() => Math.random() - 0.5);
    let remainingOrders = baseOrders;

    for (let i = 0; i < sortedProducts.length; i++) {
      const product = sortedProducts[i];
      // Sản phẩm đầu tiên nhận nhiều orders hơn (top seller)
      const productOrders = i === 0
        ? Math.floor(remainingOrders * 0.4)
        : i === 1
        ? Math.floor(remainingOrders * 0.25)
        : Math.floor(remainingOrders * 0.35 / (sortedProducts.length - 2));

      let productTotalSold = 0;

      for (let o = 0; o < productOrders; o++) {
        const buyer = buyers[randomBetween(0, buyers.length - 1)];
        const quantity = randomBetween(1, 3);
        const itemPrice = product.salePrice || product.price;
        const subtotal = itemPrice * quantity;

        const orderCode = `ORD-S${orderCount}-${Date.now()}-${o}`;
        const existingOrder = await Order.findOne({ orderCode });
        if (!existingOrder) {
          await Order.create({
            orderCode,
            userId: buyer._id,
            userInfo: {
              fullName: buyer.fullName,
              email: buyer.email,
              phone: buyer.phone,
              role: buyer.role,
              avatarUrl: buyer.avatarUrl,
            },
            items: [{
              productId: product._id,
              storeId: store._id,
              name: product.name,
              imageUrl: product.images[0],
              price: product.price,
              salePrice: product.salePrice || undefined,
              quantity,
              subtotal,
            }],
            shippingAddress: {
              fullName: buyer.fullName,
              phone: buyer.phone,
              address: `${randomBetween(1, 999)} Đường XYZ, Quận ${randomBetween(1, 12)}, TP.HCM`,
            },
            shippingInfo: {
              method: 'Giao hàng nhanh',
              trackingNumber: `TRK${Date.now()}${o}`,
              estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            },
            paymentInfo: { method: 'COD', status: 'paid' },
            statusHistory: [
              { status: 'pending', timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
              { status: 'confirmed', timestamp: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000) },
              { status: 'packed', timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) },
              { status: 'shipped', timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
              { status: 'delivered', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
              { status: 'received', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
            ],
            subtotal,
            platformFee: Math.round(subtotal * 0.1),
            shippingFee: 25000,
            total: subtotal + 25000,
          });
          orderCount++;
          productTotalSold += quantity;
        }
      }

      // Cập nhật soldCount cho product
      await Product.findByIdAndUpdate(product._id, { soldCount: productTotalSold });
    }

    // Cập nhật rating store dựa trên reviews
    const storeProductIds = storeProducts.map(p => p._id);
    const storeReviews = await Review.find({ productId: { $in: storeProductIds } });
    const avgStoreRating = storeReviews.length > 0
      ? storeReviews.reduce((sum, r) => sum + r.rating, 0) / storeReviews.length
      : 0;
    await Store.findByIdAndUpdate(store._id, {
      rating: Math.round(avgStoreRating * 10) / 10,
    });
  }

  const allOrders = await Order.find({});
  console.log(`📊 Tổng orders trong DB: ${allOrders.length}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SEED HOÀN TẤT!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`👤 Users:    ${allUsers.length} (5 seller + 20 buyer)`);
  console.log(`🏪 Stores:   ${allStores.length} (2/category)`);
  console.log(`📦 Products: ${allProducts.length}`);
  console.log(`⭐ Reviews:   ${allReviews.length}`);
  console.log(`🛒 Orders:   ${allOrders.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 Tài khoản test:');
  console.log('  Seller: seller1@seed.com → 123456');
  console.log('  Buyer:  buyer1@seed.com  → 123456');
  console.log('\n💡 Chạy lại script sẽ bỏ qua dữ liệu đã tồn tại.\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Lỗi seed:', err);
  process.exit(1);
});
