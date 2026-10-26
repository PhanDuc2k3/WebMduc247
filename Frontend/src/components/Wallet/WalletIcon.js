import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import walletApi from '../../api/walletApi';
const WalletIcon = () => {
    const [balance, setBalance] = useState(0);
    useEffect(() => {
        // Kiểm tra token trước khi fetch
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }
        const fetchWallet = async () => {
            try {
                const res = await walletApi.getWallet();
                setBalance(res.data.wallet.balance);
            }
            catch (err) {
                const requestError = err;
                // Chỉ log lỗi nếu không phải do chưa đăng nhập hoặc network
                if (requestError.response?.status !== 401 && requestError.code !== 'ERR_NETWORK') {
                    console.error('Lỗi lấy ví:', err);
                }
                // Nếu lỗi 401 (unauthorized) hoặc network, set balance = 0
                if (requestError.response?.status === 401 || requestError.code === 'ERR_NETWORK') {
                    setBalance(0);
                }
            }
        };
        fetchWallet();
        // Refresh balance mỗi 5 giây (chỉ khi đã đăng nhập)
        const interval = setInterval(() => {
            const currentToken = localStorage.getItem('token');
            if (currentToken) {
                fetchWallet();
            }
        }, 5000);
        return () => clearInterval(interval);
    }, []);
    return (_jsxs(Link, { to: "/wallet", className: "canva-header__icon-button canva-header__wallet-button", title: `Ví: ${balance.toLocaleString('vi-VN')}₫`, "aria-label": `Ví của tôi, số dư ${balance.toLocaleString('vi-VN')} đồng`, children: [_jsx(Wallet, {}), _jsxs("div", { className: "canva-header__wallet-balance", children: ["V\u00ED: ", balance.toLocaleString('vi-VN'), "\u20AB"] })] }));
};
export default WalletIcon;
