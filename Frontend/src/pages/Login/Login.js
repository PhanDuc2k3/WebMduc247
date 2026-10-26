import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "@/api/axiosClient";
import userApi from "@/api/userApi";
import { Mail, Lock, X, Boxes, Eye, EyeOff } from "lucide-react";
import { useChat } from "../../context/chatContext";
import { toast } from "react-toastify";
import { getSocket } from "../../socket";
const Login = () => {
    const [activeTab, setActiveTab] = useState("login");
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    // Load saved credentials on mount
    useEffect(() => {
        const savedEmail = localStorage.getItem("rememberedEmail");
        const savedPassword = localStorage.getItem("rememberedPassword");
        if (savedEmail && savedPassword) {
            setEmail(savedEmail);
            setPassword(savedPassword);
            setRemember(true);
        }
    }, []);
    // Forgot password states
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordStep, setForgotPasswordStep] = useState("email");
    const [forgotEmail, setForgotEmail] = useState("");
    const [resetCode, setResetCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const { setCurrentUserId } = useChat();
    const socket = getSocket();
    const handleLogin = async (e) => {
        e.preventDefault();
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error("Email không đúng định dạng. Vui lòng nhập lại.", {
                containerId: "general-toast",
            });
            return;
        }
        setLoading(true);
        try {
            const res = await axiosClient.post("/api/users/login", { email, password });
            if (res.status === 200) {
                const data = res.data;
                // Lưu token và user
                if (data.user) {
                    // ✅ Dự phòng cả _id và id (tránh lỗi undefined)
                    const userId = data.user._id || data.user.id;
                    const userData = {
                        _id: userId, // 🔹 luôn có id ở đây
                        fullName: data.user.fullName,
                        avatarUrl: data.user.avatarUrl || "",
                        role: data.user.role || undefined, // ✅ lưu role để AdminRoute có thể kiểm tra
                        online: true,
                        lastSeen: new Date().toISOString(),
                    };
                    // ✅ Lưu localStorage (bao gồm cả refresh token)
                    localStorage.setItem("user", JSON.stringify(userData));
                    localStorage.setItem("token", data.token);
                    if (data.refreshToken) {
                        localStorage.setItem("refreshToken", data.refreshToken);
                    }
                    // ✅ Lưu hoặc xóa thông tin đăng nhập nếu "Ghi nhớ mật khẩu"
                    if (remember) {
                        localStorage.setItem("rememberedEmail", email);
                        localStorage.setItem("rememberedPassword", password);
                    }
                    else {
                        localStorage.removeItem("rememberedEmail");
                        localStorage.removeItem("rememberedPassword");
                    }
                    window.dispatchEvent(new Event("userUpdated"));
                    // ✅ Cập nhật context và socket
                    if (userId) {
                        setCurrentUserId(userId);
                        if (socket && socket.connected) {
                            socket.emit("user_connected", userId);
                            console.log("[Login] ✅ Đã emit user_connected:", userId);
                        }
                        else {
                            console.warn("[Login] ⚠️ Socket chưa kết nối, không thể emit user_connected");
                        }
                    }
                    else {
                        console.error("[Login] ❌ Không tìm thấy userId trong phản hồi login", data.user);
                    }
                }
                // ✅ Hiển thị toast và chuyển đến trang chủ
                toast.success(data.message || "Đăng nhập thành công", {
                    position: "top-right",
                    containerId: "general-toast",
                    autoClose: 2000,
                });
                // Chuyển đến trang chủ ngay sau khi đăng nhập thành công
                setTimeout(() => {
                    navigate("/");
                }, 500);
            }
        }
        catch (err) {
            // Interceptor đã tự động hiển thị toast và điều hướng cho lỗi needsVerification
            // Không cần xử lý thêm ở đây để tránh trùng lặp
        }
        finally {
            setLoading(false);
        }
    };
    // Forgot password handlers
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setForgotLoading(true);
        try {
            const res = await userApi.forgotPassword({ email: forgotEmail });
            if (res.status === 200) {
                toast.success(res.data.message || "Mã đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email.", {
                    containerId: "general-toast",
                });
                setForgotPasswordStep("code");
            }
        }
        catch (err) {
            // Interceptor đã tự động hiển thị toast cho các lỗi
            // Không cần hiển thị lại toast ở đây
        }
        finally {
            setForgotLoading(false);
        }
    };
    const handleVerifyResetCode = async (e) => {
        e.preventDefault();
        setForgotLoading(true);
        try {
            const res = await userApi.verifyResetCode({ email: forgotEmail, resetCode });
            if (res.status === 200) {
                toast.success(res.data.message || "Mã xác thực hợp lệ.", {
                    containerId: "general-toast",
                });
                setForgotPasswordStep("password");
            }
        }
        catch (err) {
            // Interceptor đã tự động hiển thị toast cho các lỗi
            // Không cần hiển thị lại toast ở đây
        }
        finally {
            setForgotLoading(false);
        }
    };
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("Mật khẩu xác nhận không khớp.", {
                containerId: "general-toast",
            });
            return;
        }
        if (newPassword.length < 6) {
            toast.error("Mật khẩu phải có ít nhất 6 ký tự.", {
                containerId: "general-toast",
            });
            return;
        }
        setForgotLoading(true);
        try {
            const res = await userApi.resetPassword({
                email: forgotEmail,
                resetCode,
                newPassword
            });
            if (res.status === 200) {
                toast.success(res.data.message || "Đặt lại mật khẩu thành công!", {
                    containerId: "general-toast",
                });
                setShowForgotPassword(false);
                setForgotPasswordStep("email");
                setForgotEmail("");
                setResetCode("");
                setNewPassword("");
                setConfirmPassword("");
            }
        }
        catch (err) {
            // Interceptor đã tự động hiển thị toast cho các lỗi
            // Không cần hiển thị lại toast ở đây
        }
        finally {
            setForgotLoading(false);
        }
    };
    return (_jsxs("div", { className: "min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#4B5563]/10 via-white to-[#4B5563]/20 py-8 px-4", children: [_jsxs("div", { className: "flex flex-col items-center mb-8 animate-fade-in-down", children: [_jsxs("div", { className: "relative mb-4", children: [_jsx("div", { className: "absolute inset-0 bg-[#4B5563] rounded-full blur-lg opacity-50 animate-pulse" }), _jsx("div", { className: "auth-brand-icon relative w-20 h-20 rounded-2xl bg-[#4B5563] flex items-center justify-center shadow-lg", children: _jsx(Boxes, { className: "text-white w-10 h-10" }) })] }), _jsx("h1", { className: "auth-brand-name text-3xl lg:text-4xl font-extrabold text-[#4B5563] mb-2", children: "MDUC247" }), _jsx("p", { className: "text-gray-600 text-center text-lg", children: "Ch\u00E0o m\u1EEBng b\u1EA1n quay tr\u1EDF l\u1EA1i!" })] }), _jsxs("div", { className: "w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-gray-100 p-8 lg:p-10 relative animate-fade-in-up", children: [_jsx("div", { className: "absolute inset-0 bg-[#4B5563]/5 rounded-3xl pointer-events-none" }), _jsx("div", { className: "relative mb-8", children: _jsxs("div", { className: "flex bg-gradient-to-r from-gray-100 to-gray-50 rounded-2xl p-1 border border-gray-200 shadow-inner", children: [_jsx("button", { className: `w-1/2 py-3 text-center font-bold rounded-xl transition-all duration-300 ${activeTab === "login"
                                        ? "bg-[#4B5563] text-white shadow-lg scale-105"
                                        : "bg-transparent text-gray-600 hover:text-[#4B5563]"}`, onClick: () => {
                                        setActiveTab("login");
                                        navigate("/login");
                                    }, children: "\u0110\u0103ng nh\u1EADp" }), _jsx("button", { className: `w-1/2 py-3 text-center font-bold rounded-xl transition-all duration-300 ${activeTab === "register"
                                        ? "bg-[#4B5563] text-white shadow-lg scale-105"
                                        : "bg-transparent text-gray-600 hover:text-[#4B5563]"}`, onClick: () => {
                                        setActiveTab("register");
                                        navigate("/register");
                                    }, children: "\u0110\u0103ng k\u00FD" })] }) }), _jsx("h2", { className: "text-2xl font-bold text-center mb-6 text-gray-900", children: "\u0110\u0103ng nh\u1EADp v\u00E0o t\u00E0i kho\u1EA3n" }), _jsxs("form", { className: "space-y-5", onSubmit: handleLogin, children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2", children: [_jsx(Mail, { className: "w-4 h-4" }), "Email"] }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 bg-[#4B5563]/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300" }), _jsx("input", { type: "text", className: "relative w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] outline-none bg-white transition-all duration-300", placeholder: "Nh\u1EADp email", value: email, onChange: (e) => setEmail(e.target.value) }), _jsx(Mail, { className: "absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2", children: [_jsx(Lock, { className: "w-4 h-4" }), "M\u1EADt kh\u1EA9u"] }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 bg-[#4B5563]/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300" }), _jsx("input", { type: showPassword ? "text" : "password", className: "relative w-full px-4 py-3 pl-12 pr-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] outline-none bg-white transition-all duration-300", placeholder: "Nh\u1EADp m\u1EADt kh\u1EA9u", value: password, onChange: (e) => setPassword(e.target.value) }), _jsx(Lock, { className: "absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" }), _jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors", children: showPassword ? (_jsx(EyeOff, { className: "w-5 h-5" })) : (_jsx(Eye, { className: "w-5 h-5" })) })] })] }), _jsxs("div", { className: "flex items-center justify-between py-2", children: [_jsxs("label", { className: "flex items-center gap-2 text-sm text-gray-600 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: remember, onChange: (e) => setRemember(e.target.checked), className: "w-4 h-4 accent-[#4B5563] rounded" }), "Ghi nh\u1EDB \u0111\u0103ng nh\u1EADp"] }), _jsx("button", { type: "button", onClick: (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowForgotPassword(true);
                                        }, className: "text-sm font-semibold text-[#4B5563] hover:text-[#4B5563] hover:underline transition-colors duration-200 cursor-pointer bg-transparent border-none outline-none focus:outline-none focus:ring-2 focus:ring-[#4B5563] focus:ring-offset-2 rounded px-1", children: "Qu\u00EAn m\u1EADt kh\u1EA9u?" })] }), _jsx("button", { type: "submit", disabled: loading, className: "relative w-full bg-[#4B5563] text-white py-3.5 rounded-xl hover:bg-[#374151] transition-all duration-300 font-bold text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none", children: loading ? (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsx("span", { className: "w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" }), "\u0110ang x\u1EED l\u00FD..."] })) : ("Đăng nhập ngay") })] })] }), showForgotPassword && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4", children: _jsxs("div", { className: "bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md p-4 sm:p-6 md:p-8 relative animate-fade-in-up max-h-[90vh] overflow-y-auto", children: [_jsx("button", { onClick: () => {
                                setShowForgotPassword(false);
                                setForgotPasswordStep("email");
                                setForgotEmail("");
                                setResetCode("");
                                setNewPassword("");
                                setConfirmPassword("");
                            }, className: "absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors", children: _jsx(X, { className: "w-6 h-6" }) }), _jsxs("h2", { className: "text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6 text-gray-900", children: [forgotPasswordStep === "email" && "Quên mật khẩu", forgotPasswordStep === "code" && "Nhập mã xác thực", forgotPasswordStep === "password" && "Đặt lại mật khẩu"] }), forgotPasswordStep === "email" && (_jsxs("form", { onSubmit: handleForgotPassword, className: "space-y-4 sm:space-y-5", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-xs sm:text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2", children: [_jsx(Mail, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4" }), _jsx("span", { children: "Email" })] }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 bg-[#4B5563]/10 rounded-lg sm:rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300" }), _jsx("input", { type: "email", className: "relative w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-10 sm:pl-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] outline-none bg-white transition-all duration-300 text-sm sm:text-base", placeholder: "Nh\u1EADp email c\u1EE7a b\u1EA1n", value: forgotEmail, onChange: (e) => setForgotEmail(e.target.value), required: true }), _jsx(Mail, { className: "absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" })] })] }), _jsx("button", { type: "submit", disabled: forgotLoading, className: "relative w-full bg-[#4B5563] text-white py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl hover:bg-[#374151] transition-all duration-300 font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none", children: forgotLoading ? (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsx("span", { className: "w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" }), _jsx("span", { className: "text-xs sm:text-base", children: "\u0110ang g\u1EEDi..." })] })) : (_jsx("span", { className: "text-xs sm:text-base", children: "G\u1EEDi m\u00E3 x\u00E1c th\u1EF1c" })) })] })), forgotPasswordStep === "code" && (_jsxs("form", { onSubmit: handleVerifyResetCode, className: "space-y-4 sm:space-y-5", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed", children: ["Ch\u00FAng t\u00F4i \u0111\u00E3 g\u1EEDi m\u00E3 x\u00E1c th\u1EF1c \u0111\u1EBFn email ", _jsx("strong", { className: "break-all", children: forgotEmail }), ". Vui l\u00F2ng ki\u1EC3m tra v\u00E0 nh\u1EADp m\u00E3 b\u00EAn d\u01B0\u1EDBi."] }), _jsx("label", { className: "block text-xs sm:text-sm font-semibold mb-2 text-gray-700", children: "M\u00E3 x\u00E1c th\u1EF1c (6 ch\u1EEF s\u1ED1)" }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-gray-500/10 to-gray-500/10 rounded-lg sm:rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300" }), _jsx("input", { type: "text", className: "relative w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white transition-all duration-300 text-center text-xl sm:text-2xl font-bold tracking-widest", placeholder: "000000", value: resetCode, onChange: (e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6)), maxLength: 6, required: true })] })] }), _jsx("button", { type: "submit", disabled: forgotLoading || resetCode.length !== 6, className: "relative w-full bg-gradient-to-r from-gray-500 to-gray-700 text-white py-3.5 rounded-xl hover:from-gray-600 hover:to-gray-800 transition-all duration-300 font-bold text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none", children: forgotLoading ? (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsx("span", { className: "w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" }), "\u0110ang x\u00E1c th\u1EF1c..."] })) : ("Xác thực mã") }), _jsx("button", { type: "button", onClick: () => {
                                        setForgotPasswordStep("email");
                                        setResetCode("");
                                    }, className: "w-full text-sm text-[#4B5563] hover:text-[#4B5563] hover:underline transition-colors duration-200", children: "Quay l\u1EA1i nh\u1EADp email" })] })), forgotPasswordStep === "password" && (_jsxs("form", { onSubmit: handleResetPassword, className: "space-y-4 sm:space-y-5", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-xs sm:text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2", children: [_jsx(Lock, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4" }), _jsx("span", { children: "M\u1EADt kh\u1EA9u m\u1EDBi" })] }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 bg-[#4B5563]/10 rounded-lg sm:rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300" }), _jsx("input", { type: "password", className: "relative w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-10 sm:pl-12 pr-10 sm:pr-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] outline-none bg-white transition-all duration-300 text-sm sm:text-base", placeholder: "Nh\u1EADp m\u1EADt kh\u1EA9u m\u1EDBi", value: newPassword, onChange: (e) => setNewPassword(e.target.value), required: true, minLength: 6 }), _jsx(Lock, { className: "absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs sm:text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2", children: [_jsx(Lock, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4" }), _jsx("span", { children: "X\u00E1c nh\u1EADn m\u1EADt kh\u1EA9u" })] }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 bg-[#4B5563]/10 rounded-lg sm:rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300" }), _jsx("input", { type: "password", className: "relative w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-10 sm:pl-12 pr-10 sm:pr-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] outline-none bg-white transition-all duration-300 text-sm sm:text-base", placeholder: "Nh\u1EADp l\u1EA1i m\u1EADt kh\u1EA9u m\u1EDBi", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), required: true, minLength: 6 }), _jsx(Lock, { className: "absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" })] }), confirmPassword && newPassword !== confirmPassword && (_jsx("p", { className: "text-red-500 text-xs mt-1", children: "M\u1EADt kh\u1EA9u x\u00E1c nh\u1EADn kh\u00F4ng kh\u1EDBp" }))] }), _jsx("button", { type: "submit", disabled: forgotLoading || newPassword !== confirmPassword || newPassword.length < 6, className: "relative w-full bg-[#4B5563] text-white py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl hover:bg-[#374151] transition-all duration-300 font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none", children: forgotLoading ? (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsx("span", { className: "w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" }), _jsx("span", { className: "text-xs sm:text-base", children: "\u0110ang x\u1EED l\u00FD..." })] })) : (_jsx("span", { className: "text-xs sm:text-base", children: "\u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u" })) }), _jsx("button", { type: "button", onClick: () => {
                                        setForgotPasswordStep("code");
                                        setNewPassword("");
                                        setConfirmPassword("");
                                    }, className: "w-full text-xs sm:text-sm text-[#4B5563] hover:text-[#4B5563] hover:underline transition-colors duration-200", children: "Quay l\u1EA1i nh\u1EADp m\u00E3" })] }))] }) }))] }));
};
export default Login;
