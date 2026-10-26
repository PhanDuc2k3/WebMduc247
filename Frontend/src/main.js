import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/DesignSystem.css";
import "./components/ui/PublicPages.css";
import App from "./App";
import { CartProvider } from "./context/CartContext";
import { ChatProvider } from "./context/chatContext";
import { UserProvider } from "./Layouts/Header/useHeader";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter } from "react-router-dom";
import "./styles/UiConsistency.css";
createRoot(document.getElementById("root")).render(_jsx(StrictMode, { children: _jsxs(BrowserRouter, { children: [" ", _jsxs(UserProvider, { children: [" ", _jsx(ChatProvider, { children: _jsxs(CartProvider, { children: [_jsx(App, {}), _jsx(ToastContainer, { position: "top-right", autoClose: 3000, hideProgressBar: false, newestOnTop: true, closeOnClick: true, rtl: false, pauseOnFocusLoss: true, draggable: true, pauseOnHover: true, theme: "light", style: {
                                        top: '20px',
                                        right: '20px',
                                        zIndex: 9999
                                    }, toastClassName: "custom-toast-general", containerId: "general-toast" }), _jsx(ToastContainer, { position: "bottom-right", autoClose: 4000, hideProgressBar: false, newestOnTop: true, closeOnClick: true, rtl: false, pauseOnFocusLoss: true, draggable: true, pauseOnHover: true, theme: "light", style: {
                                        bottom: '20px',
                                        right: '20px',
                                        zIndex: 9999
                                    }, toastClassName: "custom-toast-message", containerId: "message-toast" })] }) })] })] }) }));
