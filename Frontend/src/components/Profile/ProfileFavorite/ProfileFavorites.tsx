import React from "react";

const favorites = [
  {
    name: "MacBook Air M3 13 inch",
    price: "25.990.000₫",
    store: "TechZone Official",
    rating: "4.8",
    img: "https://i.imgur.com/macbook.png",
  },
  {
    name: "iPad Pro 12.9 inch M2",
    price: "22.990.000₫",
    store: "Apple Store",
    rating: "4.9",
    img: "https://i.imgur.com/ipad.png",
  },
];

const ProfileFavorites: React.FC = () => (
  <div className="bg-white rounded-xl shadow p-8">
    <h3 className="font-semibold text-xl mb-6">Sản phẩm yêu thích</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {favorites.map((item) => (
        <div
          key={item.name}
          className="border rounded-xl p-6 flex gap-6 items-center"
        >
          <img
            src={item.img}
            alt={item.name}
            className="w-32 h-32 rounded object-cover"
          />
          <div className="flex-1">
            <div className="text-lg font-medium mb-2">{item.name}</div>
            <div className="text-base text-gray-500 mb-2">
              <span>⭐ {item.rating}</span> · <span>{item.store}</span>
            </div>
            <div className="text-lg font-bold text-red-600 mb-3">
              {item.price}
            </div>
            <button className="bg-black text-white px-6 py-2 rounded text-base font-medium hover:bg-gray-800">
              Thêm giỏ hàng
            </button>
          </div>
          <button className="text-gray-400 hover:text-red-500">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 
                2 5.42 4.42 3 7.5 3c2.04 0 3.81 1.23 4.5 3.09C13.69 
                4.23 15.46 3 17.5 3 20.58 3 23 5.42 23 
                8.5c0 3.78-3.4 6.86-8.55 
                11.54L12 21.35z"
                stroke="#16161a"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  </div>
);

export default ProfileFavorites;
