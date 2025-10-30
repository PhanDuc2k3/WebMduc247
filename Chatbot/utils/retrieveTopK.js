const VectorStore = require("../models/VectorStore");
const cosineSim = require("./cosineSim");

async function retrieveTopK(queryVector, type = null, k = 5) {
  if (!queryVector || queryVector.length === 0) return [];
  
  // Lấy tất cả vector từ DB
  let docs = await VectorStore.find(type ? { type } : {});

  docs = docs.map(d => ({
    ...d._doc,
    score: cosineSim(queryVector, d.vector || []) // tránh undefined
  }));

  // Sort theo score giảm dần
  const topK = docs.sort((a, b) => b.score - a.score).slice(0, k);

  topK.forEach((d, i) => {
    console.log(`[DEBUG] Top ${i+1}: ${d.metadata?.name || d.name}, score=${d.score.toFixed(4)}`);
  });

  return topK;
}

module.exports = retrieveTopK;
