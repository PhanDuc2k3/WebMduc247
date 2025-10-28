import { io, type Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:5050";

let socket: Socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ["websocket"],
    });
    socket.on("connect_error", () => {});
  }
  return socket;
};
