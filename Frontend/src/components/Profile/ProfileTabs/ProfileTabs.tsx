import React from "react";

const tabs = [
  { key: "info", label: "Hồ sơ", icon: "👤" },
  { key: "orders", label: "Đơn hàng", icon: "📦" },
  { key: "favorites", label: "Yêu thích", icon: "❤️" },
  { key: "settings", label: "Cài đặt", icon: "⚙️" },
];

const ProfileTabs: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
}> = ({ activeTab, setActiveTab }) => (
  <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
    {tabs.map((tab, index) => (
      <button
        key={tab.key}
        className={`px-6 py-3 rounded-xl text-base font-bold transition-all duration-300 transform hover:scale-105 flex items-center gap-2 ${
          activeTab === tab.key
            ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105"
            : "bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 border-2 border-gray-200 hover:border-blue-400"
        } animate-fade-in-up`}
        style={{ animationDelay: `${index * 0.1}s` }}
        onClick={() => setActiveTab(tab.key)}
      >
        <span className="text-xl">{tab.icon}</span>
        <span>{tab.label}</span>
      </button>
    ))}
  </div>
);

export default ProfileTabs;
