import React from "react";
import { Tag, Flame, Zap, ArrowUp, Wallet, Star, Gift } from "lucide-react";

interface Tab {
  label: string;
  icon: React.ReactNode;
}

interface PromotionTabsProps {
  tabs: Tab[];
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
}

const PromotionTabs: React.FC<PromotionTabsProps> = ({ tabs, activeTab, setActiveTab }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap gap-3 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.label}
          onClick={() => setActiveTab(tab.label)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition ${
            activeTab === tab.label
              ? "bg-blue-50 border-blue-500 text-blue-600 font-semibold"
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
        >
          {tab.icon}
          <span className="text-sm">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export default PromotionTabs;
