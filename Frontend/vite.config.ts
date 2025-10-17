import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
// @ts-ignore - no type declarations available for this package
import history from 'connect-history-api-fallback';

export default defineConfig({
  plugins: [
    react(),
    {
      // ✅ Fix lỗi reload trang 404 cho React Router
      name: 'single-page-app-fallback',
      configureServer(server) {
        server.middlewares.use(
          history({
            index: '/index.html',
            disableDotRule: true,
            htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
          })
        );
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    host: true,
  },
});
