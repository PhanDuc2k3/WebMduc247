import React, { useState } from "react";
import { Package } from "lucide-react"; 
import StoreRegisterForm from "../../components/StoreRegisterForm/StoreRegisterForm"; 

const MyStore: React.FC = () => {
  const hasStore = false;
  const [showForm, setShowForm] = useState(false);

  if (hasStore) {
    return <div>Thông tin cửa hàng của bạn...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      {!showForm ? (
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 rounded-full w-32 h-32 flex items-center justify-center">
              <Package size={64} className="text-gray-400" />
            </div>
          </div>

          <h2 className="font-bold text-2xl mb-2">Bạn chưa có cửa hàng</h2>
          <p className="text-gray-500 mb-6">
            Đăng ký mở cửa hàng để bắt đầu bán hàng
          </p>

          <button
            onClick={() => setShowForm(true)}
            className="bg-black text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 mx-auto hover:bg-gray-800 transition-colors"
          >
            <span className="text-xl">+</span> Đăng ký mở cửa hàng
          </button>
        </div>
      ) : (
        <StoreRegisterForm onClose={() => setShowForm(false)} />
      )}
    </div>
  );
};

export default MyStore;
