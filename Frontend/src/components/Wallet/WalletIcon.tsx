import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import walletApi from '../../api/walletApi';

const WalletIcon: React.FC = () => {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Kiểm tra token trước khi fetch
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchWallet = async () => {
      try {
        const res = await walletApi.getWallet();
        setBalance(res.data.wallet.balance);
      } catch (err: any) {
        // Chỉ log lỗi nếu không phải do chưa đăng nhập hoặc network
        if (err.response?.status !== 401 && err.code !== 'ERR_NETWORK') {
          console.error('Lỗi lấy ví:', err);
        }
        // Nếu lỗi 401 (unauthorized) hoặc network, set balance = 0
        if (err.response?.status === 401 || err.code === 'ERR_NETWORK') {
          setBalance(0);
        }
      } finally {
        setLoading(false);
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

  if (loading) {
    return null;
  }

  return (
    <Link 
      to="/wallet" 
      className="flex items-center gap-1 hover:text-purple-600 transition-all duration-300 group relative"
      title={`Ví: ${balance.toLocaleString('vi-VN')}₫`}
    >
      <div className="relative">
        <Wallet size={14} className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] group-hover:scale-125 transition-transform" />
      </div>
      <span className="hidden xl:inline text-xs sm:text-sm font-bold">
        Ví: {balance.toLocaleString('vi-VN')}₫
      </span>
    </Link>
  );
};

export default WalletIcon;
