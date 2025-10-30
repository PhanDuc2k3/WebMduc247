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
    <div className="fixed bottom-5 right-5 z-50">
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all"
        >
          <MessageCircle size={26} />
        </button>
      )}

      {isOpen && (
        <div className="w-96 h-[600px] flex flex-col bg-white shadow-2xl rounded-2xl border border-gray-300 animate-fadeIn">
          <div className="bg-blue-600 text-white p-4 rounded-t-2xl font-semibold text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={22} className="text-white" />
              <span>Chatbot hỗ trợ</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200"
            >
              <X size={22} />
            </button>
          </div>

          <div
            ref={chatRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
            style={{ maxHeight: "460px" }}
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-4 py-2 rounded-xl text-sm shadow-sm max-w-[80%] break-words ${
                    msg.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-900"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="text-gray-500 italic text-sm">Đang trả lời...</div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center p-3 border-t border-gray-200 bg-white rounded-b-2xl"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="submit"
              className="ml-3 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all"
            >
              Gửi
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
