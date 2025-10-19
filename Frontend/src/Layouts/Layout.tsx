import { Outlet } from "react-router-dom";
import Header from "./Header/Header";
import Footer from "./Footer/Footer";

const Layout = () => {
  const HEADER_HEIGHT = 160; // tổng chiều cao header (tùy chỉnh nếu header cao hơn)

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header cố định */}
      <div className="fixed top-0 left-0 w-full z-50">
        <Header />
      </div>

      {/* Nội dung chính, đẩy xuống dưới header */}
      <main className="flex-1 pt-[160px] px-[15%] bg-white">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default Layout;
