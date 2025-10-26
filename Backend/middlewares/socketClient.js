// middlewares/socketClient.js
const { io } = require("socket.io-client");

const socket = io(process.env.WS_URL ||"http://localhost:5050", {
  transports: ["websocket"],
  reconnection: true,
});

socket.on("connect", () => {
  console.log(" Connected to WebSocket service from backend");
});

socket.on("disconnect", () => {
  console.log(" Disconnected from WebSocket service");
});

module.exports = socket;