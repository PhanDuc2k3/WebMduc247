// services/chatHistoryService.js
const { redis } = require("../config/groqConfig");

// ====== Redis Chat History ======
async function saveChatHistory(userId, role, message) {
  if (!userId) return;
  const key = `chat:${userId}`;
  await redis.rpush(key, JSON.stringify({ role, message }));
  const length = await redis.llen(key);
  if (length > 15) await redis.lpop(key);
}

async function getChatHistory(userId) {
  if (!userId) return [];
  const key = `chat:${userId}`;
  const history = await redis.lrange(key, 0, -1);
  return history.map((msg) => JSON.parse(msg));
}

module.exports = {
  saveChatHistory,
  getChatHistory,
};

