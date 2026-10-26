import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Clock, Mail, ShieldCheck } from 'lucide-react';
const AdditionalInfoCard = () => {
    const infoBlocks = [
        {
            title: 'Giờ làm việc',
            content: ['Thứ 2 - Thứ 7: 8:00 - 22:00', 'Chủ nhật: 9:00 - 20:00'],
            icon: _jsx(Clock, { size: 24, className: "text-green-700" }),
            bgColor: 'bg-green-50',
        },
        {
            title: 'Thời gian phản hồi',
            content: ['Email: Trong vòng 24 giờ', 'Hotline: Ngay lập tức', 'Chat: 2-5 phút'],
            icon: _jsx(Mail, { size: 24, className: "text-blue-700" }),
            bgColor: 'bg-blue-50',
        },
        {
            title: 'Chính sách hỗ trợ',
            content: ['Miễn phí 100%', 'Hỗ trợ tận tình', 'Giải quyết nhanh chóng'],
            icon: _jsx(ShieldCheck, { size: 24, className: "text-purple-700" }),
            bgColor: 'bg-purple-50',
        },
    ];
    return (_jsx("section", { className: "flex flex-col md:flex-row gap-6 max-w-6xl mx-auto", children: infoBlocks.map((block, idx) => (_jsxs("div", { className: "bg-white w-full md:w-1/3 p-6 md:p-8 rounded-2xl border border-[#e8edf5] flex flex-col space-y-4 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg group animate-fade-in-up", style: { animationDelay: `${idx * 0.1}s` }, children: [_jsxs("div", { className: "flex items-center space-x-3 mb-2", children: [_jsx("div", { className: "p-4 rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110", children: block.icon }), _jsx("h3", { className: "text-xl font-black text-gray-900", children: block.title })] }), _jsx("div", { className: "flex flex-col space-y-2 text-sm text-gray-700 font-semibold", children: block.content.map((line, i) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-lg", children: "\u2713" }), _jsx("span", { children: line })] }, i))) })] }, idx))) }));
};
export default AdditionalInfoCard;
