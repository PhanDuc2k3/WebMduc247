import React, { useState, useEffect, useRef, type FormEvent } from "react";
import { MessageCircle, X, Bot } from "lucide-react";
import chatbotApi from "../../api/chatbotApi";
import { useChat } from "../../context/chatContext";

interface Message {
  role: "user" | "bot";
  message: string;
}

const ChatBot: React.FC = () => {
  const { currentUserId } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", message: "Xin chào! Mình có thể giúp gì cho bạn hôm nay?" },
  ]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatRef = useRef<HTMLDivElement | null>(null);

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
      const reply = res.data?.reply || "Xin lỗi, mình chưa hiểu ý bạn";
      setMessages((prev) => [...prev, { role: "bot", message: reply }]);
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
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-3 sm:p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 active:scale-95 group animate-fade-in"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-lg opacity-50 animate-pulse"></div>
          <MessageCircle size={24} className="sm:w-7 sm:h-7 relative z-10 transform group-hover:rotate-12 transition-transform duration-300" />
          <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] sm:text-xs font-bold animate-bounce">
            1
          </span>
        </button>
      )}

      {isOpen && (
        <div className="w-[calc(100vw-2rem)] sm:w-[400px] h-[calc(100vh-8rem)] sm:h-[600px] flex flex-col bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-2 border-gray-200 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white p-3 sm:p-5 flex items-center justify-between shadow-lg flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-white rounded-full blur opacity-30 animate-pulse"></div>
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Bot size={20} className="sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm sm:text-lg truncate">Chatbot hỗ trợ</span>
                <span className="text-[10px] sm:text-xs text-white/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0"></span>
                  <span className="truncate">Đang trực tuyến</span>
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-300 transform hover:rotate-90 flex-shrink-0 ml-2"
            >
              <X size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={chatRef}
            className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4 bg-gradient-to-br from-gray-50 via-white to-gray-50 custom-scrollbar min-h-0"
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start gap-1.5 sm:gap-2 max-w-[85%] sm:max-w-[80%]">
                  {msg.role === "bot" && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                      <Bot size={14} className="sm:w-4 sm:h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm shadow-md max-w-full break-words ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white ml-auto"
                        : "bg-white text-gray-900 border-2 border-gray-200"
                    }`}
                  >
                    <p className="leading-relaxed">{msg.message}</p>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-md">
                      <span className="text-white font-bold text-[10px] sm:text-xs">U</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start animate-fade-in-up">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Bot size={14} className="sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div className="flex gap-1 bg-white border-2 border-gray-200 rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-md">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-t-2 border-gray-200 bg-white flex-shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="flex-1 border-2 border-gray-300 rounded-full px-3 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-gray-50 hover:bg-white"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-3 sm:px-5 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-bold text-sm sm:text-base flex-shrink-0"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
