// services/aiService.js
const { groq, chatModelName } = require("../config/groqConfig");

class AIService {
  /**
   * Gọi Groq AI để tạo phản hồi
   * @param {string} systemPrompt - System prompt
   * @param {string} userPrompt - User prompt
   * @param {number} temperature - Temperature (0-1)
   * @param {number} maxTokens - Số token tối đa
   * @returns {Promise<string>} - Phản hồi từ AI
   */
  async generateReply(systemPrompt, userPrompt, temperature = 0.3, maxTokens = 300) {
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        model: chatModelName,
        temperature,
        max_tokens: maxTokens,
      });

      return chatCompletion.choices[0]?.message?.content || "Mình chưa hiểu ý bạn!";
    } catch (error) {
      console.error("Error calling Groq API:", error);
      throw error;
    }
  }

  /**
   * Tạo phản hồi cho tìm sản phẩm
   * @param {string} historyText - Lịch sử chat
   * @param {string} dataText - Dữ liệu sản phẩm
   * @param {string} userMessage - Câu hỏi của user
   * @param {Object} options - Các tùy chọn
   * @returns {Promise<string>} - Phản hồi từ AI
   */
  async generateProductReply(historyText, dataText, userMessage, options = {}) {
    const {
      isCountQuestion = false,
      totalCount = 0,
      brandCounts = [],
      topProductsLength = 0,
    } = options;

    let countInfoText = "";
    if (isCountQuestion && totalCount > 0) {
      countInfoText = `\n\n📊 THỐNG KÊ TỔNG QUAN:\n`;
      countInfoText += `Tổng số sản phẩm: ${totalCount}\n`;

      if (brandCounts.length > 0) {
        countInfoText += `\nSố lượng theo thương hiệu:\n`;
        brandCounts.forEach((item) => {
          countInfoText += `- ${item.brand}: ${item.count} sản phẩm\n`;
        });
      }
    }

    const countInstruction = isCountQuestion && totalCount > 0
      ? `\n⚠️ LƯU Ý QUAN TRỌNG: 
- Người dùng đang hỏi về SỐ LƯỢNG sản phẩm
- TỔNG SỐ LƯỢNG trong database: ${totalCount} sản phẩm
- Danh sách sản phẩm mẫu chỉ hiển thị ${topProductsLength} sản phẩm đầu tiên
- Bạn PHẢI trả lời về TỔNG SỐ LƯỢNG (${totalCount} sản phẩm) và liệt kê ĐẦY ĐỦ số lượng theo từng thương hiệu như đã cung cấp trong phần THỐNG KÊ TỔNG QUAN
- KHÔNG chỉ trả lời dựa trên danh sách mẫu ${topProductsLength} sản phẩm
- Ví dụ: "ShopMduc247 có tổng cộng ${totalCount} điện thoại: ${brandCounts.map((b) => `${b.count} ${b.brand}`).join(", ")}"
`
      : "";

    const prompt = `
Bạn là chatbot e-commerce thân thiện của ShopMduc247. 
Lịch sử trò chuyện:
${historyText || "(Không có tin nhắn trước đó)"}
${countInfoText}
Dữ liệu sản phẩm mẫu (hiển thị ${topProductsLength}/${totalCount > 0 ? totalCount : topProductsLength} sản phẩm):
${dataText || "Không có sản phẩm nào phù hợp."}

Người dùng hỏi: "${userMessage}"
${countInstruction}
Hãy trả lời ngắn gọn, thân thiện, tối đa 200 từ. ${isCountQuestion ? "Tập trung vào việc trả lời số lượng chính xác và đầy đủ theo từng thương hiệu." : "Tập trung vào gợi ý sản phẩm. Nhấn mạnh thông tin giá cả, đánh giá và cửa hàng."}
    `;

    const systemPrompt =
      "Bạn là chatbot hỗ trợ khách hàng của ShopMduc247. Trả lời ngắn gọn, thân thiện bằng tiếng Việt.";

    return await this.generateReply(systemPrompt, prompt, 0.2, 200);
  }

  /**
   * Tạo phản hồi cho tìm cửa hàng
   * @param {string} historyText - Lịch sử chat
   * @param {string} storesText - Dữ liệu cửa hàng
   * @param {string} userMessage - Câu hỏi của user
   * @returns {Promise<string>} - Phản hồi từ AI
   */
  async generateStoreReply(historyText, storesText, userMessage) {
    const prompt = `
Bạn là chatbot e-commerce thân thiện của ShopMduc247. 
Lịch sử trò chuyện:
${historyText || "(Không có tin nhắn trước đó)"}

Danh sách cửa hàng:
${storesText}

Người dùng hỏi: "${userMessage}"
Hãy giới thiệu các cửa hàng phù hợp một cách ngắn gọn, thân thiện.
    `;

    const systemPrompt =
      "Bạn là chatbot hỗ trợ khách hàng của ShopMduc247. Trả lời ngắn gọn, thân thiện bằng tiếng Việt.";

    return await this.generateReply(systemPrompt, prompt, 0.3, 300);
  }

  /**
   * Tạo phản hồi chat thông thường
   * @param {string} historyText - Lịch sử chat
   * @param {string} userMessage - Câu hỏi của user
   * @returns {Promise<string>} - Phản hồi từ AI
   */
  async generateChatReply(historyText, userMessage) {
    const prompt = `
Bạn là chatbot e-commerce thân thiện của ShopMduc247.
Lịch sử trò chuyện:
${historyText || "(Không có lịch sử trước đó)"}

Người dùng vừa nói: "${userMessage}"
Hãy phản hồi tự nhiên, ngắn gọn, thân thiện bằng tiếng Việt.
    `;

    const systemPrompt =
      "Bạn là chatbot hỗ trợ khách hàng của ShopMduc247, một trang thương mại điện tử. Trả lời thân thiện, ngắn gọn bằng tiếng Việt. Nếu khách hàng hỏi về sản phẩm, hãy hướng dẫn họ cách tìm kiếm.";

    return await this.generateReply(systemPrompt, prompt, 0.3, 300);
  }
}

module.exports = new AIService();

