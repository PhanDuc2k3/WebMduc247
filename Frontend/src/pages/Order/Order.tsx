import React from "react";
import OrderStatus from "../../components/Order/OrderStatus/OrderStatus";
import OrderProduct from "../../components/Order/OrderProduct/OrderProduct";
import PaymentInfo from "../../components/Order/PaymentInfo/PaymentInfo";
import CustomerInfo from "../../components/Order/CustomerInfo/CustomerInfo";
import ShippingInfo from "../../components/Order/ShippingInfo/ShippingInfo";
import OrderUpdate from "../../components/Order/OrderUpdate/OrderUpdate";

export default function OrderPage() {
  return (
<main className="min-h-screen bg-#F5F7FE ">
  <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] bg-white   ">
    {/* Left column */}
    <div className="space-y-6">
      <OrderStatus />
      <OrderProduct />
      <PaymentInfo />
    </div>

    {/* Right column */}
    <div className="space-y-6">
      <CustomerInfo />
      <ShippingInfo />
      <OrderUpdate />
    </div>
  </div>
</main>

  );
}