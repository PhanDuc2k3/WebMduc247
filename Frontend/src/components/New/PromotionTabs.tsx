import React from "react";

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
    <div className="canva-public-page__toolbar flex flex-wrap gap-2 md:gap-3 animate-fade-in-up">
      {tabs.map((tab, index) => (
        <button
          key={tab.label}
          onClick={() => setActiveTab(tab.label)}
          className={`flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl border font-bold transition-all duration-200 ${
            activeTab === tab.label
              ? "bg-[#476de4] border-[#476de4] text-white shadow-md"
              : "bg-white border-[#e8edf5] text-[#586a84] hover:border-[#476de4] hover:text-[#476de4]"
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
