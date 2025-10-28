import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import history from "connect-history-api-fallback";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "single-page-app-fallback",
      configureServer(server) {
        server.middlewares.use(
          history({
            index: "/index.html",
            disableDotRule: true,
            htmlAcceptHeaders: ["text/html", "application/xhtml+xml"],
          }) as any
        );
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
    host: true,
    // ❌ bỏ proxy /socket.io
  },
});
