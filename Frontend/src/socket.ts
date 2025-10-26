import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.MODE === "production"
    ? "https://yourdomain.com"
    : "http://localhost:5050";

let socket: Socket;

export const getSocket = () => {
  if (!socket) socket = io(SOCKET_URL, { autoConnect: false });
  return socket;
};
