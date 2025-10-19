// websocket/server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");

dotenv.config();

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

app.get("/", (req, res) => res.send("WebSocket service running 🚀"));

// --- Tạo server http
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
});

// --- Import chatSocket, trả về express app mount backend route
const chatSocketApp = require("./websocket/chatSocket")(io);
app.use("/api/socket", chatSocketApp); // => route /api/socket/emit

const PORT = process.env.WS_PORT || 5050;
server.listen(PORT, () => console.log(`⚡ WebSocket running on port ${PORT}`));
