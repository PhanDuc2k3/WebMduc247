import React, { useState, useEffect, useRef, type FormEvent } from "react";
import { MessageCircle, X, Bot, ExternalLink, Package, Send, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import chatbotApi from "../../api/chatbotApi";
import { useChat } from "../../context/chatContext";

interface Product {
  _id: string;
  name: string;
  price?: number;
  salePrice?: number;
  images?: string[];
  rating?: number;
  reviewsCount?: number;
  soldCount?: number;
  brand?: string;
  store?: {
    name: string;
    logoUrl?: string;
  } | null;
}

interface Message {
  role: "user" | "bot";
  message: string;
  products?: Product[];
}

const ChatBot: React.FC = () => {
  const { currentUserId } = useChat();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", message: "Xin chào! Mình có thể giúp gì cho bạn hôm nay?" },
  ]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatRef = useRef<HTMLDivElement | null>(null);

  // Helper function để lấy URL ảnh
  const getImageUrl = (img?: string) => {
    if (!img) return "/no-image.png";
    return img.startsWith("http") ? img : `${import.meta.env.VITE_API_URL}${img}`;
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = { role: "user", message: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);

    const userIdToSend = currentUserId ?? undefined;

    try {
      const res = await chatbotApi.sendMessage({ message: input, userId: userIdToSend });
      
      // Debug: log toàn bộ response
      console.log("=== FRONTEND RECEIVED ===");
      console.log("Full response:", res);
      console.log("Response data:", res.data);
      console.log("Response data keys:", res.data ? Object.keys(res.data) : "no data");
      console.log("Has reply:", !!res.data?.reply);
      console.log("Has products:", !!res.data?.products);
      console.log("Products type:", typeof res.data?.products);
      console.log("Products is array:", Array.isArray(res.data?.products));
      console.log("Products value:", res.data?.products);
      
      const reply = res.data?.reply || "Xin lỗi, mình chưa hiểu ý bạn";
      
      // Lấy products từ response
      let products = res.data?.products;
      
      // Kiểm tra và xử lý products
      if (!products) {
        console.warn("⚠️ Products is missing in response!");
        products = [];
      } else if (!Array.isArray(products)) {
        console.warn("⚠️ Products is not an array:", typeof products, products);
        products = [];
      } else {
        // Kiểm tra nếu products là array of strings (tên sản phẩm) - có bug ở backend
        if (products.length > 0 && typeof products[0] === 'string') {
          console.error("❌ ERROR: Products are strings, not objects! This is a backend bug.");
          console.log("String products received:", products);
          // Không thể hiển thị cards với strings, chỉ hiển thị text
          products = [];
        } else {
          // Filter products có _id (products là objects)
          products = products.filter((p: Product) => {
            // Kiểm tra nếu p là object và có _id
            const isValid = p && typeof p === 'object' && p._id;
            if (!isValid) {
              console.warn("Product without _id or invalid:", p);
            }
            return isValid;
          });
        }
      }
      
      // Debug: log products sau khi filter
      console.log("Products after filter:", products);
      console.log("Products length:", products.length);
      if (products.length > 0) {
        console.log("First product:", products[0]);
      }
      
      setMessages((prev) => [...prev, { role: "bot", message: reply, products: products }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", message: "Đã có lỗi xảy ra. Vui lòng thử lại sau" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 md:bottom-6 md:right-6 z-50">
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-[#2F5FEB] hover:bg-[#244ACC] text-white p-2.5 sm:p-3 md:p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 active:scale-95 group animate-fade-in touch-manipulation"
          aria-label="Mở chatbot hỗ trợ"
        >
          <MessageCircle size={20} className="sm:w-6 sm:h-6 md:w-7 md:h-7 relative z-10 transform group-hover:rotate-12 transition-transform duration-300" />
          <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] sm:text-[10px] md:text-xs font-bold animate-bounce">
            1
          </span>
        </button>
      )}

      {isOpen && (
        <div className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] md:w-[400px] lg:w-[420px] h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] md:h-[600px] lg:h-[650px] flex flex-col bg-white shadow-2xl rounded-xl sm:rounded-2xl md:rounded-3xl border-2 border-gray-200 overflow-hidden animate-scale-in max-w-[calc(100vw-1rem)] sm:max-w-none">
          {/* Header */}
          <div className="bg-[#2F5FEB] text-white p-2.5 sm:p-3 md:p-4 lg:p-5 flex items-center justify-between shadow-lg flex-shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Bot size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-xs sm:text-sm md:text-base lg:text-lg truncate">Chatbot hỗ trợ</span>
                <span className="text-[9px] sm:text-[10px] md:text-xs text-white/80 flex items-center gap-1">
                  <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0"></span>
                  <span className="truncate">Đang trực tuyến</span>
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition-all duration-300 transform hover:rotate-90 active:scale-95 flex-shrink-0 ml-1.5 sm:ml-2 touch-manipulation"
              aria-label="Đóng chatbot"
            >
              <X size={14} className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px]" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={chatRef}
            className="flex-1 overflow-y-auto p-2 sm:p-2.5 md:p-3 lg:p-4 xl:p-5 space-y-2 sm:space-y-2.5 md:space-y-3 lg:space-y-4 bg-gradient-to-br from-gray-50 via-white to-gray-50 custom-scrollbar min-h-0"
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className={`flex items-start gap-1 sm:gap-1.5 md:gap-2 ${msg.role === "bot" && msg.products && Array.isArray(msg.products) && msg.products.length > 0 ? "w-full max-w-full" : "max-w-[90%] sm:max-w-[85%] md:max-w-[80%]"}`}>
                  {msg.role === "bot" && (
                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                      <Bot size={12} className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3 rounded-lg sm:rounded-xl md:rounded-2xl text-[11px] sm:text-xs md:text-sm shadow-md ${msg.role === "bot" && msg.products && Array.isArray(msg.products) && msg.products.length > 0 ? "w-full" : "max-w-full"} break-words ${
                      msg.role === "user"
                        ? "bg-[#2F5FEB] text-white ml-auto"
                        : "bg-white text-gray-900 border-2 border-gray-200"
                    }`}
                  >
                    <p className="leading-relaxed">{msg.message}</p>
                    
                    {/* Hiển thị products dưới dạng cards */}
                    {msg.role === "bot" && Array.isArray(msg.products) && msg.products.length > 0 && (
                      <div className="mt-2 sm:mt-2.5 md:mt-3 pt-2 sm:pt-2.5 md:pt-3 border-t border-gray-200">
                        <div className="text-[10px] sm:text-xs font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1">
                          <Package className="w-3 h-3 text-[#2F5FEB]" />
                          <span>Sản phẩm gợi ý ({msg.products.length})</span>
                        </div>
                        <div className="flex flex-col gap-1.5 sm:gap-2 max-h-[250px] sm:max-h-[300px] md:max-h-[350px] lg:max-h-[400px] overflow-y-auto custom-scrollbar pr-0.5 sm:pr-1">
                          {msg.products.map((product, productIndex) => {
                            // Debug log từng product
                            if (productIndex === 0) {
                              console.log("Rendering product card:", product);
                              console.log("Product rating:", product.rating);
                              console.log("Product reviewsCount:", product.reviewsCount);
                            }
                            return (
                            <div
                              key={product._id || `product-${productIndex}`}
                              className="bg-gray-50 border border-gray-200 rounded-lg p-1.5 sm:p-2 hover:border-blue-400 hover:shadow-md active:shadow-lg transition-all duration-300 group touch-manipulation"
                            >
                              <div className="flex gap-1.5 sm:gap-2">
                                {/* Ảnh sản phẩm */}
                                <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 flex-shrink-0 rounded-md overflow-hidden bg-gray-200">
                                  <img
                                    src={getImageUrl(product.images?.[0])}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                  {product.salePrice && product.price && (
                                    <span className="absolute top-0 left-0 bg-red-500 text-white text-[7px] sm:text-[8px] px-0.5 sm:px-1 py-0.5 rounded-br-md font-bold">
                                      -{Math.round((1 - product.salePrice / product.price) * 100)}%
                                    </span>
                                  )}
                                </div>
                                
                                {/* Thông tin sản phẩm */}
                                <div className="flex-1 min-w-0 flex flex-col">
                                  <h4 className="text-[10px] sm:text-[11px] md:text-xs font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">
                                    {product.name}
                                  </h4>
                                  
                                  {/* Giá */}
                                  <div className="mt-0.5 sm:mt-1 flex items-center gap-1 flex-wrap">
                                    <span className="text-[9px] sm:text-[10px] md:text-xs text-red-600 font-bold">
                                      {(product.salePrice ?? product.price ?? 0).toLocaleString("vi-VN")}₫
                                    </span>
                                    {product.salePrice && product.price && (
                                      <span className="text-gray-400 line-through text-[8px] sm:text-[9px]">
                                        {(product.price || 0).toLocaleString("vi-VN")}₫
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Rating và sold */}
                                  <div className="mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[9px] text-gray-600">
                                    <span className="flex items-center gap-0.5">
                                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                      <span className="whitespace-nowrap">{product.rating?.toFixed(1) || "0"}</span>
                                      <span className="whitespace-nowrap">({product.reviewsCount ?? 0})</span>
                                    </span>
                                    <span>•</span>
                                    <span className="whitespace-nowrap">Đã bán {product.soldCount || 0}</span>
                                  </div>
                                  
                                  {/* Nút Xem ngay */}
                                  {product._id ? (
                                    <button
                                      onClick={() => {
                                        navigate(`/products/${product._id}`);
                                        setIsOpen(false);
                                      }}
                                      className="mt-1.5 sm:mt-2 w-full bg-[#2F5FEB] hover:bg-[#244ACC] text-white text-[9px] sm:text-[10px] md:text-xs font-bold px-1.5 sm:px-2 py-1 rounded-md transition-all duration-300 flex items-center justify-center gap-1 group-hover:shadow-lg active:scale-95 touch-manipulation"
                                    >
                                      <span>Xem ngay</span>
                                      <ExternalLink size={10} className="sm:w-3 sm:h-3" />
                                    </button>
                                  ) : (
                                    <div className="mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-gray-400 text-center">
                                      Không có thông tin sản phẩm
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-md">
                      <span className="text-white font-bold text-[10px] sm:text-xs">U</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start animate-fade-in-up">
                <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Bot size={12} className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
                  </div>
                  <div className="flex gap-0.5 sm:gap-1 bg-white border-2 border-gray-200 rounded-lg sm:rounded-xl md:rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3 shadow-md">
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-1.5 sm:gap-2 md:gap-3 p-2 sm:p-2.5 md:p-3 lg:p-4 border-t-2 border-gray-200 bg-white flex-shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="flex-1 border-2 border-gray-300 rounded-full px-2.5 sm:px-3 md:px-4 lg:px-5 py-1.5 sm:py-2 md:py-2.5 lg:py-3 text-[11px] sm:text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5FEB] focus:border-[#2F5FEB] transition-all duration-300 bg-gray-50 hover:bg-white touch-manipulation"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-2.5 sm:px-3 md:px-4 lg:px-5 py-1.5 sm:py-2 md:py-2.5 lg:py-3 bg-[#2F5FEB] text-white rounded-full hover:bg-[#244ACC] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-bold text-xs sm:text-sm md:text-base flex-shrink-0 touch-manipulation"
              aria-label="Gửi tin nhắn"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
