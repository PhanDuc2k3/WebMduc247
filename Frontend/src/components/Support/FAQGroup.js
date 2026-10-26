import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
const FAQGroup = ({ category, questions, icon: Icon }) => {
    const [openCategory, setOpenCategory] = useState(false);
    const [openQuestionIndex, setOpenQuestionIndex] = useState(null);
    return (_jsxs("div", { className: "border rounded shadow-sm", children: [_jsxs("button", { onClick: () => setOpenCategory(!openCategory), className: "w-full flex items-center justify-between p-3 font-medium text-left hover:bg-gray-100 transition-colors", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [Icon && _jsx(Icon, { className: "text-[#4B5563]", size: 20 }), _jsx("span", { children: category })] }), _jsx(ChevronDown, { className: `w-4 h-4 text-gray-500 transition-transform duration-300 ${openCategory ? "rotate-180 text-[#4B5563]" : ""}` })] }), openCategory && (_jsx("div", { className: "p-3 space-y-2 bg-gray-50", children: questions.map((qItem, idx) => (_jsxs("div", { className: "border-b last:border-b-0", children: [_jsxs("button", { onClick: () => setOpenQuestionIndex(openQuestionIndex === idx ? null : idx), className: "w-full text-left py-2 flex justify-between items-center hover:bg-gray-100 transition-colors", children: [_jsx("span", { children: qItem.q }), _jsx(ChevronDown, { className: `w-4 h-4 text-gray-500 transition-transform duration-300 ${openQuestionIndex === idx ? "rotate-180 text-[#4B5563]" : ""}` })] }), openQuestionIndex === idx && (_jsx("p", { className: "pl-2 py-2 text-gray-700", children: qItem.a }))] }, idx))) }))] }));
};
export default FAQGroup;
