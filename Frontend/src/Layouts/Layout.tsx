import { Outlet } from "react-router-dom";
import Header from "./Header/Header";
import Footer from "./Footer/Footer";
import ChatWidget from "./Chatbot/ChatBot";

const Layout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header sticky */}
      <Header />

      {/* Nội dung chính với container đồng đều */}
      <main className="flex-1 w-full">
        <div className="container-wrapper">
          <Outlet />
        </div>
      </main>

      <Footer />

      {/* Icon Chat Bot cố định góc phải */}
      <div className="fixed bottom-6 right-6 z-50 animate-fade-in delay-500">
        <ChatWidget />
      </div>
    </div>
  );
};

export default Layout;