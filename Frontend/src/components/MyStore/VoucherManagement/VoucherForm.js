import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { X, Store } from "lucide-react";
import voucherApi from "../../../api/voucherApi";
import storeApi from "../../../api/storeApi";
const VoucherForm = ({ onClose, onSuccess, voucher }) => {
    // Khởi tạo form data từ voucher (nếu edit) hoặc giá trị mặc định (nếu tạo mới)
    const initializeFormData = () => {
        if (voucher) {
            // Format dates cho input type="date" (YYYY-MM-DD)
            const formatDate = (dateString) => {
                if (!dateString)
                    return "";
                const date = new Date(dateString);
                return date.toISOString().split("T")[0];
            };
            return {
                code: voucher.code || "",
                title: voucher.title || "",
                description: voucher.description || "",
                condition: voucher.condition || "",
                discountType: voucher.discountType || "fixed",
                discountValue: voucher.discountValue || 0,
                minOrderValue: voucher.minOrderValue || 0,
                maxDiscount: voucher.maxDiscount || 0,
                startDate: formatDate(voucher.startDate),
                endDate: formatDate(voucher.endDate),
                usageLimit: voucher.usageLimit || 100,
            };
        }
        return {
            code: "",
            title: "",
            description: "",
            condition: "",
            discountType: "fixed",
            discountValue: 0,
            minOrderValue: 0,
            maxDiscount: 0,
            startDate: "",
            endDate: "",
            usageLimit: 100,
        };
    };
    const [formData, setFormData] = useState(initializeFormData());
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [storeName, setStoreName] = useState("");
    // Lấy thông tin cửa hàng của seller
    useEffect(() => {
        const fetchStoreInfo = async () => {
            try {
                const res = await storeApi.getMyStore();
                const store = res.data.store || res.data;
                if (store?.name) {
                    setStoreName(store.name);
                }
            }
            catch (err) {
                console.error("Lỗi khi lấy thông tin cửa hàng:", err);
            }
        };
        fetchStoreInfo();
    }, []);
    // Cập nhật form data khi voucher prop thay đổi
    useEffect(() => {
        if (voucher) {
            const formatDate = (dateString) => {
                if (!dateString)
                    return "";
                const date = new Date(dateString);
                return date.toISOString().split("T")[0];
            };
            setFormData({
                code: voucher.code || "",
                title: voucher.title || "",
                description: voucher.description || "",
                condition: voucher.condition || "",
                discountType: voucher.discountType || "fixed",
                discountValue: voucher.discountValue || 0,
                minOrderValue: voucher.minOrderValue || 0,
                maxDiscount: voucher.maxDiscount || 0,
                startDate: formatDate(voucher.startDate),
                endDate: formatDate(voucher.endDate),
                usageLimit: voucher.usageLimit || 100,
            });
        }
        else {
            // Reset về giá trị mặc định khi không có voucher (tạo mới)
            setFormData({
                code: "",
                title: "",
                description: "",
                condition: "",
                discountType: "fixed",
                discountValue: 0,
                minOrderValue: 0,
                maxDiscount: 0,
                startDate: "",
                endDate: "",
                usageLimit: 100,
            });
        }
    }, [voucher]);
    // Xử lý input
    const handleChange = (e) => {
        const { name, type, value } = e.target;
        let newValue;
        if (type === "checkbox") {
            // Cast e.target thành HTMLInputElement để lấy checked
            newValue = e.target.checked;
        }
        else if (type === "number") {
            newValue = Number(value);
        }
        else if (name === "discountType") {
            newValue = value === "percent" ? "percent" : "fixed";
        }
        else {
            newValue = value;
        }
        setFormData((prev) => ({
            ...prev,
            [name]: newValue,
        }));
    };
    // Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        try {
            // Chuẩn hóa data gửi lên API
            // Lưu ý: Seller không được gửi global, categories, stores
            // Backend sẽ tự động gán voucher cho cửa hàng của seller
            const dataToSend = {
                code: formData.code,
                title: formData.title || "",
                description: formData.description,
                condition: formData.condition || "",
                discountType: formData.discountType,
                discountValue: formData.discountValue,
                minOrderValue: formData.minOrderValue,
                startDate: formData.startDate,
                endDate: formData.endDate,
                usageLimit: formData.usageLimit,
            };
            // Chỉ gửi maxDiscount khi discountType là "percent"
            if (formData.discountType === "percent") {
                dataToSend.maxDiscount = formData.maxDiscount;
            }
            if (voucher?._id) {
                // Cập nhật voucher
                await voucherApi.updateVoucher(voucher._id, dataToSend);
                setMessage("✅ Cập nhật voucher thành công!");
            }
            else {
                // Tạo voucher mới
                await voucherApi.createVoucher(dataToSend);
                setMessage("✅ Tạo voucher thành công!");
                // Reset form chỉ khi tạo mới thành công
                setFormData({
                    code: "",
                    title: "",
                    description: "",
                    condition: "",
                    discountType: "fixed",
                    discountValue: 0,
                    minOrderValue: 0,
                    maxDiscount: 0,
                    startDate: "",
                    endDate: "",
                    usageLimit: 100,
                });
            }
            onSuccess?.();
        }
        catch (err) {
            console.error(err);
            setMessage(voucher ? "❌ Lỗi khi cập nhật voucher" : "❌ Lỗi khi tạo voucher");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "relative w-full h-full sm:h-auto sm:max-h-[90vh] bg-white p-5 sm:p-6 md:p-8 overflow-y-auto", children: [onClose && (_jsx("button", { type: "button", onClick: onClose, className: "absolute top-3 right-3 p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition", children: _jsx(X, { size: 18 }) })), _jsx("h2", { className: "text-2xl font-bold mb-4 text-center", children: voucher ? "Chỉnh sửa Voucher" : "Tạo Voucher Mới" }), storeName && (_jsx("div", { className: "mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg", children: _jsxs("div", { className: "flex items-start gap-2", children: [_jsx(Store, { className: "w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" }), _jsxs("div", { className: "text-sm text-blue-800", children: [_jsx("p", { className: "font-semibold mb-1", children: "Voucher s\u1EBD ch\u1EC9 \u00E1p d\u1EE5ng cho c\u1EEDa h\u00E0ng c\u1EE7a b\u1EA1n" }), _jsxs("p", { className: "text-blue-700", children: [_jsx("span", { className: "font-medium", children: "C\u1EEDa h\u00E0ng:" }), " ", storeName] }), _jsx("p", { className: "text-blue-600 text-xs mt-1", children: "S\u1ED1 ti\u1EC1n gi\u1EA3m gi\u00E1 s\u1EBD \u0111\u01B0\u1EE3c tr\u1EEB t\u1EEB doanh thu c\u1EE7a c\u1EEDa h\u00E0ng b\u1EA1n." })] })] }) })), message && _jsx("div", { className: "mb-3 text-center text-sm font-medium", children: message }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-3 text-sm", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "M\u00E3 voucher" }), _jsx("input", { type: "text", name: "code", value: formData.code, onChange: handleChange, required: true, className: "w-full border rounded-lg p-2", placeholder: "VD: SALE2025" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Ti\u00EAu \u0111\u1EC1" }), _jsx("input", { type: "text", name: "title", value: formData.title, onChange: handleChange, required: true, className: "w-full border rounded-lg p-2" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "M\u00F4 t\u1EA3" }), _jsx("textarea", { name: "description", value: formData.description, onChange: handleChange, required: true, className: "w-full border rounded-lg p-2" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "\u0110i\u1EC1u ki\u1EC7n \u00E1p d\u1EE5ng" }), _jsx("input", { type: "text", name: "condition", value: formData.condition, onChange: handleChange, required: true, className: "w-full border rounded-lg p-2" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Lo\u1EA1i gi\u1EA3m gi\u00E1" }), _jsxs("select", { name: "discountType", value: formData.discountType, onChange: handleChange, className: "w-full border rounded-lg p-2", children: [_jsx("option", { value: "fixed", children: "Gi\u1EA3m c\u1ED1 \u0111\u1ECBnh" }), _jsx("option", { value: "percent", children: "Gi\u1EA3m theo %" })] })] }), formData.discountType === "fixed" ? (_jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Gi\u00E1 tr\u1ECB gi\u1EA3m (\u20AB)" }), _jsx("input", { type: "number", name: "discountValue", value: formData.discountValue, onChange: handleChange, min: "0", required: true, className: "w-full border rounded-lg p-2", placeholder: "VD: 50000" })] })) : (_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Gi\u1EA3m theo %" }), _jsx("input", { type: "number", name: "discountValue", value: formData.discountValue, onChange: handleChange, min: "0", max: "100", required: true, className: "w-full border rounded-lg p-2", placeholder: "VD: 10" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Gi\u1EA3m t\u1ED1i \u0111a (\u20AB)" }), _jsx("input", { type: "number", name: "maxDiscount", value: formData.maxDiscount, onChange: handleChange, min: "0", required: true, className: "w-full border rounded-lg p-2", placeholder: "VD: 100000" })] })] })), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "\u0110\u01A1n h\u00E0ng t\u1ED1i thi\u1EC3u (\u20AB)" }), _jsx("input", { type: "number", name: "minOrderValue", value: formData.minOrderValue, onChange: handleChange, min: "0", className: "w-full border rounded-lg p-2", placeholder: "VD: 100000" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Ng\u00E0y b\u1EAFt \u0111\u1EA7u" }), _jsx("input", { type: "date", name: "startDate", value: formData.startDate, onChange: handleChange, className: "w-full border rounded-lg p-2" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Ng\u00E0y k\u1EBFt th\u00FAc" }), _jsx("input", { type: "date", name: "endDate", value: formData.endDate, onChange: handleChange, className: "w-full border rounded-lg p-2" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Gi\u1EDBi h\u1EA1n l\u01B0\u1EE3t d\u00F9ng" }), _jsx("input", { type: "number", name: "usageLimit", value: formData.usageLimit, onChange: handleChange, className: "w-full border rounded-lg p-2" })] }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition", children: loading ? (voucher ? "Đang cập nhật..." : "Đang tạo...") : (voucher ? "Cập nhật voucher" : "Tạo voucher") })] })] }));
};
export default VoucherForm;
