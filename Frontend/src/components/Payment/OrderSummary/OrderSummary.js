import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ShieldCheck, XCircle } from "lucide-react";
import cartApi from "../../../api/cartApi";
import addressApi from "../../../api/addressApi";
import orderApi from "../../../api/orderApi";
import paymentApi from "../../../api/paymentApi";
import walletApi from "../../../api/walletApi";
import productApi from "../../../api/productApi";
import { toast } from "react-toastify";
const OrderSummary = ({ shippingFee, paymentMethod, addressId, discount, shippingDiscount, productVoucherCode, freeshipVoucherCode, selectedProducts = [], }) => {
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [selectedCartSubtotal, setSelectedCartSubtotal] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false); // Chống double click
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const navigate = useNavigate();
    // 📦 Lấy giỏ hàng đầy đủ
    useEffect(() => {
        const fetchCart = async () => {
            try {
                const res = await cartApi.getCart();
                setCart(res.data);
            }
            catch (err) {
                console.error(err);
                setCart(null);
            }
            finally {
                setLoading(false);
            }
        };
        fetchCart();
    }, []);
    // 📦 Lấy subtotal các sản phẩm đã chọn
    useEffect(() => {
        const fetchSelectedSubtotal = async () => {
            try {
                const saved = localStorage.getItem("checkoutItems");
                if (!saved) {
                    setSelectedCartSubtotal(0);
                    return;
                }
                const parsed = JSON.parse(saved);
                // Kiểm tra nếu là mảng ID (format cũ) hoặc mảng objects (format mới)
                if (Array.isArray(parsed) && parsed.length > 0) {
                    if (typeof parsed[0] === "string") {
                        // Format cũ: mảng ID
                        const selectedIds = parsed;
                        if (!cart?.items) {
                            setSelectedCartSubtotal(0);
                            return;
                        }
                        const subtotal = cart.items
                            .filter((item) => selectedIds.includes(item._id))
                            .reduce((sum, item) => sum + item.subtotal, 0);
                        setSelectedCartSubtotal(subtotal);
                    }
                    else {
                        // Format mới: mảng objects
                        const products = parsed;
                        const subtotal = products.reduce((sum, item) => {
                            // Nếu có subtotal sẵn thì dùng, nếu không thì tính lại
                            if (item.subtotal) {
                                return sum + item.subtotal;
                            }
                            // Tính lại subtotal: (salePrice || price + additionalPrice) * quantity
                            const basePrice = item.salePrice || item.price || 0;
                            const additionalPrice = item.variation?.additionalPrice || 0;
                            const quantity = item.quantity || 0;
                            const itemSubtotal = (basePrice + additionalPrice) * quantity;
                            return sum + itemSubtotal;
                        }, 0);
                        setSelectedCartSubtotal(subtotal);
                    }
                }
                else {
                    setSelectedCartSubtotal(0);
                }
            }
            catch (err) {
                console.error(err);
                setSelectedCartSubtotal(0);
            }
        };
        fetchSelectedSubtotal();
    }, [cart]);
    // 📦 Lấy địa chỉ
    useEffect(() => {
        if (!addressId) {
            setSelectedAddress(null);
            return;
        }
        const fetchAddress = async () => {
            try {
                const res = await addressApi.getAddressById(addressId);
                setSelectedAddress(res.data);
            }
            catch (err) {
                console.error(err);
                setSelectedAddress(null);
            }
        };
        fetchAddress();
    }, [addressId]);
    // Tính phí sàn 10% trên subtotal
    const platformFee = Math.round(selectedCartSubtotal * 0.1);
    // Tổng tiền = subtotal + phí sàn - discount + shipping fee - shipping discount
    const total = Math.max(0, selectedCartSubtotal + platformFee - discount + shippingFee - (shippingDiscount || 0));
    const handleCheckout = async () => {
        // Chống double click - nếu đang xử lý thì return ngay
        if (isProcessing) {
            return;
        }
        if (!acceptedTerms) {
            toast.warning("Vui lòng đồng ý với điều khoản sử dụng và chính sách mua hàng.", { containerId: "general-toast" });
            return;
        }
        if (!selectedAddress) {
            toast.warning(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "text-yellow-500", size: 18 }), _jsx("span", { children: "Vui l\u00F2ng ch\u1ECDn \u0111\u1ECBa ch\u1EC9 giao h\u00E0ng!" })] }));
            return;
        }
        const selectedItemsSaved = localStorage.getItem("checkoutItems");
        if (!selectedItemsSaved) {
            toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-red-500", size: 18 }), _jsx("span", { children: "Kh\u00F4ng c\u00F3 s\u1EA3n ph\u1EA9m n\u00E0o \u0111\u1EC3 thanh to\u00E1n" })] }));
            return;
        }
        // Set processing = true ngay đầu để chặn double click
        setIsProcessing(true);
        try {
            const parsed = JSON.parse(selectedItemsSaved);
            let itemsForOrder = [];
            // Kiểm tra nếu là mảng ID (format cũ) hoặc mảng objects (format mới)
            if (Array.isArray(parsed) && parsed.length > 0) {
                if (typeof parsed[0] === "string") {
                    // Format cũ: mảng ID, cần lấy từ cart
                    const selectedItemIds = parsed;
                    if (!cart?.items) {
                        toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-red-500", size: 18 }), _jsx("span", { children: "Kh\u00F4ng l\u1EA5y \u0111\u01B0\u1EE3c d\u1EEF li\u1EC7u gi\u1ECF h\u00E0ng" })] }));
                        return;
                    }
                    itemsForOrder = cart.items
                        .filter(item => selectedItemIds.includes(item._id))
                        .map(item => ({
                        productId: typeof item.productId === 'string' ? item.productId : item.productId._id,
                        quantity: item.quantity,
                        variation: item.variation,
                    }));
                }
                else {
                    // Format mới: mảng objects, dùng trực tiếp
                    const products = parsed;
                    itemsForOrder = products.map((item) => ({
                        productId: typeof item.productId === 'string' ? item.productId : (item.productId?._id || item.productId),
                        quantity: item.quantity,
                        variation: item.variation,
                    }));
                }
            }
            if (!itemsForOrder.length) {
                toast.error("Không có sản phẩm nào để thanh toán", { containerId: "general-toast" });
                return;
            }
            const orderPayload = {
                items: itemsForOrder,
                shippingAddress: {
                    fullName: selectedAddress.fullName,
                    phone: selectedAddress.phone,
                    address: `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.country || ""}`,
                },
                paymentMethod,
                shippingFee: shippingFee, // Thêm phí vận chuyển vào payload
                productVoucherCode: productVoucherCode || undefined,
                freeshipVoucherCode: freeshipVoucherCode || undefined,
            };
            // === CONSOLE LOG để debug ===
            console.log("=== Payload gửi lên API createOrder ===");
            console.log(orderPayload);
            console.log("=== Selected Items ===");
            console.log(itemsForOrder);
            console.log("=== Shipping Address ===");
            console.log(selectedAddress);
            // ✅ Kiểm tra stock TRƯỚC KHI tạo đơn hàng
            try {
                const stockErrors = [];
                for (const item of itemsForOrder) {
                    try {
                        const productRes = await productApi.getProductById(item.productId);
                        const product = productRes.data.data || productRes.data;
                        if (!product) {
                            stockErrors.push(`Không tìm thấy sản phẩm với ID: ${item.productId}`);
                            continue;
                        }
                        // Kiểm tra sản phẩm có đang active không
                        if (!product.isActive) {
                            stockErrors.push(`Sản phẩm "${product.name}" đã ngừng bán`);
                            continue;
                        }
                        // Kiểm tra stock cho sản phẩm có variation
                        if (item.variation?.variationId && item.variation?.optionId) {
                            const variationId = String(item.variation.variationId);
                            const optionId = String(item.variation.optionId);
                            const variation = product.variations?.find((v) => v._id && v._id.toString() === variationId);
                            if (!variation) {
                                stockErrors.push(`Không tìm thấy biến thể cho sản phẩm "${product.name}"`);
                                continue;
                            }
                            const option = variation.options?.find((o) => o._id && o._id.toString() === optionId);
                            if (!option) {
                                stockErrors.push(`Không tìm thấy tùy chọn cho sản phẩm "${product.name}"`);
                                continue;
                            }
                            const currentStock = option.stock || 0;
                            if (currentStock < item.quantity) {
                                stockErrors.push(`Sản phẩm "${product.name}" (${variation.color || ''} - ${option.name || ''}) chỉ còn ${currentStock} sản phẩm trong kho. Bạn yêu cầu ${item.quantity} sản phẩm.`);
                            }
                        }
                        else {
                            // Kiểm tra stock cho sản phẩm không có variation
                            const currentStock = product.quantity || 0;
                            if (currentStock < item.quantity) {
                                stockErrors.push(`Sản phẩm "${product.name}" chỉ còn ${currentStock} sản phẩm trong kho. Bạn yêu cầu ${item.quantity} sản phẩm.`);
                            }
                        }
                    }
                    catch (err) {
                        console.error(`Lỗi kiểm tra stock cho sản phẩm ${item.productId}:`, err);
                        stockErrors.push(`Không thể kiểm tra tồn kho cho sản phẩm. Vui lòng thử lại.`);
                    }
                }
                // Nếu có lỗi stock, hiển thị và không cho tạo đơn
                if (stockErrors.length > 0) {
                    toast.error(_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "font-bold text-red-600", children: "Kh\u00F4ng \u0111\u1EE7 s\u1ED1 l\u01B0\u1EE3ng s\u1EA3n ph\u1EA9m trong kho:" }), stockErrors.map((error, index) => (_jsxs("div", { className: "text-sm", children: ["\u2022 ", error] }, index))), _jsx("div", { className: "text-sm mt-2", children: "Vui l\u00F2ng c\u1EADp nh\u1EADt gi\u1ECF h\u00E0ng v\u00E0 th\u1EED l\u1EA1i." })] }), {
                        containerId: "general-toast",
                        autoClose: 5000,
                    });
                    setIsProcessing(false);
                    return; // Dừng lại, không tạo đơn hàng
                }
            }
            catch (err) {
                console.error("=== Lỗi kiểm tra stock ===", err);
                toast.error("Không thể kiểm tra tồn kho. Vui lòng thử lại sau.", { containerId: "general-toast" });
                setIsProcessing(false);
                return; // Dừng lại, không tạo đơn hàng
            }
            // Kiểm tra số dư ví TRƯỚC KHI tạo đơn hàng (nếu thanh toán bằng ví)
            if (paymentMethod === "wallet") {
                try {
                    const walletRes = await walletApi.getWallet();
                    const walletBalance = walletRes.data.wallet.balance;
                    const estimatedTotal = total; // Sử dụng total đã tính
                    if (walletBalance < estimatedTotal) {
                        toast.warning(`Số dư ví không đủ! Số dư hiện tại: ${walletBalance.toLocaleString('vi-VN')}₫. Vui lòng nạp thêm tiền vào ví.`, { containerId: "general-toast" });
                        navigate('/wallet');
                        setIsProcessing(false);
                        return; // Dừng lại, không tạo đơn hàng
                    }
                }
                catch (err) {
                    console.error("=== Lỗi kiểm tra số dư ví ===", err);
                    toast.error("Không thể kiểm tra số dư ví. Vui lòng thử lại sau.", { containerId: "general-toast" });
                    setIsProcessing(false);
                    return; // Dừng lại, không tạo đơn hàng
                }
            }
            // Tạo đơn hàng
            const orderRes = await orderApi.createOrder(orderPayload);
            const orderData = orderRes.data;
            console.log("=== Response từ API createOrder ===");
            console.log(orderData);
            // Lưu order info vào localStorage (chỉ lưu khi đơn hàng được tạo thành công)
            localStorage.setItem("lastOrderId", orderData.order._id);
            localStorage.setItem("lastOrderCode", orderData.order.orderCode);
            // Xử lý thanh toán theo phương thức
            if (paymentMethod === "momo") {
                try {
                    const payRes = await paymentApi.createMoMoPayment({
                        amount: orderData.order.total,
                        orderInfo: `Thanh toán đơn hàng #${orderData.order.orderCode}`,
                        orderCode: orderData.order.orderCode,
                    });
                    const payData = payRes.data;
                    console.log("=== Response MoMo ===", payData);
                    if (!payData.payUrl) {
                        throw new Error(payData.message || "Không lấy được payUrl từ MoMo");
                    }
                    // Chỉ xóa checkoutItems khi thanh toán được tạo thành công
                    localStorage.removeItem("checkoutItems");
                    // Chuyển hướng đến trang thanh toán MoMo
                    window.location.href = payData.payUrl;
                    return;
                }
                catch (err) {
                    console.error("=== Lỗi tạo thanh toán MoMo ===", err);
                    toast.error("Không thể tạo thanh toán MoMo. Vui lòng thử lại sau.", { containerId: "general-toast" });
                    // Không xóa checkoutItems, giữ lại để người dùng có thể thử lại
                    return; // Dừng lại, không điều hướng
                }
            }
            if (paymentMethod === "vietqr") {
                try {
                    const payRes = await paymentApi.createVietQRPayment({
                        amount: orderData.order.total,
                        orderInfo: `Thanh toán đơn hàng #${orderData.order.orderCode}`,
                        orderCode: orderData.order.orderCode,
                    });
                    const payData = payRes.data;
                    console.log("=== Response VietQR ===", payData);
                    if (!payData.qrCodeUrl) {
                        throw new Error("Không lấy được QR code từ VietQR");
                    }
                    // Chỉ xóa checkoutItems khi QR code được tạo thành công
                    localStorage.removeItem("checkoutItems");
                    // Lưu thông tin QR code vào localStorage để hiển thị ở trang thanh toán
                    localStorage.setItem("vietqrData", JSON.stringify({
                        qrCodeUrl: payData.qrCodeUrl,
                        amount: payData.amount,
                        accountNo: payData.accountNo,
                        accountName: payData.accountName,
                        orderInfo: payData.orderInfo,
                        orderCode: orderData.order.orderCode,
                    }));
                    // Chuyển đến trang hiển thị QR code
                    navigate(`/payment-qr?orderCode=${encodeURIComponent(orderData.order.orderCode)}`);
                    return;
                }
                catch (err) {
                    console.error("=== Lỗi tạo thanh toán VietQR ===", err);
                    toast.error("Không thể tạo thanh toán VietQR. Vui lòng thử lại sau.", { containerId: "general-toast" });
                    // Không xóa checkoutItems, giữ lại để người dùng có thể thử lại
                    return; // Dừng lại, không điều hướng
                }
            }
            if (paymentMethod === "wallet") {
                // Với ví, tạo order và chuyển sang trang order để nhập mã xác thực
                // Không thanh toán ngay, để người dùng nhập mã trên trang order
                localStorage.removeItem("checkoutItems");
                // ✅ Lưu flag để tự động mở PaymentModal trên trang order
                localStorage.setItem("openWalletPayment", JSON.stringify({
                    orderId: orderData.order._id,
                    orderCode: orderData.order.orderCode,
                    timestamp: Date.now(),
                }));
                toast.success("Đơn hàng đã được tạo! Vui lòng nhập mã xác thực để thanh toán.", { containerId: "general-toast" });
                // Chuyển sang trang order
                navigate(`/order/${orderData.order._id}`);
                setIsProcessing(false);
                return;
            }
            // COD - không cần thanh toán ngay, xóa checkoutItems ngay
            localStorage.removeItem("checkoutItems");
            toast.success("Tạo đơn hàng thành công!", { containerId: "general-toast" });
            navigate(`/order/${orderData.order._id}`);
        }
        catch (err) {
            console.error("=== Lỗi handleCheckout ===", err);
            toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-red-500", size: 18 }), _jsx("span", { children: "\u0110\u00E3 x\u1EA3y ra l\u1ED7i khi t\u1EA1o \u0111\u01A1n h\u00E0ng. Vui l\u00F2ng th\u1EED l\u1EA1i sau." })] }), { containerId: "general-toast" });
        }
        finally {
            // Luôn set processing = false khi xong (thành công hoặc lỗi)
            setIsProcessing(false);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 p-4 sm:p-6 text-center animate-fade-in", children: _jsx("p", { className: "text-gray-600 text-base sm:text-lg font-medium", children: "\u0110ang t\u1EA3i t\u00F3m t\u1EAFt \u0111\u01A1n h\u00E0ng..." }) }));
    }
    const hasProducts = selectedProducts.length > 0;
    const displayedShippingFee = hasProducts ? shippingFee : 0;
    return (_jsxs("section", { className: "checkout-summary", children: [_jsx("h2", { children: "T\u00F3m t\u1EAFt \u0111\u01A1n h\u00E0ng" }), _jsxs("p", { className: "checkout-summary-count", children: [selectedProducts.length, " s\u1EA3n ph\u1EA9m trong \u0111\u01A1n h\u00E0ng"] }), _jsx("div", { className: "checkout-summary-products", children: selectedProducts.map((item, index) => {
                    const itemTotal = item.subtotal || ((item.salePrice ?? item.price ?? 0) + (item.variation?.additionalPrice || 0)) * (item.quantity || 1);
                    return _jsxs("p", { children: [_jsxs("span", { children: [item.name || `Sản phẩm ${index + 1}`, " \u00D7 ", item.quantity || 1] }), _jsxs("strong", { children: [itemTotal.toLocaleString("vi-VN"), "\u20AB"] })] }, item._id || index);
                }) }), _jsxs("div", { className: "checkout-summary-lines", children: [_jsxs("p", { children: [_jsx("span", { children: "T\u1EA1m t\u00EDnh" }), _jsxs("strong", { children: [selectedCartSubtotal.toLocaleString("vi-VN"), "\u20AB"] })] }), _jsxs("p", { children: [_jsx("span", { children: "Ph\u00ED n\u1EC1n t\u1EA3ng" }), _jsxs("strong", { children: [platformFee.toLocaleString("vi-VN"), "\u20AB"] })] }), _jsxs("p", { children: [_jsx("span", { children: "Ph\u00ED v\u1EADn chuy\u1EC3n" }), _jsxs("strong", { children: [displayedShippingFee.toLocaleString("vi-VN"), "\u20AB"] })] }), _jsxs("p", { children: [_jsx("span", { children: "Gi\u1EA3m gi\u00E1" }), _jsxs("strong", { children: ["-", discount.toLocaleString("vi-VN"), "\u20AB"] })] }), Boolean(shippingDiscount) && _jsxs("p", { children: [_jsx("span", { children: "\u01AFu \u0111\u00E3i v\u1EADn chuy\u1EC3n" }), _jsxs("strong", { children: ["-", (shippingDiscount || 0).toLocaleString("vi-VN"), "\u20AB"] })] })] }), _jsxs("div", { className: "checkout-summary-total", children: [_jsx("span", { children: "T\u1ED5ng c\u1ED9ng" }), _jsxs("strong", { children: [(hasProducts ? total : 0).toLocaleString("vi-VN"), "\u20AB"] }), _jsx("small", { children: hasProducts ? "Đã bao gồm các khoản phí áp dụng" : "Chọn sản phẩm trong giỏ hàng để tiếp tục" })] }), _jsxs("label", { className: "checkout-terms", children: [_jsx("input", { type: "checkbox", checked: acceptedTerms, onChange: (event) => setAcceptedTerms(event.target.checked) }), " ", _jsx("span", { children: "T\u00F4i \u0111\u1ED3ng \u00FD v\u1EDBi \u0110i\u1EC1u kho\u1EA3n s\u1EED d\u1EE5ng v\u00E0 Ch\u00EDnh s\u00E1ch mua h\u00E0ng c\u1EE7a MDUC247." })] }), _jsx("button", { type: "button", className: "checkout-place-order", onClick: handleCheckout, disabled: isProcessing || !acceptedTerms || !hasProducts, children: isProcessing ? "Đang xử lý..." : "Đặt hàng" }), _jsxs("p", { className: "checkout-summary-safe", children: [_jsx(ShieldCheck, {}), " Thanh to\u00E1n an to\u00E0n \u00B7 Xem l\u1EA1i tr\u01B0\u1EDBc khi x\u00E1c nh\u1EADn"] })] }));
};
export default OrderSummary;
