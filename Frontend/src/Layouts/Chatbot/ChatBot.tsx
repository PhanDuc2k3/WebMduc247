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
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="relative w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 active:scale-95 group animate-fade-in"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-lg opacity-50 animate-pulse"></div>
          <MessageCircle size={28} className="relative z-10 transform group-hover:rotate-12 transition-transform duration-300" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold animate-bounce">
            1
          </span>
        </button>
      )}

      {isOpen && (
        <div className="w-[400px] h-[600px] flex flex-col bg-white shadow-2xl rounded-3xl border-2 border-gray-200 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white p-5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-white rounded-full blur opacity-30 animate-pulse"></div>
                <div className="relative w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Bot size={24} className="text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg">Chatbot hỗ trợ</span>
                <span className="text-xs text-white/80 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Đang trực tuyến
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-300 transform hover:rotate-90"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={chatRef}
            className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-br from-gray-50 via-white to-gray-50 custom-scrollbar"
            style={{ maxHeight: "460px" }}
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start gap-2 max-w-[85%]">
                  {msg.role === "bot" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                      <Bot size={16} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm shadow-md max-w-full break-words ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white ml-auto"
                        : "bg-white text-gray-900 border-2 border-gray-200"
                    }`}
                  >
                    <p className="leading-relaxed">{msg.message}</p>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-md">
                      <span className="text-white font-bold text-xs">U</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start animate-fade-in-up">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="flex gap-1 bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 shadow-md">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 p-4 border-t-2 border-gray-200 bg-white"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="flex-1 border-2 border-gray-300 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-gray-50 hover:bg-white"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-5 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-bold"
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
