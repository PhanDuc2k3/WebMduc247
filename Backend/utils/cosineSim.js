function cosineSim(a, b) {
  if (!a || !b || a.length === 0 || b.length === 0) return 0; // tránh NaN
  const len = Math.min(a.length, b.length); // đảm bảo cùng độ dài
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = cosineSim;
