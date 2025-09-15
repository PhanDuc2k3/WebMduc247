import React from "react";

const tabs = [
  { key: "info", label: "Hồ sơ" },
  { key: "orders", label: "Đơn hàng" },
  { key: "favorites", label: "Yêu thích" },
  { key: "settings", label: "Cài đặt" },
];

const ProfileTabs: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
}> = ({ activeTab, setActiveTab }) => (
  <div className="flex gap-2 mb-4">
    {tabs.map(tab => (
      <button
        key={tab.key}
        className={`px-5 py-2 rounded-full font-medium ${
          activeTab === tab.key
            ? "bg-gray-200 text-black"
            : "bg-gray-100 text-gray-500"
        }`}
        onClick={() => setActiveTab(tab.key)}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default ProfileTabs;