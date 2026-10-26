import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import adminStatisticsApi from "../../../api/adminStatisticsApi";
const SellerBox = () => {
    const [showBox, setShowBox] = useState(false);
    const [stats, setStats] = useState({});
    const navigate = useNavigate();
    useEffect(() => {
        try {
            const userData = localStorage.getItem("user");
            if (userData) {
                const user = JSON.parse(userData);
                if (user.role === "seller" || user.role === "admin") {
                    setShowBox(false);
                    return;
                }
            }
            setShowBox(true);
        }
        catch (err) {
            console.error("❌ Lỗi khi đọc localStorage:", err);
            setShowBox(true);
        }
    }, []);
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await adminStatisticsApi.getDashboardStats();
                if (res.data) {
                    setStats({
                        totalUsers: res.data.totalUsers || 0,
                        totalStores: res.data.totalStores || 0,
                        totalProducts: res.data.totalProducts || 0,
                    });
                }
            }
            catch (err) {
                console.error("❌ Lỗi khi lấy thống kê:", err);
            }
        };
        if (showBox) {
            fetchStats();
        }
    }, [showBox]);
    const handleRegisterClick = () => {
        navigate("/mystore");
    };
    if (!showBox)
        return null;
    return (_jsx("section", { className: "mt-4 sm:mt-6 sm:mt-8 md:mt-12", children: _jsx("div", { className: "bg-[#4B5563] text-white rounded-lg sm:rounded-xl sm:rounded-2xl md:rounded-3xl px-3 sm:px-4 sm:px-6 md:px-12 py-5 sm:py-6 sm:py-8 md:py-10 lg:py-14 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 sm:gap-6 md:gap-8 shadow-2xl", children: _jsx("div", { className: "w-full", children: _jsxs("div", { className: "text-center md:text-left flex-1", children: [_jsx("h3", { className: "text-base xs:text-lg sm:text-xl md:text-[1.5rem] lg:text-[2rem] font-extrabold mb-2 sm:mb-2 sm:mb-3", children: "B\u00E1n h\u00E0ng c\u00F9ng MDUC247" }), _jsx("p", { className: "text-xs xs:text-sm sm:text-base md:text-lg mb-3 sm:mb-4 sm:mb-5 md:mb-6 opacity-95", children: "M\u1EDF c\u1EEDa h\u00E0ng online mi\u1EC5n ph\u00ED, ti\u1EBFp c\u1EADn h\u00E0ng tri\u1EC7u kh\u00E1ch h\u00E0ng tr\u00EAn to\u00E0n qu\u1ED1c." }), _jsxs("div", { className: "flex flex-wrap justify-center md:justify-start gap-1.5 sm:gap-2 sm:gap-3 md:gap-4 lg:gap-8 text-[10px] xs:text-xs sm:text-sm md:text-base mb-3 sm:mb-4 sm:mb-6 md:mb-8", children: [_jsxs("span", { className: "bg-white/15 px-2 sm:px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-semibold", children: [stats.totalUsers ? stats.totalUsers.toLocaleString("vi-VN") : "...", " ng\u01B0\u1EDDi mua"] }), _jsxs("span", { className: "bg-white/15 px-2 sm:px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-semibold", children: [stats.totalProducts ? stats.totalProducts.toLocaleString("vi-VN") : "...", " s\u1EA3n ph\u1EA9m"] }), _jsxs("span", { className: "bg-white/15 px-2 sm:px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-semibold", children: [stats.totalStores ? stats.totalStores.toLocaleString("vi-VN") : "...", " c\u1EEDa h\u00E0ng"] })] }), _jsxs("div", { className: "flex flex-col sm:flex-row justify-center md:justify-start gap-2 sm:gap-3 sm:gap-4", children: [_jsx("button", { onClick: handleRegisterClick, className: "flex-1 bg-white text-[#4B5563] font-bold rounded-lg sm:rounded-xl px-3 sm:px-4 sm:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base shadow-lg hover:shadow-xl hover:bg-[#f3f4ff] transition-all duration-300 transform hover:scale-105 active:scale-95 touch-manipulation flex items-center justify-center", children: "\u0110\u0103ng k\u00FD b\u00E1n h\u00E0ng" }), _jsx("button", { className: "flex-1 bg-transparent border border-white/70 text-white font-bold rounded-lg sm:rounded-xl px-3 sm:px-4 sm:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base hover:bg-white/10 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95 touch-manipulation flex items-center justify-center", children: "T\u00ECm hi\u1EC3u th\u00EAm" })] })] }) }) }) }));
};
export default SellerBox;
