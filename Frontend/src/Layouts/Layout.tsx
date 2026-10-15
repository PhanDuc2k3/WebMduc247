import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Header from "./Header/Header";
import Footer from "./Footer/Footer";
import ChatWidget from "./Chatbot/ChatBot";
import { setGlobalNavigate } from "../context/chatContext";

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMessagesPage = location.pathname.startsWith("/messages");
  const isCheckoutPage = location.pathname === "/checkout";

  // Set global navigate helper để toast có thể navigate
  useEffect(() => {
    setGlobalNavigate(navigate);
  }, [navigate]);

  useEffect(() => {
    if (!isMessagesPage) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isMessagesPage]);

  return (
    <div
      className={`flex flex-col bg-[#f4f7fb] ${isMessagesPage ? "h-screen overflow-hidden" : "min-h-screen"} ${isCheckoutPage ? "checkout-layout-shell" : ""}`}
      onErrorCapture={(event) => {
        const image = event.target;
        if (image instanceof HTMLImageElement && !image.src.endsWith("/visual-placeholder.svg")) {
          image.src = "/visual-placeholder.svg";
        }
      }}
    >
      {/* Header sticky */}
      <div className="sticky top-0 z-[100] flex-none"><Header /></div>

      {/* Nội dung chính với container đồng đều */}
      <main className={`flex-1 w-full ${isMessagesPage ? "min-h-0 overflow-hidden" : ""}`}>
        <div className={`container-wrapper ${isMessagesPage ? "h-full overflow-hidden" : ""}`}>
          <Outlet />
        </div>
      </main>

      {!isMessagesPage && <Footer />}

      {/* Icon Chat Bot cố định góc phải */}
      <div className="fixed bottom-6 right-6 z-50 animate-fade-in delay-500"><ChatWidget /></div>
    </div>
  );
};

export default Layout;
