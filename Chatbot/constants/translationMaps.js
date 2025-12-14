// constants/translationMaps.js

// Từ điển dịch từ tiếng Việt sang tiếng Anh
const vietnameseToEnglishMap = {
  "máy tính xách tay": "laptop",
  "máy tính": "computer",
  "điện thoại": "phone",
  "điện thoại thông minh": "smartphone",
  "tai nghe": "headphone",
  "tai nghe không dây": "wireless headphone",
  "chuột máy tính": "mouse",
  "bàn phím": "keyboard",
  "màn hình": "monitor",
  "tủ lạnh": "refrigerator",
  "máy giặt": "washing machine",
  "điều hòa": "air conditioner",
  "tivi": "tv",
  "truyền hình": "television",
  "quần áo": "clothes",
  "áo": "shirt",
  "quần": "pants",
  "giày": "shoes",
  "dép": "slippers",
  "túi xách": "bag",
  "ví": "wallet",
  "sách": "book",
  "truyện": "story",
  "vở": "notebook",
  "bút": "pen",
  "bút chì": "pencil",
  "macbook": "macbook",
  "iphone": "iphone",
  "ipad": "ipad",
  "samsung": "samsung",
  "apple": "apple",
  "doremon": "doremon",
  "doraemon": "doremon",
};

// Mapping từ khóa tiếng Anh sang category tiếng Việt trong database
const englishToVietnameseCategoryMap = {
  "phone": "Điện thoại",
  "smartphone": "Điện thoại",
  "laptop": "Laptop",
  "computer": "Máy tính",
  "headphone": "Tai nghe",
  "mouse": "Chuột",
  "keyboard": "Bàn phím",
  "monitor": "Màn hình",
  "tv": "Tivi",
  "television": "Tivi",
  "refrigerator": "Tủ lạnh",
  "washing machine": "Máy giặt",
  "air conditioner": "Điều hòa",
  "clothes": "Quần áo",
  "shirt": "Áo",
  "pants": "Quần",
  "shoes": "Giày",
  "bag": "Túi xách",
  "wallet": "Ví",
  "book": "Sách",
  "story": "Truyện",
  "notebook": "Vở",
  "pen": "Bút",
  "pencil": "Bút chì",
};

// Mapping từ khóa để mở rộng tìm kiếm (khi tìm "máy tính" sẽ tìm cả "laptop", "máy tính xách tay")
const keywordExpansionMap = {
  // Máy tính
  "máy tính": ["laptop", "máy tính xách tay", "computer", "máy tính"],
  "laptop": ["máy tính xách tay", "máy tính", "laptop", "computer"],
  "máy tính xách tay": ["laptop", "máy tính", "computer", "máy tính xách tay"],
  "computer": ["máy tính", "laptop", "máy tính xách tay", "computer"],
  
  // Điện thoại
  "điện thoại": ["phone", "smartphone", "điện thoại", "điện thoại thông minh"],
  "phone": ["điện thoại", "smartphone", "điện thoại thông minh", "phone"],
  "smartphone": ["điện thoại", "phone", "điện thoại thông minh", "smartphone"],
  "điện thoại thông minh": ["smartphone", "phone", "điện thoại", "điện thoại thông minh"],
  
  // Tai nghe
  "tai nghe": ["headphone", "tai nghe", "tai nghe không dây", "wireless headphone"],
  "headphone": ["tai nghe", "headphone", "tai nghe không dây", "wireless headphone"],
  
  // Sách/Truyện
  "sách": ["book", "sách", "truyện", "story"],
  "book": ["sách", "book", "truyện", "story"],
  "truyện": ["story", "truyện", "sách", "book"],
  "story": ["truyện", "story", "sách", "book"],
};

// Danh sách các từ KHÔNG được loại bỏ (từ khóa sản phẩm quan trọng)
const PRODUCT_KEYWORDS = [
  'doremon', 'doraemon', 'iphone', 'ipad', 'macbook', 'samsung', 'apple',
  'laptop', 'phone', 'smartphone', 'headphone', 'keyboard', 'mouse', 'monitor',
  'story', 'book', 'truyện', 'sách'
];

// Danh sách các từ cần loại bỏ (không liên quan đến tìm kiếm sản phẩm)
const STOP_WORDS = [
  // Tiếng Việt
  'bao nhiêu', 'có bao nhiêu', 'số lượng', 'tổng số', 'tổng cộng', 'có mấy', 'mấy cái',
  'có những gì', 'danh sách', 'bên mình', 'của bạn', 'của shop', 'của cửa hàng',
  'mình', 'bạn', 'shop', 'cửa hàng', 'của', 'có', 'là', 'gì', 'nào', 'đó', 'này',
  'thì', 'sao', 'với', 'và', 'hoặc', 'nhưng', 'mà', 'để', 'cho', 'về',
  
  // Tiếng Anh
  'quantity', 'how many', 'how much', 'count', 'total', 'list', 'what', 'which',
  'how', 'many', 'much', 'are', 'is', 'the', 'a', 'an', 'of', 'in', 'on', 'at',
  'to', 'for', 'with', 'from', 'by', 'about', 'into', 'onto', 'upon', 'within',
  'then', 'so', 'and', 'or', 'but', 'that', 'this', 'these', 'those'
];

module.exports = {
  vietnameseToEnglishMap,
  englishToVietnameseCategoryMap,
  STOP_WORDS,
  PRODUCT_KEYWORDS,
  keywordExpansionMap,
};

