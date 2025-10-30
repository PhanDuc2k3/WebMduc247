import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

import { CartProvider } from "./context/CartContext";
import { ChatProvider } from "./context/chatContext";
import { UserProvider } from "./Layouts/Header/useHeader";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { BrowserRouter } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter> {/* ← Router duy nhất */}
      <UserProvider> {/* dùng useNavigate() thoải mái */}
        <ChatProvider>
          <CartProvider>
            <App />
            <ToastContainer position="top-right" autoClose={2000} />
          </CartProvider>
        </ChatProvider>
      </UserProvider>
    </BrowserRouter>
  </StrictMode>
);
