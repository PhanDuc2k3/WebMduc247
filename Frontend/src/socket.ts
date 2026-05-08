import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5050";


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
