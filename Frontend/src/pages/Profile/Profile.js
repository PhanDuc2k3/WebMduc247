import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { User, Lock, X } from "lucide-react";
import ProfileInfo from "../../components/Profile/ProfileInfo/ProfileInfo";
import ProfileTabs from "../../components/Profile/ProfileTabs/ProfileTabs";
import ProfileOrders from "../../components/Profile/ProfileOrders/ProfileOrders";
import ProfileFavorites from "../../components/Profile/ProfileFavorite/ProfileFavorites";
import ProfileSettings from "../../components/Profile/ProfileSettings/ProfileSetting";
import ProfileInfoDetail from "../../components/Profile/ProfileInfoDetail/ProfileInfoDetail";
import ProductReview from "../Review/Review";
import userApi from "../../api/userApi";
import orderApi from "../../api/orderApi";
import { toast } from "react-toastify";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
const Profile = () => {
    const [activeTab, setActiveTab] = useState("info");
    const [isEditing, setIsEditing] = useState(false);
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [reviewProductId, setReviewProductId] = useState(null);
    const [reviewOrderId, setReviewOrderId] = useState(null);
    // Change password states
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loadingPassword, setLoadingPassword] = useState(false);
    // 🧩 Lấy thông tin user
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await userApi.getProfile();
                setUser(res.data.user);
            }
            catch (error) {
                console.error("❌ Lỗi fetch user:", error);
            }
        };
        fetchUser();
    }, []);
    // 📦 Lấy danh sách đơn hàng
    useEffect(() => {
        const fetchOrders = async () => {
            if (!user)
                return;
            setLoadingOrders(true);
            try {
                const res = await orderApi.getMyOrders();
                console.log("📦 Orders mua:", res.data);
                const mappedOrders = res.data.map((order) => ({
                    _id: order._id,
                    date: new Date(order.createdAt).toLocaleDateString("vi-VN"),
                    total: order.total?.toLocaleString("vi-VN", {
                        style: "currency",
                        currency: "VND",
                    }),
                    items: order.items?.map((item) => ({
                        name: item.name,
                        qty: item.quantity,
                        price: item.price?.toLocaleString("vi-VN", {
                            style: "currency",
                            currency: "VND",
                        }),
                        imgUrl: item.imageUrl,
                        productId: typeof item.productId === "object"
                            ? item.productId._id
                            : item.productId,
                    })) || [],
                    statusHistory: order.statusHistory || [],
                    returnRequest: order.returnRequest || undefined,
                }));
                setOrders(mappedOrders);
            }
            catch (err) {
                console.error("🔥 Lỗi fetch orders:", err);
            }
            finally {
                setLoadingOrders(false);
            }
        };
        fetchOrders();
    }, [user]);
    if (!user) {
        return (_jsx("div", { className: "w-full py-8 md:py-16 flex items-center justify-center animate-fade-in p-4", children: _jsxs("div", { className: "text-center", children: [_jsx(User, { size: 48, className: "mx-auto mb-3 md:mb-4 animate-pulse text-[#4B5563]" }), _jsx("p", { className: "text-gray-600 text-sm md:text-lg font-medium", children: "\u0110ang t\u1EA3i th\u00F4ng tin ng\u01B0\u1EDDi d\u00F9ng..." })] }) }));
    }
    return (_jsxs("div", { className: "profile-page w-full p-3 md:p-4 lg:p-6 xl:px-8", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Trang cá nhân" }] }), _jsx("div", { className: "mb-4 md:mb-6 animate-fade-in-up delay-100", children: _jsx(ProfileInfo, { user: user, onEdit: () => setIsEditing(true) }) }), _jsx("div", { className: "mb-4 md:mb-6 animate-fade-in-up delay-200", children: _jsx(ProfileTabs, { activeTab: activeTab, setActiveTab: setActiveTab }) }), _jsxs("div", { className: "animate-fade-in-up delay-300", children: [activeTab === "info" && (_jsx(ProfileInfoDetail, { isEditing: isEditing, onCancel: () => setIsEditing(false), onUpdated: (newUser) => {
                            setUser(newUser);
                            setIsEditing(false);
                        }, user: user })), activeTab === "orders" && (_jsx(ProfileOrders, { orders: orders, loading: loadingOrders, onReview: (productId, orderId) => {
                            setReviewProductId(productId);
                            setReviewOrderId(orderId);
                        } })), activeTab === "favorites" && _jsx(ProfileFavorites, {}), activeTab === "settings" && (_jsx(ProfileSettings, { onChangePassword: () => setShowChangePassword(true), user: user, onUserUpdate: async () => {
                            // Refresh user data after 2FA changes
                            try {
                                const res = await userApi.getProfile();
                                setUser(res.data.user);
                            }
                            catch (error) {
                                console.error("Error refreshing user data:", error);
                            }
                        } }))] }), reviewProductId && reviewOrderId && (_jsx("div", { className: "fixed inset-0 flex items-center justify-center z-50 p-4", style: { backgroundColor: 'rgba(0, 0, 0, 0)' }, children: _jsx(ProductReview, { productId: reviewProductId, orderId: reviewOrderId, onClose: () => {
                        setReviewProductId(null);
                        setReviewOrderId(null);
                    } }) })), showChangePassword && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto", children: _jsxs("div", { className: "bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 relative animate-fade-in-up my-auto", children: [_jsx("button", { onClick: () => {
                                setShowChangePassword(false);
                                setOldPassword("");
                                setNewPassword("");
                                setConfirmPassword("");
                            }, className: "absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 transition-colors z-10", children: _jsx(X, { className: "w-5 h-5 sm:w-6 sm:h-6" }) }), _jsx("h2", { className: "text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6 text-gray-900", children: "\u0110\u1ED5i m\u1EADt kh\u1EA9u" }), _jsxs("form", { onSubmit: async (e) => {
                                e.preventDefault();
                                if (newPassword !== confirmPassword) {
                                    toast.error("Mật khẩu xác nhận không khớp.");
                                    return;
                                }
                                if (newPassword.length < 6) {
                                    toast.error("Mật khẩu mới phải có ít nhất 6 ký tự.");
                                    return;
                                }
                                setLoadingPassword(true);
                                try {
                                    const res = await userApi.changePassword({ oldPassword, newPassword });
                                    if (res.status === 200) {
                                        toast.success(res.data.message || "Đổi mật khẩu thành công!");
                                        setShowChangePassword(false);
                                        setOldPassword("");
                                        setNewPassword("");
                                        setConfirmPassword("");
                                    }
                                }
                                catch (err) {
                                    const message = err.response?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
                                    toast.error(message);
                                }
                                finally {
                                    setLoadingPassword(false);
                                }
                            }, className: "space-y-4 sm:space-y-5", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2", children: [_jsx(Lock, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4" }), "M\u1EADt kh\u1EA9u c\u0169"] }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-gray-500/10 to-gray-500/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300" }), _jsx("input", { type: "password", className: "relative w-full px-3 py-2.5 sm:px-4 sm:py-3 pl-10 sm:pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white transition-all duration-300 text-sm sm:text-base", placeholder: "Nh\u1EADp m\u1EADt kh\u1EA9u c\u0169", value: oldPassword, onChange: (e) => setOldPassword(e.target.value), required: true }), _jsx(Lock, { className: "absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2", children: [_jsx(Lock, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4" }), "M\u1EADt kh\u1EA9u m\u1EDBi"] }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-gray-500/10 to-gray-500/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300" }), _jsx("input", { type: "password", className: "relative w-full px-3 py-2.5 sm:px-4 sm:py-3 pl-10 sm:pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white transition-all duration-300 text-sm sm:text-base", placeholder: "Nh\u1EADp m\u1EADt kh\u1EA9u m\u1EDBi", value: newPassword, onChange: (e) => setNewPassword(e.target.value), required: true, minLength: 6 }), _jsx(Lock, { className: "absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2", children: [_jsx(Lock, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4" }), "X\u00E1c nh\u1EADn m\u1EADt kh\u1EA9u"] }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-gray-500/10 to-gray-500/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300" }), _jsx("input", { type: "password", className: "relative w-full px-3 py-2.5 sm:px-4 sm:py-3 pl-10 sm:pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white transition-all duration-300 text-sm sm:text-base", placeholder: "Nh\u1EADp l\u1EA1i m\u1EADt kh\u1EA9u m\u1EDBi", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), required: true, minLength: 6 }), _jsx(Lock, { className: "absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" })] }), confirmPassword && newPassword !== confirmPassword && (_jsx("p", { className: "text-red-500 text-xs mt-1", children: "M\u1EADt kh\u1EA9u x\u00E1c nh\u1EADn kh\u00F4ng kh\u1EDBp" }))] }), _jsx("button", { type: "submit", disabled: loadingPassword || newPassword !== confirmPassword || newPassword.length < 6, className: "relative w-full bg-[#4B5563] text-white py-3 sm:py-3.5 rounded-xl hover:bg-[#374151] transition-all duration-300 font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none", children: loadingPassword ? (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsx("span", { className: "w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" }), "\u0110ang x\u1EED l\u00FD..."] })) : ("Đổi mật khẩu") })] })] }) }))] }));
};
export default Profile;
