// backend/server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
app.use(cors({
  origin: [
  'https://shopmduc247.online',
  'http://localhost:5173',
  'https://webmduc247.onrender.com',
  'https://web-mduc247.vercel.app',
  'https://webmduc247-websocket.onrender.com',
  ],
  credentials: true,
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
  'https://shopmduc247.online',
  'http://localhost:5173',
  'https://webmduc247.onrender.com',
  'https://web-mduc247.vercel.app',
  'https://webmduc247-websocket.onrender.com',
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  allowEIO3: true,
});

// --- Import và inject io
const cartSocketRouter = require("./websocket/cartSocket");
cartSocketRouter.setIo(io);
app.use("/api/cart-socket", cartSocketRouter);

// --- Chat socket (nếu có)
const chatSocketApp = require("./websocket/chatSocket")(io);
// Mount chat socket app vào route /api/socket để có endpoint /api/socket/emit
if (chatSocketApp) {
  app.use("/api/socket", chatSocketApp);
}

// --- Socket connection logging
io.on("connection", (socket) => {
  console.log("⚡ Socket connected:", socket.id);
  socket.on("disconnect", () => console.log("❌ Socket disconnected:", socket.id));
});

// Parse PORT từ environment variable, đảm bảo là số
const PORT = parseInt(process.env.WS_PORT) || 5050;

// Validate PORT là số hợp lệ
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error('❌ Invalid PORT:', process.env.WS_PORT);
  console.error('Using default port 5050');
  const defaultPort = 5050;
  server.listen(defaultPort, () => console.log(`WebSocket service running on port ${defaultPort}`));
} else {
  server.listen(PORT, () => console.log(`WebSocket service running on port ${PORT}`));
}
