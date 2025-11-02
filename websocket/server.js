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
    "http://localhost:5173",
    "https://webmduc247.onrender.com",
    "https://web-mduc247.vercel.app",
    "https://webmduc247-websocket.onrender.com",
  ],
  credentials: true,
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://webmduc247.onrender.com",
      "https://web-mduc247.vercel.app",
      "https://webmduc247-websocket.onrender.com"
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
require("./websocket/chatSocket")(io);

// --- Socket connection logging
io.on("connection", (socket) => {
  console.log("⚡ Socket connected:", socket.id);
  socket.on("disconnect", () => console.log("❌ Socket disconnected:", socket.id));
});

const PORT = process.env.WS_PORT || 5050;
server.listen(PORT, () => console.log(`WebSocket service running on port ${PORT}`));
