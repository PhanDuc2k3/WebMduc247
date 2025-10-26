import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
// @ts-ignore
import history from 'connect-history-api-fallback';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'single-page-app-fallback',
      configureServer(server) {
        // ✅ ép kiểu middleware thành 'any'
        server.middlewares.use(
          history({
            index: '/index.html',
            disableDotRule: true,
            htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
          }) as any
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
