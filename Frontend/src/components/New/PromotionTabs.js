import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
const PromotionTabs = ({ tabs, activeTab, setActiveTab }) => {
    return (_jsx("div", { className: "canva-public-page__toolbar flex flex-wrap gap-2 md:gap-3 animate-fade-in-up", children: tabs.map((tab, index) => (_jsxs("button", { onClick: () => setActiveTab(tab.label), className: `flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl border font-bold transition-all duration-200 ${activeTab === tab.label
                ? "bg-[#476de4] border-[#476de4] text-white shadow-md"
                : "bg-white border-[#e8edf5] text-[#586a84] hover:border-[#476de4] hover:text-[#476de4]"}`, style: { animationDelay: `${index * 0.05}s` }, children: [tab.icon, _jsx("span", { className: "text-sm", children: tab.label })] }, tab.label))) }));
};
export default PromotionTabs;
