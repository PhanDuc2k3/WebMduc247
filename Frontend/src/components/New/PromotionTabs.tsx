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
    <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100 p-4 flex flex-wrap gap-3 mb-8 animate-fade-in-up">
      {tabs.map((tab, index) => (
        <button
          key={tab.label}
          onClick={() => setActiveTab(tab.label)}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 font-bold transition-all duration-300 transform hover:scale-105 ${
            activeTab === tab.label
              ? "bg-gradient-to-r from-blue-500 to-purple-500 border-transparent text-white shadow-lg scale-105"
              : "bg-gradient-to-r from-gray-50 to-white border-gray-200 text-gray-700 hover:border-purple-400 hover:bg-purple-50"
          }`}
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          {tab.icon}
          <span className="text-sm">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export default PromotionTabs;
