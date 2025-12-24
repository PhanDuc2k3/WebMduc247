import { io, type Socket } from "socket.io-client";

// Luôn dùng localhost khi development
const SOCKET_URL =
  //"http://localhost:5050"
  import.meta.env.VITE_SOCKET_URL;


let socket: Socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ["websocket"],
    });
    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error);
    });
    socket.on("connect", () => {
      console.log("[Socket] Connected to:", SOCKET_URL);
    });
  }
  return socket;
};
