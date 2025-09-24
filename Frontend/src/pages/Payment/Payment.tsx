import React, { useState } from "react";
import Address from "../../components/Payment/Adress/Address";
import Product from "../../components/Payment/Product/Product";
import Delivery from "../../components/Payment/Delivery/Delivery";
import Payment from "../../components/Payment/Payment/Payment";
import OrderSummary from "../../components/Payment/OrderSummary/OrderSummary";

const CheckoutPage = () => {
  const [shippingFee, setShippingFee] = useState(30000); // mặc định standard

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow-lg rounded-lg font-sans text-gray-800">
      {/* Tiêu đề bên trái */}
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Thanh toán
      </h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Cột trái */}
        <div className="flex-1 space-y-6">
          <Address />
          <Product />
          <Delivery onChange={setShippingFee} />
        </div>

        {/* Cột phải */}
        <div className="w-full lg:w-1/3 space-y-6">
          <Payment />
          <OrderSummary shippingFee={shippingFee} />
          <div className="text-center"></div>
          <p className="text-xs text-gray-500 text-center">
            Thông tin thanh toán được bảo mật. Chúng tôi cam kết bảo vệ quyền
            riêng tư của bạn.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
