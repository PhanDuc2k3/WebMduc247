import React from "react";
import { User, Package, Heart, Settings } from "lucide-react";

const tabs = [
  { key: "info", label: "Hồ sơ", icon: User },
  { key: "orders", label: "Đơn hàng", icon: Package },
  { key: "favorites", label: "Yêu thích", icon: Heart },
  { key: "settings", label: "Cài đặt", icon: Settings },
];

const ProfileTabs: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
}> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex flex-wrap gap-2 md:gap-3 justify-center sm:justify-start overflow-x-auto pb-2">
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            className={`px-3 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl text-xs sm:text-sm md:text-base font-bold transition-all duration-300 transform hover:scale-105 flex items-center gap-1.5 md:gap-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.key
                ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105"
                : "bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 border-2 border-gray-200 hover:border-blue-400"
            } animate-fade-in-up`}
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={() => setActiveTab(tab.key)}
          >
            <Icon size={16} className="md:w-5 md:h-5" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ProfileTabs;
