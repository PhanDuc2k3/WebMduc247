import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from "react";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import userApi from "../../api/userApi";
import { User, Phone, Mail, Lock, CheckCircle, Boxes, Eye, EyeOff } from "lucide-react";
const Register = () => {
    const [activeTab, setActiveTab] = useState("register");
    const navigate = useNavigate();
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const handleRegister = async (e) => {
        e.preventDefault();
        if (!acceptTerms) {
            toast.error("Bạn phải đồng ý với điều khoản sử dụng và chính sách bảo mật", {
                containerId: "general-toast",
            });
            return;
        }
        if (!fullName || !phone || !email || !password || !confirmPassword) {
            toast.error("Vui lòng nhập đầy đủ thông tin", {
                containerId: "general-toast",
            });
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Mật khẩu xác nhận không khớp", {
                containerId: "general-toast",
            });
            return;
        }
        setLoading(true);
        try {
            const res = await userApi.register({
                fullName,
                phone,
                email,
                password,
            });
            // Hiển thị toast và chuyển đến trang xác thực email
            toast.success(res.data.message || "Đăng ký thành công! Vui lòng kiểm tra email.", {
                containerId: "general-toast",
                autoClose: 2000,
                onClose: () => {
                    // Chuyển đến trang xác thực email với email trong state
                    navigate("/verify-email", {
                        state: { email: email }
                    });
                },
            });
        }
        catch (err) {
            toast.error(err.response?.data?.message || "Đăng ký thất bại, vui lòng thử lại", {
                containerId: "general-toast",
            });
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(_Fragment, { children: _jsxs("div", { className: "min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#4B5563]/10 via-white to-[#4B5563]/20 py-4 sm:py-8 px-4", children: [_jsxs("div", { className: "flex flex-col items-center mb-4 sm:mb-8 animate-fade-in-down", children: [_jsxs("div", { className: "relative mb-3 sm:mb-4", children: [_jsx("div", { className: "absolute inset-0 bg-[#4B5563] rounded-full blur-lg opacity-50 animate-pulse" }), _jsx("div", { className: "auth-brand-icon relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#4B5563] flex items-center justify-center shadow-lg", children: _jsx(Boxes, { className: "text-white w-8 h-8 sm:w-10 sm:h-10" }) })] }), _jsx("h1", { className: "auth-brand-name text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#4B5563] mb-2", children: "MDUC247" }), _jsx("p", { className: "text-gray-600 text-center text-sm sm:text-base lg:text-lg", children: "T\u1EA1o t\u00E0i kho\u1EA3n m\u1EDBi ngay h\u00F4m nay!" })] }), _jsxs("div", { className: "w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-gray-100 p-4 sm:p-6 md:p-8 lg:p-10 relative animate-fade-in-up", children: [_jsx("div", { className: "absolute inset-0 bg-[#4B5563]/5 rounded-3xl" }), _jsx("div", { className: "relative mb-8", children: _jsxs("div", { className: "flex bg-gradient-to-r from-gray-100 to-gray-50 rounded-2xl p-1 border border-gray-200 shadow-inner", children: [_jsx("button", { className: `w-1/2 py-3 text-center font-bold rounded-xl transition-all duration-300 ${activeTab === "login"
                                            ? "bg-[#4B5563] text-white shadow-lg scale-105"
                                            : "bg-transparent text-gray-600 hover:text-[#4B5563]"}`, onClick: () => {
                                            setActiveTab("login");
                                            navigate("/login");
                                        }, children: "\u0110\u0103ng nh\u1EADp" }), _jsx("button", { className: `w-1/2 py-3 text-center font-bold rounded-xl transition-all duration-300 ${activeTab === "register"
                                            ? "bg-[#4B5563] text-white shadow-lg scale-105"
                                            : "bg-transparent text-gray-600 hover:text-[#4B5563]"}`, onClick: () => {
                                            setActiveTab("register");
                                            navigate("/register");
                                        }, children: "\u0110\u0103ng k\u00FD" })] }) }), _jsx("h2", { className: "text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6 text-gray-900", children: "T\u1EA1o t\u00E0i kho\u1EA3n m\u1EDBi" }), _jsxs("form", { className: "space-y-4 sm:space-y-5", onSubmit: handleRegister, children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-xs sm:text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2", children: [_jsx(User, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4" }), _jsx("span", { children: "H\u1ECD v\u00E0 t\u00EAn" })] }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: "text", className: "w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-10 sm:pl-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] outline-none bg-white transition-all duration-300 text-sm sm:text-base", placeholder: "Nh\u1EADp h\u1ECD v\u00E0 t\u00EAn", value: fullName, onChange: (e) => setFullName(e.target.value) }), _jsx(User, { className: "absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs sm:text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2", children: [_jsx(Phone, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4" }), _jsx("span", { children: "S\u1ED1 \u0111i\u1EC7n tho\u1EA1i" })] }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: "text", className: "w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-10 sm:pl-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] outline-none bg-white transition-all duration-300 text-sm sm:text-base", placeholder: "Nh\u1EADp s\u1ED1 \u0111i\u1EC7n tho\u1EA1i", value: phone, onChange: (e) => setPhone(e.target.value) }), _jsx(Phone, { className: "absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs sm:text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2", children: [_jsx(Mail, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4" }), _jsx("span", { children: "Email" })] }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: "email", className: "w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-10 sm:pl-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] outline-none bg-white transition-all duration-300 text-sm sm:text-base", placeholder: "Nh\u1EADp email", value: email, onChange: (e) => setEmail(e.target.value) }), _jsx(Mail, { className: "absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs sm:text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2", children: [_jsx(Lock, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4" }), _jsx("span", { children: "M\u1EADt kh\u1EA9u" })] }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showPassword ? "text" : "password", className: "w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-10 sm:pl-12 pr-10 sm:pr-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] outline-none bg-white transition-all duration-300 text-sm sm:text-base", placeholder: "Nh\u1EADp m\u1EADt kh\u1EA9u", value: password, onChange: (e) => setPassword(e.target.value) }), _jsx(Lock, { className: "absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" }), _jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors", children: showPassword ? (_jsx(EyeOff, { className: "w-4 h-4 sm:w-5 sm:h-5" })) : (_jsx(Eye, { className: "w-4 h-4 sm:w-5 sm:h-5" })) })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs sm:text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2", children: [_jsx(CheckCircle, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4" }), _jsx("span", { children: "X\u00E1c nh\u1EADn m\u1EADt kh\u1EA9u" })] }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showConfirmPassword ? "text" : "password", className: "w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-10 sm:pl-12 pr-10 sm:pr-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] outline-none bg-white transition-all duration-300 text-sm sm:text-base", placeholder: "Nh\u1EADp l\u1EA1i m\u1EADt kh\u1EA9u", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value) }), _jsx(CheckCircle, { className: "absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" }), _jsx("button", { type: "button", onClick: () => setShowConfirmPassword(!showConfirmPassword), className: "absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors", children: showConfirmPassword ? (_jsx(EyeOff, { className: "w-4 h-4 sm:w-5 sm:h-5" })) : (_jsx(Eye, { className: "w-4 h-4 sm:w-5 sm:h-5" })) })] })] }), _jsxs("div", { className: "flex items-start gap-3 p-4 bg-[#4B5563]/10 border border-[#4B5563]/40 rounded-xl cursor-pointer hover:bg-[#4B5563]/20 transition-colors", onClick: () => setAcceptTerms(!acceptTerms), children: [_jsx("input", { type: "checkbox", id: "acceptTerms", checked: acceptTerms, onChange: (e) => setAcceptTerms(e.target.checked), onClick: (e) => e.stopPropagation(), className: "w-5 h-5 accent-[#4B5563] rounded mt-0.5 cursor-pointer flex-shrink-0 relative z-10" }), _jsxs("label", { htmlFor: "acceptTerms", className: "text-sm text-gray-700 cursor-pointer flex-1", children: ["T\u00F4i \u0111\u1ED3ng \u00FD v\u1EDBi", " ", _jsx(Link, { to: "/terms", onClick: (e) => {
                                                        e.stopPropagation();
                                                    }, className: "text-[#4B5563] hover:text-[#4B5563] hover:underline font-semibold relative z-20", children: "\u0110i\u1EC1u kho\u1EA3n s\u1EED d\u1EE5ng" }), " ", "v\u00E0", " ", _jsx(Link, { to: "/privacy", onClick: (e) => {
                                                        e.stopPropagation();
                                                    }, className: "text-[#4B5563] hover:text-[#4B5563] hover:underline font-semibold relative z-20", children: "Ch\u00EDnh s\u00E1ch b\u1EA3o m\u1EADt" })] })] }), _jsx("button", { type: "submit", disabled: loading, className: "relative w-full bg-[#4B5563] text-white py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl hover:bg-[#374151] transition-all duration-300 font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none", children: loading ? (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsx("span", { className: "w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" }), _jsx("span", { className: "text-xs sm:text-base", children: "\u0110ang x\u1EED l\u00FD..." })] })) : (_jsx("span", { className: "text-xs sm:text-base", children: "\u0110\u0103ng k\u00FD ngay" })) })] })] })] }) }));
};
export default Register;
