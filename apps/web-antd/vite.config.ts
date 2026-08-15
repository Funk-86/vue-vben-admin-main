import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      plugins: [basicSsl()],
      server: {
        // HTTPS + host:true → 局域网可用 https://10.36.98.96:5666（摄像头需安全上下文）
        host: true,
        port: 5666,
        strictPort: true,
        proxy: {
          '/api': {
            changeOrigin: true,
            target: 'http://127.0.0.1:8080',
            ws: true,
            configure: (proxy) => {
              proxy.on('proxyRes', (proxyRes, req) => {
                if (req.url?.includes('/notifications/stream')) {
                  proxyRes.headers['cache-control'] = 'no-cache';
                  proxyRes.headers['x-accel-buffering'] = 'no';
                }
              });
            },
          },
        },
      },
    },
  };
});
