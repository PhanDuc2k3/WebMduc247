// scripts/testGemini.js
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testChat() {
  try {
    const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const res = await chatModel.generateContent({
      contents: [{ role: "user", parts: [{ text: "xin chào" }] }],
      generationConfig: { temperature: 0.5 }
    });
    console.log("✅ Chat response:", res.text);
  } catch (err) {
    console.error("❌ Chat failed:", err);
  }
}

testChat();
