import { io } from "socket.io-client";
import { USE_MOCK_DATA } from "./config/runtime";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5050";
let socket;
const createMockSocket = () => {
    const handlers = new Map();
    const mock = {
        id: "mock-socket",
        connected: true,
        connect() { this.connected = true; queueMicrotask(() => handlers.get("connect")?.forEach((handler) => handler())); return this; },
        disconnect() { this.connected = false; handlers.get("disconnect")?.forEach((handler) => handler()); return this; },
        emit(event, ...args) { handlers.get(event)?.forEach((handler) => handler(...args)); return this; },
        on(event, handler) { if (!handlers.has(event))
            handlers.set(event, new Set()); handlers.get(event)?.add(handler); if (event === "connect")
            queueMicrotask(() => handler()); return this; },
        once(event, handler) { const wrapped = (...args) => { handler(...args); handlers.get(event)?.delete(wrapped); }; return this.on(event, wrapped); },
        off(event, handler) { if (handler)
            handlers.get(event)?.delete(handler);
        else
            handlers.delete(event); return this; },
    };
    return mock;
};
export const getSocket = () => {
    if (!socket) {
        if (USE_MOCK_DATA) {
            socket = createMockSocket();
            return socket;
        }
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
