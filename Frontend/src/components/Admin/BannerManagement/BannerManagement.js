import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/Admin/BannerManagement/BannerManagement.tsx
import React, { useEffect, useState } from "react";
import { Image, Megaphone, Sparkles, FileText, Link as LinkIcon, Camera, Save, Trash2, Loader2, Plus } from "lucide-react";
import ConfirmDialog from "../../ui/ConfirmDialog";
import bannerApi from "../../../api/bannerApi";
import { toast } from "react-toastify";
const BannerManagement = () => {
    const [mainBanners, setMainBanners] = useState([]);
    const [subBanners, setSubBanners] = useState([]);
    const [files, setFiles] = useState({});
    const [loading, setLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, banner: null });
    const fetchBanners = async () => {
        try {
            const mainRes = await bannerApi.getBannersByType("main");
            setMainBanners(mainRes.data || []);
            const subRes = await bannerApi.getBannersByType("sub");
            setSubBanners(subRes.data || []);
        }
        catch (err) {
            console.error("Lỗi khi fetch banner:", err);
            setMainBanners([]);
            setSubBanners([]);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchBanners();
    }, []);
    const handleFileChange = (bannerId, file) => {
        setFiles(prev => ({ ...prev, [bannerId]: file }));
    };
    const updateBannerState = (bannerId, field, value) => {
        if (mainBanners.some(b => b._id === bannerId)) {
            setMainBanners(mainBanners.map(b => (b._id === bannerId ? { ...b, [field]: value } : b)));
        }
        else {
            setSubBanners(subBanners.map(b => (b._id === bannerId ? { ...b, [field]: value } : b)));
        }
    };
    const handleSave = async (banner) => {
        if (!files[banner._id] && !banner.imageUrl) {
            toast.warning("Vui lòng chọn ảnh trước khi lưu!");
            return;
        }
        try {
            if (banner._id.includes("placeholder")) {
                // tạo banner mới
                const res = await bannerApi.createBanner({
                    title: banner.title,
                    link: banner.link,
                    type: banner.type,
                    imageFile: files[banner._id] || undefined,
                });
                toast.success("Đã tạo banner mới!");
                await fetchBanners(); // Refresh danh sách
                setFiles(prev => {
                    const newFiles = { ...prev };
                    delete newFiles[banner._id];
                    return newFiles;
                });
            }
            else {
                // cập nhật banner hiện tại
                await bannerApi.updateBanner(banner._id, {
                    title: banner.title,
                    link: banner.link,
                    imageFile: files[banner._id] || undefined,
                });
                toast.success("Đã lưu banner!");
                await fetchBanners(); // Refresh danh sách
                setFiles(prev => {
                    const newFiles = { ...prev };
                    delete newFiles[banner._id];
                    return newFiles;
                });
            }
        }
        catch (err) {
            console.error(err);
            toast.error("Lỗi khi lưu banner!");
        }
    };
    const handleDeleteBanner = async (banner) => {
        if (banner._id.includes("placeholder")) {
            // Nếu là placeholder, chỉ xóa khỏi state
            if (banner.type === "main") {
                setMainBanners(prev => prev.filter(b => b._id !== banner._id));
            }
            else {
                setSubBanners(prev => prev.filter(b => b._id !== banner._id));
            }
            setFiles(prev => {
                const newFiles = { ...prev };
                delete newFiles[banner._id];
                return newFiles;
            });
            return;
        }
        setDeleteConfirm({ open: true, banner });
    };
    const handleDelete = async () => {
        if (!deleteConfirm.banner)
            return;
        const banner = deleteConfirm.banner;
        setDeleteConfirm({ open: false, banner: null });
        try {
            await bannerApi.deleteBanner(banner._id);
            toast.success("Đã xóa banner!");
            await fetchBanners(); // Refresh danh sách
        }
        catch (err) {
            console.error(err);
            toast.error("Lỗi khi xóa banner!");
        }
    };
    const handleAddBanner = (type) => {
        const newBanner = {
            _id: `${type}-placeholder-${Date.now()}`,
            title: "",
            link: "",
            imageUrl: "/placeholder.png",
            type: type,
        };
        if (type === "main") {
            setMainBanners([...mainBanners, newBanner]);
        }
        else {
            setSubBanners([...subBanners, newBanner]);
        }
    };
    if (loading)
        return (_jsxs("div", { className: "flex flex-col items-center justify-center py-12 md:py-20", children: [_jsx(Loader2, { className: "w-12 h-12 md:w-16 md:h-16 text-pink-500 animate-spin mb-4" }), _jsx("p", { className: "text-gray-600 text-sm md:text-lg font-medium", children: "\u0110ang t\u1EA3i banner..." })] }));
    const allBanners = [
        ...mainBanners.map(b => ({ ...b, type: "main" })),
        ...subBanners.map(b => ({ ...b, type: "sub" }))
    ];
    return (_jsxs("div", { className: "p-3 sm:p-4 md:p-6 lg:p-8", children: [_jsxs("div", { className: "mb-4 sm:mb-6 animate-fade-in-down", children: [_jsxs("h2", { className: "text-xl sm:text-2xl md:text-3xl font-bold mb-2 gradient-text flex items-center gap-2", children: [_jsx(Image, { className: "w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" }), _jsx("span", { children: "Qu\u1EA3n l\u00FD Banner" })] }), _jsx("p", { className: "text-gray-600 text-xs sm:text-sm md:text-base", children: "Qu\u1EA3n l\u00FD banner ch\u00EDnh v\u00E0 banner ph\u1EE5. Th\u00EAm, ch\u1EC9nh s\u1EEDa ho\u1EB7c x\u00F3a banner." })] }), _jsx("div", { className: "mb-4 sm:mb-6 animate-fade-in-up", children: _jsx("div", { className: "bg-purple-600 rounded-lg md:rounded-xl p-4 md:p-6 shadow-lg", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white text-xs md:text-sm font-medium mb-1", children: "T\u1ED5ng s\u1ED1 banner" }), _jsx("p", { className: "text-white text-2xl md:text-4xl font-bold", children: allBanners.length.toLocaleString('vi-VN') })] }), _jsx(Image, { className: "w-12 h-12 md:w-16 md:h-16 text-white opacity-80" })] }) }) }), _jsxs("div", { className: "mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3", children: [_jsxs("button", { onClick: () => handleAddBanner("main"), className: "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-lg sm:rounded-xl font-semibold sm:font-bold text-xs sm:text-sm shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2", children: [_jsx(Plus, { className: "w-4 h-4 sm:w-5 sm:h-5" }), _jsx("span", { children: "Th\u00EAm Banner Ch\u00EDnh" })] }), _jsxs("button", { onClick: () => handleAddBanner("sub"), className: "bg-green-500 hover:bg-green-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-lg sm:rounded-xl font-semibold sm:font-bold text-xs sm:text-sm shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2", children: [_jsx(Plus, { className: "w-4 h-4 sm:w-5 sm:h-5" }), _jsx("span", { children: "Th\u00EAm Banner Ph\u1EE5" })] })] }), _jsx("div", { className: "space-y-4 sm:space-y-6", children: allBanners.map((b, idx) => (_jsx("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden animate-fade-in-up hover:shadow-2xl transition-all duration-300", style: { animationDelay: `${idx * 0.1}s` }, children: _jsxs("div", { className: "p-4 sm:p-5 md:p-6", children: [_jsx("div", { className: "flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4", children: _jsx("span", { className: `px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 ${b.type === "main"
                                        ? "bg-blue-500 text-white shadow-lg"
                                        : "bg-green-500 text-white shadow-lg"}`, children: b.type === "main" ? (_jsxs(_Fragment, { children: [_jsx(Megaphone, { className: "w-3 h-3 sm:w-4 sm:h-4" }), _jsx("span", { children: "Banner Ch\u00EDnh" })] })) : (_jsxs(_Fragment, { children: [_jsx(Sparkles, { className: "w-3 h-3 sm:w-4 sm:h-4" }), _jsx("span", { children: "Banner Ph\u1EE5" })] })) }) }), _jsxs("div", { className: "space-y-3 sm:space-y-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5", children: [_jsx(FileText, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4" }), _jsx("span", { children: "Ti\u00EAu \u0111\u1EC1" })] }), _jsx("input", { type: "text", value: b.title, placeholder: "Nh\u1EADp ti\u00EAu \u0111\u1EC1 banner", className: "w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300", onChange: e => updateBannerState(b._id, "title", e.target.value) })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5", children: [_jsx(LinkIcon, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4" }), _jsx("span", { children: "Link" })] }), _jsx("input", { type: "text", value: b.link || "", placeholder: "Nh\u1EADp link chuy\u1EC3n h\u01B0\u1EDBng", className: "w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300", onChange: e => updateBannerState(b._id, "link", e.target.value) })] }), (files[b._id] || b.imageUrl) && (_jsxs("div", { children: [_jsxs("label", { className: "block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5", children: [_jsx(Image, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4" }), _jsx("span", { children: "\u1EA2nh hi\u1EC7n t\u1EA1i" })] }), _jsx("img", { src: files[b._id] ? URL.createObjectURL(files[b._id]) : b.imageUrl, alt: b.title || "Banner", className: "w-[40%] h-32 sm:h-40 md:h-48 object-cover rounded-lg sm:rounded-xl shadow-md border-2 border-gray-200" })] })), _jsxs("div", { className: "flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 pt-2", children: [_jsxs("label", { className: "cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-lg sm:rounded-xl font-semibold sm:font-bold text-xs sm:text-sm shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2", children: [_jsx(Camera, { className: "w-4 h-4 sm:w-5 sm:h-5" }), _jsx("span", { children: "Ch\u1ECDn \u1EA3nh" }), _jsx("input", { type: "file", accept: "image/*", className: "hidden", onChange: e => e.target.files && handleFileChange(b._id, e.target.files[0]) })] }), _jsxs("button", { className: "bg-green-500 hover:bg-green-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-lg sm:rounded-xl font-semibold sm:font-bold text-xs sm:text-sm shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2", onClick: () => handleSave(b), children: [_jsx(Save, { className: "w-4 h-4 sm:w-5 sm:h-5" }), _jsx("span", { children: "L\u01B0u" })] }), _jsxs("button", { className: "bg-red-500 hover:bg-red-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-lg sm:rounded-xl font-semibold sm:font-bold text-xs sm:text-sm shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2", onClick: () => handleDeleteBanner(b), children: [_jsx(Trash2, { className: "w-4 h-4 sm:w-5 sm:h-5" }), _jsx("span", { children: "X\u00F3a banner" })] })] })] })] }) }, b._id))) }), _jsx(ConfirmDialog, { open: deleteConfirm.open, onClose: () => setDeleteConfirm({ open: false, banner: null }), onConfirm: handleDelete, title: "X\u00E1c nh\u1EADn x\u00F3a banner", message: "B\u1EA1n c\u00F3 ch\u1EAFc mu\u1ED1n x\u00F3a banner n\u00E0y kh\u00F4ng?", type: "danger", confirmText: "X\u00F3a" })] }));
};
export default BannerManagement;
