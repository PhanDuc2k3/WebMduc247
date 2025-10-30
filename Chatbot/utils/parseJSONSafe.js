// utils/parseJSONSafe.js
function parseJSONSafe(value) {
  if (!value) return [];
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (err) {
      console.warn("JSON parse failed:", err.message);
      return [];
    }
  }
  return value;
}

module.exports = parseJSONSafe;
