import { Outlet } from "react-router-dom";
import Header from "./Header/Header";
import Footer from "./Footer/Footer";
import ChatWidget from "./Chatbot/ChatBot"; // component chat bạn đã tạo

const Layout = () => {
  const HEADER_HEIGHT = 160;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header cố định */}
      <div className="fixed top-0 left-0 w-full z-50">
        <Header />
      </div>

      {/* Nội dung chính */}
      <main className="flex-1 pt-[160px] px-[15%] bg-white">
        <Outlet />
      </main>

      <Footer />

      {/* Icon Chat Bot cố định góc phải */}
      <div className="fixed bottom-6 right-6 z-50">
        <ChatWidget />
      </div>
    </div>
  );
};

export default Layout;