import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { CartProvider } from "./context/CartContext.tsx";
import { ToastContainer } from "react-toastify"; // ✅ import thêm dòng này
import "react-toastify/dist/ReactToastify.css";  // ✅ import CSS cho toastify

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CartProvider>
      <App />
      {/* ✅ Thêm ToastContainer global tại đây */}
      <ToastContainer position="top-right" autoClose={2000} />
    </CartProvider>
  </StrictMode>
);
